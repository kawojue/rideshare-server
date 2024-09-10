import {
    Injectable,
    HttpException,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common'
import { Mutex } from 'async-mutex'
import { Utils } from 'helpers/utils'
import { TimeToMilli } from 'enums/base'
import {
    CreatePushNotificationEvent,
    CreateEmailNotificationEvent,
    CreateInAppNotificationEvent,
} from 'src/notification/notification.event'
import { Request, Response } from 'express'
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
            this.store.set(`request-withdrawal_${userId}`, userMutex)
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
        let userMutex = await this.store.get<Mutex>(`fund-wallet_${sub}`)

        if (!userMutex) {
            userMutex = new Mutex()
            this.store.set(`fund-wallet_${sub}`, userMutex)
        }

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
        const channel = data?.authorization?.channel
        const authorization_code = data?.authorization?.authorization_code

        try {
            const [tx] = await this.prisma.$transaction([
                this.prisma.txHistory.create({
                    data: {
                        amount: amount,
                        channel: channel,
                        type: 'DEPOSIT',
                        authorization_code,
                        ip: data?.ip_address,
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
                'notification.email',
                new CreateEmailNotificationEvent({
                    emails: user.email,
                    template: 'FundWallet',
                    data: {
                        amount,
                        type: 'DEPOSIT',
                        date: tx.createdAt,
                        channel: tx.channel,
                        reference: tx.reference,
                    },
                    subject: 'Account Funded'
                })
            )

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

    async manageWebhook(body: TransferEvent | ChargeSuccessEventData) {
        switch (body.event) {
            case 'charge.success':

                break

            case 'transfer.success':
                break
            case 'transfer.failed':
            case 'transfer.reversed':

                break
            default:
                throw new HttpException("Unsupported Event", StatusCodes.InternalServerError)
        }
    }

    // private async manageFiatEventsInternal(req: Request) {
    //     const body: TransferEvent = req.body
    //     const data = body.data
    //     try {
    //         const transaction = await this.getTransaction(data.reference)

    //         if (transaction) {
    //             await this.updateTransactionStatus(transaction.reference, Utils.toUpperCase(data.status) as TransferStatus)

    //             const amount = this.calculateTotalAmount(data.amount, +transaction.totalFee)

    //             if (body.event === 'transfer.reversed' || body.event === 'transfer.failed') {
    //                 await this.updateUserBalance(transaction.userId, amount, 'increment')
    //             }
    //         }
    //     } catch (err) {
    //         console.error(err)
    //         throw err
    //     }
    // }
}
