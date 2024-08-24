import { Mutex } from 'async-mutex'
import { Injectable } from '@nestjs/common'
import { Request, Response } from 'express'
import { TransferStatus } from '@prisma/client'
import { MiscService } from 'libs/misc.service'
import { StatusCodes } from 'enums/statusCodes'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'libs/response.service'
import { AmountDTO, FundWalletDTO } from './dto/tx.dto'
import { BankDetailsDTO, ValidateBankDTO } from './dto/bank.dto'
import { PaystackService } from 'libs/Paystack/paystack.service'
import { removeNullFields, toUpperCase } from 'helpers/transformer'

@Injectable()
export class WalletService {
    constructor(
        private readonly misc: MiscService,
        private readonly prisma: PrismaService,
        private readonly response: ResponseService,
        private readonly paystack: PaystackService,
    ) { }

    private processing = false
    private requestQueue: Request[] = []
    private userMutexes = new Map<string, Mutex>()

    async bankAccountVerification(res: Response, { account_number, bank_code }: ValidateBankDTO) {
        const { data } = await this.paystack.resolveAccount(account_number, bank_code)

        this.response.sendSuccess(res, StatusCodes.OK, { data })
    }

    async fetchBanks(res: Response) {
        const { data: banks } = await this.paystack.listBanks()

        this.response.sendSuccess(res, StatusCodes.OK, { data: banks })
    }

    async fetchBankByBankCode(res: Response, bankCode: string) {
        const bank = await this.paystack.getBankByBankCode(bankCode)

        if (!bank) {
            return this.response.sendError(res, StatusCodes.NotFound, "No supported Bank Name is associated with this bank code.")
        }

        this.response.sendSuccess(res, StatusCodes.OK, { data: bank })
    }

    async linkBankAccount(
        res: Response,
        { sub }: ExpressUser,
        { accountNumber, bankCode, otp }: BankDetailsDTO
    ) {
        try {
            const totp = await this.prisma.totp.findUnique({
                where: { totp: otp, userId: sub }
            })

            if (!totp || !totp.totp_expiry) {
                return this.response.sendError(res, StatusCodes.Unauthorized, "Incorrect OTP")
            }

            if (new Date() > new Date(totp.totp_expiry)) {
                this.response.sendError(res, StatusCodes.Forbidden, "OTP has expired")
                await this.prisma.totp.delete({
                    where: { userId: totp.userId },
                })

                return
            }

            const linkedAccounts = await this.prisma.linkedBank.findMany({
                where: { userId: sub },
                orderBy: { createdAt: 'desc' },
            })

            const totalLinked = linkedAccounts.length
            let canLinkNewAccount = true
            let replaceAccountId = null

            if (totalLinked === 2) {
                const lastLinkedBankAccount = linkedAccounts[0]

                const now = new Date().getTime()
                const lastLinkedDate = new Date(lastLinkedBankAccount.createdAt).getTime()
                const diffTime = Math.abs(now - lastLinkedDate)
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

                if (lastLinkedBankAccount.primary) {
                    canLinkNewAccount = true
                } else if (diffDays < 60) {
                    canLinkNewAccount = false
                    return this.response.sendError(res, StatusCodes.BadRequest, "You cannot link a new bank account until 60 days have passed since the last account was linked")
                } else {
                    replaceAccountId = lastLinkedBankAccount.id
                }
            }

            if (canLinkNewAccount) {
                const bank = await this.paystack.getBankByBankCode(bankCode)
                const { data: details } = await this.paystack.resolveAccount(accountNumber, bankCode)

                if (totalLinked === 0) {
                    const user = await this.prisma.user.findUnique({
                        where: { id: sub },
                        select: {
                            id: true,
                            lastname: true,
                            firstname: true,
                            middlename: true,
                        },
                    })

                    let matchingNamesCount = 0

                    const full_names: string[] = [toUpperCase(user.firstname), toUpperCase(user.lastname), toUpperCase(user.middlename)].filter(Boolean)
                    const account_names = toUpperCase(details.account_name).split(/[\s,]+/).filter(Boolean)

                    for (const account_name of account_names) {
                        if (full_names.includes(account_name)) {
                            matchingNamesCount += 1
                        }
                    }

                    if (matchingNamesCount < 2) {
                        return this.response.sendError(res, StatusCodes.BadRequest, "Account names do not match")
                    }
                }

                const data = replaceAccountId
                    ? await this.prisma.linkedBank.update({
                        where: { id: replaceAccountId },
                        data: {
                            bankCode,
                            accountNumber,
                            bankName: bank.name,
                            primary: totalLinked === 0,
                            accountName: details.account_name,
                        },
                    })
                    : await this.prisma.linkedBank.create({
                        data: {
                            bankCode,
                            accountNumber,
                            bankName: bank.name,
                            primary: totalLinked === 0,
                            accountName: details.account_name,
                            user: { connect: { id: sub } },
                        },
                    })

                await this.prisma.totp.deleteMany({
                    where: { userId: sub }
                })

                this.response.sendSuccess(res, StatusCodes.Created, {
                    data,
                    message: replaceAccountId ? "Your bank account has been updated." : "Your bank account has been linked",
                })
            }
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async linkedBanks(res: Response, { sub }: ExpressUser) {
        const banks = await this.prisma.linkedBank.findMany({
            where: { userId: sub },
            orderBy: [
                { primary: 'desc' },
                { createdAt: 'desc' }
            ]
        })

        this.response.sendSuccess(res, StatusCodes.OK, { data: banks })
    }

    async getLinkedBank(
        id: string,
        res: Response,
        { sub: userId }: ExpressUser,
    ) {
        const bank = await this.prisma.linkedBank.findUnique({
            where: { id, userId }
        })

        if (!bank) {
            return this.response.sendError(res, StatusCodes.NotFound, "Linked bank account not found")
        }

        this.response.sendSuccess(res, StatusCodes.OK, { data: bank })
    }

    async requestWithrawal(
        res: Response,
        linkedBankId: string,
        { sub: userId }: ExpressUser,
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

            let eligible: boolean = false

            if (!wallet.lastApprovedAt) {
                eligible = true
            } else {
                const twoWeeksInMilliseconds = 14 * 24 * 60 * 60 * 1000 // 2-weeks
                const now = new Date().getTime()
                const lastApprovedAt = new Date(wallet.lastApprovedAt).getTime()

                if (now - lastApprovedAt >= twoWeeksInMilliseconds) {
                    eligible = true
                }
            }

            if (!eligible) {
                return this.response.sendError(res, StatusCodes.BadRequest, "You're not yet eligible for a withdrawal request")
            }

            const linkedBank = await this.prisma.linkedBank.findUnique({
                where: { id: linkedBankId }
            })

            if (!linkedBank) {
                return this.response.sendError(res, StatusCodes.NotFound, "Linked bank not found")
            }

            const withdrawalRequest = await this.prisma.$transaction([
                this.prisma.withdrwalRequest.create({
                    data: {
                        amount: amount,
                        status: 'PENDING',
                        linkedBank: { connect: { id: linkedBankId } }
                    }
                }),
                this.prisma.wallet.update({
                    where: { id: wallet.id },
                    data: {
                        lastRequestedAt: new Date(),
                        balance: { decrement: amount },
                    }
                })
            ])

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: withdrawalRequest,
                message: "Withdrawal request has been sent to the Admin in charge",
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        } finally {
            release()
        }
    }

    async fundWallet(
        res: Response,
        { sub }: ExpressUser,
        { reference }: FundWalletDTO,
    ) {
        let userMutex = this.userMutexes.get(sub)

        if (!userMutex) {
            userMutex = new Mutex()
            this.userMutexes.set(sub, userMutex)
        }

        const release = await userMutex.acquire()

        try {
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

            const [_, tx] = await this.prisma.$transaction([
                this.prisma.wallet.update({
                    where: { userId: sub },
                    data: {
                        lastDepositedAt: new Date(),
                        lastDepositedAmount: amount,
                        balance: { increment: amount },
                    },
                }),
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
            ])

            this.response.sendSuccess(res, StatusCodes.OK, { data: removeNullFields(tx) })
        } catch (err) {
            this.misc.handlePaystackAndServerError(res, err)
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
                await this.updateTransactionStatus(transaction.reference, toUpperCase(data.status) as TransferStatus)

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
