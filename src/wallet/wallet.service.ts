import { Mutex } from 'async-mutex'
import { Utils } from 'helpers/utils'
import {
    CreatePushNotificationEvent,
    CreateEmailNotificationEvent,
    CreateInAppNotificationEvent,
} from 'src/notification/notification.event'
import { Request, Response } from 'express'
import { TransferStatus } from '@prisma/client'
import { StatusCodes } from 'enums/statusCodes'
import { ValidateBankDTO } from './dto/bank.dto'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'libs/response.service'
import { AmountDTO, FundWalletDTO } from './dto/tx.dto'
import { Injectable, NotFoundException } from '@nestjs/common'
import { PaystackService } from 'libs/Paystack/paystack.service'

@Injectable()
export class WalletService {
    constructor(
        private readonly event: EventEmitter2,
        private readonly prisma: PrismaService,
        private readonly response: ResponseService,
        private readonly paystack: PaystackService,
    ) { }

    private processing = false
    private requestQueue: Request[] = []
    private userMutexes = new Map<string, Mutex>()

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
        { amount }: AmountDTO
    ) {
        let userMutex = this.userMutexes.get(userId)

        if (!userMutex) {
            userMutex = new Mutex()
            this.userMutexes.set(userId, userMutex)
        }

        const release = await userMutex.acquire()

        try {
            if (amount < 100) {
                return this.response.sendError(res, StatusCodes.BadRequest, "Minimum withdrawal amount is ₦100.00")
            }

            const wallet = await this.prisma.getUserWallet(userId)

            if (wallet.locked) {
                return this.response.sendError(res, StatusCodes.Forbidden, "Try again later..")
            }

            if (wallet.balance.toNumber() < amount) {
                return this.response.sendError(res, StatusCodes.UnprocessableEntity, "Insufficient balance")
            }

            let eligible = false

            if (!wallet.lastApprovedAt) {
                eligible = true
            } else {
                const twoWeeksInMilliseconds = 14 * 24 * 60 * 60 * 1000 // 2 weeks
                const now = Date.now()
                const lastApprovedAt = new Date(wallet.lastApprovedAt).getTime()

                if (now - lastApprovedAt >= twoWeeksInMilliseconds) {
                    eligible = true
                }
            }

            if (!eligible) {
                return this.response.sendError(res, StatusCodes.BadRequest, "You're not yet eligible for a withdrawal request")
            }

            await this.prisma.wallet.update({
                where: { id: wallet.id },
                data: { locked: true },
            })

            const withdrawalRequest = await this.prisma.$transaction([
                this.prisma.withdrwalRequest.create({
                    data: {
                        amount,
                        status: 'PENDING',
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

            return {
                message: "Withdrawal request has been sent to the Admin in charge",
                data: withdrawalRequest,
            }
        } catch (err) {
            console.error(err)
            return this.response.sendError(res, StatusCodes.InternalServerError, "Something went wrong. Please try again later.")
        } finally {
            release()
            await this.prisma.wallet.update({
                where: { userId },
                data: { locked: false },
            })
        }
    }

    async fundWallet(
        res: Response,
        { sub }: JwtDecoded,
        { reference }: FundWalletDTO,
    ) {
        let userMutex = this.userMutexes.get(sub)

        if (!userMutex) {
            userMutex = new Mutex()
            this.userMutexes.set(sub, userMutex)
        }

        const release = await userMutex.acquire()

        try {
            const user = await this.prisma.user.findUnique({
                where: { id: sub }
            })

            const wallet = await this.prisma.getUserWallet(sub)

            if (!wallet) {
                return this.response.sendError(res, StatusCodes.NotFound, 'Wallet not found')
            }

            const verifyTx = await this.paystack.verifyTransaction(reference)
            if (!verifyTx.status || verifyTx?.data?.status !== "success") {
                return this.response.sendError(res, StatusCodes.PaymentIsRequired, 'Payment is required')
            }

            const { data } = verifyTx
            const amount = data.amount / 100
            const channel = data?.authorization?.channel
            const authorization_code = data?.authorization?.authorization_code

            const [tx] = await this.prisma.$transaction([
                this.prisma.txHistory.create({
                    data: {
                        amount: amount,
                        channel: channel,
                        type: 'DEPOSIT',
                        authorization_code,
                        ip: data.ip_address,
                        reference: `deposit-${reference}`,
                        user: { connect: { id: sub } },
                        status: data.status.toUpperCase() as TransferStatus,
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
            return this.response.sendError(res, StatusCodes.InternalServerError, "Something went wrong. Please try again later.")
        } finally {
            release()
        }
    }

    async enqueueRequest(req: Request) {
        this.requestQueue.push(req)
        await this.processQueue()
    }

    private async processQueue() {
        if (!this.processing) {
            this.processing = true

            while (this.requestQueue.length > 0) {
                const req = this.requestQueue.shift()
                if (req) {
                    await this.manageFiatEventsInternal(req)
                }
            }

            this.processing = false
        }
    }

    private async manageFiatEventsInternal(req: Request) {
        const body: TransferEvent = req.body
        const data = body.data
        try {
            const transaction = await this.getTransaction(data.reference)

            if (transaction) {
                await this.updateTransactionStatus(transaction.reference, Utils.toUpperCase(data.status) as TransferStatus)

                const amount = this.calculateTotalAmount(data.amount, +transaction.totalFee)

                if (body.event === 'transfer.reversed' || body.event === 'transfer.failed') {
                    await this.updateUserBalance(transaction.userId, amount, 'increment')
                }
            }
        } catch (err) {
            console.error(err)
            throw err
        }
    }

    private async getTransaction(reference: string) {
        return await this.prisma.txHistory.findUnique({
            where: { reference }
        })
    }

    private async updateTransactionStatus(reference: string, status: TransferStatus) {
        await this.prisma.txHistory.update({
            where: { reference },
            data: { status }
        })
    }

    private calculateTotalAmount(amount: number, totalFee: number) {
        const KOBO = 100 as const
        return (amount / KOBO) + totalFee
    }

    private async updateUserBalance(userId: string, amount: number, action: 'increment' | 'decrement') {
        await this.prisma.wallet.update({
            where: { userId },
            data: { balance: { [action]: amount } }
        })
    }
}
