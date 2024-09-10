import {
    Injectable,
    HttpException,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common'
import { Queue } from 'bullmq'
import { Response } from 'express'
import { Mutex } from 'async-mutex'
import { Utils } from 'helpers/utils'
import { TimeToMilli } from 'enums/base'
import {
    CreatePushNotificationEvent,
    CreateInAppNotificationEvent,
} from 'src/notification/notification.event'
import { InjectQueue } from '@nestjs/bullmq'
import { StatusCodes } from 'enums/statusCodes'
import { ValidateBankDTO } from './dto/bank.dto'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { PrismaService } from 'prisma/prisma.service'
import { StoreService } from 'src/store/store.service'
import { ResponseService } from 'libs/response.service'
import { RequestWidrawalDTO, FundWalletDTO } from './dto/tx.dto'
import { PaystackService } from 'libs/Paystack/paystack.service'
import { TransferStatus, WithdrwalRequest } from '@prisma/client'

@Injectable()
export class WalletService {
    constructor(
        private readonly store: StoreService,
        private readonly event: EventEmitter2,
        private readonly prisma: PrismaService,
        private readonly response: ResponseService,
        private readonly paystack: PaystackService,
        @InjectQueue('transfer-queue') private transferQueue: Queue,
        @InjectQueue('charge.sucsess-queue') private chargeSucessQueue: Queue,
    ) { }

    async bankAccountVerification({ account_number, bank_code }: ValidateBankDTO) {
        const { data } = await this.paystack.resolveAccount(account_number, bank_code)
        return data
    }

    async fetchBanks() {
        const { data: banks } = await this.paystack.listBanks()

        return banks
    }

    async fetchBankByBankCode(bankCode: string) {
        const bank = await this.paystack.getBankByBankCode(bankCode)

        if (!bank) {
            throw new NotFoundException("No supported Bank Name is associated with this bank code.")
        }

        return bank
    }

    async requestWithdrawal(
        res: Response,
        { sub: userId }: JwtDecoded,
        { amount, account_number, bank_code }: RequestWidrawalDTO
    ) {
        let userMutex = await this.store.get<Mutex>(`request-withdrawal_${userId}`)

        if (!userMutex) {
            userMutex = new Mutex()
            await this.store.set(`request-withdrawal_${userId}`, userMutex)
        }

        const release = await userMutex.acquire()

        if (amount < 100) {
            throw new BadRequestException("Minimum withdrawal amount is ₦100.00")
        }

        const wallet = await this.prisma.getUserWallet(userId)

        if (wallet.locked) {
            throw new ConflictException("Try again later..")
        }

        if (wallet.balance.toNumber() < amount) {
            return this.response.sendError(res, StatusCodes.UnprocessableEntity, "Insufficient balance")
        }

        const { data: destination } = await this.paystack.resolveAccount(account_number, bank_code)
        const bank = await this.paystack.getBankByBankCode(bank_code)

        let eligible = false

        if (!wallet.lastApprovedAt) {
            eligible = true
        } else {
            const now = Date.now()
            const lastApprovedAt = new Date(wallet.lastApprovedAt).getTime()

            if (now - lastApprovedAt >= TimeToMilli.TwoWeeks) {
                eligible = true
            }
        }

        if (!eligible) {
            throw new BadRequestException("You're not yet eligible to request for a withdrawal")
        }

        await this.prisma.wallet.update({
            where: { id: wallet.id },
            data: { locked: true },
        })

        try {
            const [withdrawalRequest] = await this.prisma.$transaction([
                this.prisma.withdrwalRequest.create({
                    data: {
                        amount,
                        status: 'PENDING',
                        destinationBankCode: bank.code,
                        destinationBankName: bank.name,
                        destinationAccountName: destination.account_name,
                        destinationAccountNumber: destination.account_number,
                        wallet: { connect: { id: wallet.id } },
                    },
                }),
                this.prisma.wallet.update({
                    where: { id: wallet.id },
                    data: {
                        lastRequestedAt: new Date(),
                        balance: { decrement: amount },
                    },
                }),
            ])

            Utils.sanitizeData<WithdrwalRequest>(withdrawalRequest, ['locked'])

            return {
                message: "Withdrawal request has been sent to the Admin in charge",
                data: withdrawalRequest,
            }
        } catch (err) {
            console.error(err)
            throw err
        } finally {
            release()
            await this.prisma.wallet.update({
                where: { userId },
                data: { locked: false },
            })
            await this.store.delete(`request-withdrawal_${userId}`)
        }
    }

    async fundWallet({ sub }: JwtDecoded, { reference }: FundWalletDTO) {
        let userMutex = await this.store.get<Mutex>(`fund-wallet_${sub}`) ?? new Mutex()

        const release = await userMutex.acquire()

        const user = await this.prisma.user.findUnique({
            where: { id: sub }
        })

        const verifyTx = await this.paystack.verifyTransaction(reference)
        if (!verifyTx.status || verifyTx?.data?.status !== "success") {
            throw new HttpException('Payment is required', StatusCodes.PaymentIsRequired)
        }

        const { data } = verifyTx
        const amount = data.amount / 100
        const authorization = data?.authorization

        try {
            const [tx] = await this.prisma.$transaction([
                this.prisma.txHistory.create({
                    data: {
                        type: 'DEPOSIT',
                        ip: data?.ip_address,
                        authorization, amount,
                        reference: `deposit-${reference}`,
                        user: { connect: { id: sub } },
                        status: Utils.toUpperCase(data.status) as TransferStatus,
                    },
                }),
                this.prisma.wallet.update({
                    where: { userId: sub },
                    data: {
                        lastDepositedAt: new Date(),
                        lastDepositedAmount: amount,
                        balance: { increment: amount },
                    },
                }),
            ])

            this.event.emit(
                'notification.in-app',
                new CreateInAppNotificationEvent({
                    userId: sub,
                    topic: 'TRANSACTIONS',
                    title: 'Wallet Funded',
                    body: `You've been credited with ₦${amount.toFixed(2)} - ${tx.reference}`
                })
            )

            this.event.emit(
                'notification.push',
                new CreatePushNotificationEvent({
                    userId: sub,
                    title: 'Wallet Funded',
                    body: `You've been credited with ₦${amount.toFixed(2)}`
                })
            )

            return Utils.removeNullFields(tx)
        } catch (err) {
            console.error(err)
            throw err
        } finally {
            release()
            await this.store.delete(`fund-wallet_${sub}`)
        }
    }

    async manageWebhookEvents(body: TransferEvent | ChargeSuccessEvent) {
        switch (body.event) {
            case 'charge.success':
                await this.chargeSucessQueue.add('charge.sucsess-queue', body.data)
                break

            case 'transfer.success':
                await this.transferQueue.add('transfer.success', body.data)
                break

            case 'transfer.failed':
                await this.transferQueue.add('transfer.failed', body.data)
                break

            case 'transfer.reversed':
                await this.transferQueue.add('transfer.reversed', body.data)
                break

            default:
                throw new HttpException("Unsupported Event", StatusCodes.InternalServerError)
        }
    }
}
