import {
    User,
    Modmin,
    TransferStatus,
    WithdrwalRequest,
} from '@prisma/client'
import { Response } from 'express'
import {
    FetchModminsDTO,
    FetchWithdrawalRequestsDTO,
} from 'src/app/dto/pagination.dto'
import { avatars } from 'utils/avatars'
import { Injectable } from '@nestjs/common'
import { StatusCodes } from 'enums/statusCodes'
import { MiscService } from 'libs/misc.service'
import { titleText } from 'helpers/transformer'
import { PlunkService } from 'libs/plunk.service'
import { PrismaService } from 'prisma/prisma.service'
import { WithdrawalRequestDTO } from './dto/payout.dto'
import { ResponseService } from 'libs/response.service'
import { generateRandomDigits } from 'helpers/generators'
import { EncryptionService } from 'libs/encryption.service'
import { InviteNewModminDTO, LoginDTO } from './dto/auth.dto'
import { PaystackService } from 'libs/Paystack/paystack.service'


@Injectable()
export class ModminService {
    private readonly isProd: boolean

    constructor(
        private readonly misc: MiscService,
        private readonly plunk: PlunkService,
        private readonly prisma: PrismaService,
        private readonly response: ResponseService,
        private readonly paystack: PaystackService,
        private readonly encryption: EncryptionService,
    ) {
        this.isProd = process.env.NODE_ENV === "production"
    }

    async login(res: Response, { email, password }: LoginDTO) {
        const modmin = await this.prisma.modmin.findUnique({
            where: { email }
        })

        if (!modmin) {
            return this.response.sendError(res, StatusCodes.NotFound, "Moderator or Admin not found")
        }

        if (modmin.status === "SUSPENDED") {
            return this.response.sendError(res, StatusCodes.Forbidden, "Account suspended")
        }

        const isMatch = await this.encryption.compare(password, modmin.password)
        if (!isMatch) {
            return this.response.sendError(res, StatusCodes.Unauthorized, "Warning! Password not match")
        }

        const payload = {
            sub: modmin.id,
            role: modmin.role,
            status: modmin.status
        } as JwtPayload

        const access_token = await this.misc.generateAccessToken(payload)
        const refresh_token = await this.misc.generateRefreshToken(payload)

        await this.prisma.user.update({
            where: { id: modmin.id },
            data: { refresh_token }
        })

        res.cookie('refresh_token', refresh_token, {
            httpOnly: true,
            sameSite: this.isProd ? 'none' : 'lax',
            secure: this.isProd,
            maxAge: 60 * 60 * 24 * 60 * 1000,
        })

        this.response.sendSuccess(res, StatusCodes.OK, {
            access_token,
            data: {
                role: modmin.role,
                email: modmin.email,
                avatar: modmin.avatar,
                fullname: modmin.fullname,
            }
        })
    }

    async updateAvatar(
        res: Response,
        avatarId: string,
        { sub }: ExpressUser,
    ) {
        const avatar = avatars.find(avatar => String(avatar.id) === avatarId)

        const data = await this.prisma.modmin.update({
            where: { id: sub },
            data: { avatar: avatar.url },
            select: { avatar: true }
        })

        this.response.sendSuccess(res, StatusCodes.OK, { data })
    }

    async inviteNewModmin(res: Response, { email, password, role, fullname }: InviteNewModminDTO) {
        try {
            const isExists = await this.prisma.modmin.findUnique({
                where: { email }
            })

            if (isExists) {
                return this.response.sendError(res, StatusCodes.Conflict, `${titleText(isExists.role)} already exists`)
            }

            const hashedPswd = await this.encryption.hash(password, 12)

            const modmin = await this.prisma.modmin.create({
                data: {
                    role,
                    email,
                    fullname,
                    password: hashedPswd,
                    avatar: avatars[Math.floor(Math.random() * avatars.length)].url,
                },
                select: {
                    role: true,
                    avatar: true,
                    email: true,
                    fullname: true,
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: { ...modmin, password } })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async toggleAccountSuspension(
        res: Response,
        accountId: string,
        { sub }: ExpressUser,
    ) {
        if (accountId === sub) {
            return this.response.sendError(res, StatusCodes.Conflict, "You can't suspend yourself")
        }

        let account: User | Modmin | null = await this.prisma.user.findUnique({
            where: { id: accountId }
        })

        if (!account) {
            account = await this.prisma.modmin.findUnique({
                where: { id: accountId }
            })
        }

        if (!account) {
            return this.response.sendError(res, StatusCodes.NotFound, "Account not found")
        }

        const acc = await (this.prisma[`${(account.role === "ADMIN" || account.role === "MODERATOR") ? 'modmin' : 'user'}`] as any).update({
            where: { id: accountId },
            data: { status: account.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED' },
            select: {
                id: true,
                role: true,
                email: true,
                status: true,
            }
        })

        res.on('finish', async () => {
            await this.plunk.sendPlunkEmail({
                to: account.email,
                subject: 'Account Changed',
                body: `${acc.status}`
            })
        })

        this.response.sendSuccess(res, StatusCodes.OK, { data: acc })
    }

    async fetchModmins(
        res: Response,
        {
            role,
            page = 1,
            limit = 50,
            search = '',
            endDate = '',
            startDate = '',
        }: FetchModminsDTO
    ) {
        try {
            page = Number(page)
            limit = Number(limit)

            if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
                return this.response.sendError(res, StatusCodes.BadRequest, "Invalid pagination query")
            }

            const offset = (page - 1) * limit

            const dateFilter = {
                gte: startDate !== '' ? new Date(startDate) : new Date(0),
                lte: endDate !== '' ? new Date(endDate) : new Date(),
            }

            const [modmins, total] = await Promise.all([
                this.prisma.modmin.findMany({
                    where: {
                        role: role ? role : { in: ['ADMIN', 'MODERATOR'] },
                        OR: [
                            { email: { contains: search, mode: 'insensitive' } },
                            { fullname: { contains: search, mode: 'insensitive' } },
                        ],
                        createdAt: dateFilter
                    },
                    select: {
                        id: true,
                        role: true,
                        email: true,
                        avatar: true,
                        status: true,
                        fullname: true,
                        createdAt: true,
                    },
                    take: limit,
                    skip: offset,
                    orderBy: { updatedAt: 'desc' }
                }),
                this.prisma.modmin.count({
                    where: {
                        role: role ? role : { in: ['ADMIN', 'MODERATOR'] },
                        OR: [
                            { email: { contains: search, mode: 'insensitive' } },
                            { fullname: { contains: search, mode: 'insensitive' } },
                        ],
                        createdAt: dateFilter
                    }
                })
            ])

            const totalPage = Math.ceil(total / limit)
            const hasNext = page < totalPage
            const hasPrev = page > 1

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: modmins,
                metadata: {
                    page,
                    limit,
                    total,
                    totalPage,
                    hasNext,
                    hasPrev,
                }
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async withdrawalRequest(
        res: Response,
        requestId: string,
        { action }: WithdrawalRequestDTO,
    ) {
        try {
            let request = await this.prisma.withdrwalRequest.findUnique({
                where: { id: requestId },
                include: { linkedBank: true }
            })

            if (!request) {
                return this.response.sendError(res, StatusCodes.NotFound, "Withdrawal request not found")
            }

            if (request.locked) {
                return this.response.sendError(res, StatusCodes.Conflict, "Request is already being processed")
            }

            await this.prisma.withdrwalRequest.update({
                where: { id: requestId },
                data: { locked: true }
            })

            let updatedRequest: WithdrwalRequest

            if (action === "GRANT") {
                const amount = request.amount
                const fee = await this.misc.calculateFees(+amount)
                const settlementAmount = amount.toNumber() - fee.totalFee
                const amountInKobo = settlementAmount * 100

                const { data: details } = await this.paystack.resolveAccount(request.linkedBank.accountNumber, request.linkedBank.bankCode)

                const { data: recepient } = await this.paystack.createRecipient({
                    account_number: details.account_number,
                    bank_code: request.linkedBank.bankCode,
                    currency: 'NGN',
                    name: details.account_name,
                    type: 'nuban',
                })

                const { data: transfer } = await this.paystack.initiateTransfer({
                    source: 'balance',
                    amount: amountInKobo,
                    reason: `RideShare - withdrawal`,
                    recipient: recepient.recipient_code,
                    reference: `withdrawal-${generateRandomDigits(7)}${Date.now()}`,
                })

                const [withdrawal] = await Promise.all([
                    this.prisma.withdrwalRequest.update({
                        where: { id: requestId },
                        data: { status: 'GRANTED' }
                    }),
                    this.prisma.txHistory.create({
                        data: {
                            amount: amount,
                            type: 'WITHDRAWAL',
                            totalFee: fee.totalFee,
                            paystackFee: fee.paystackFee,
                            reference: transfer.reference,
                            processingFee: fee.processingFee,
                            transfer_code: transfer.transfer_code,
                            recipient_code: String(transfer.recipient),
                            createdAt: new Date(transfer.createdAt),
                            destinationBankCode: recepient.details.bank_code,
                            destinationBankName: recepient.details.bank_name,
                            destinationAccountName: recepient.details.account_name,
                            status: transfer.status.toUpperCase() as TransferStatus,
                            destinationAccountNumber: recepient.details.account_number,
                            user: { connect: { id: request.linkedBank.userId } },
                        },
                    }),
                ])

                updatedRequest = withdrawal
            }

            if (action === "DECLINE") {
                const [withdrawal] = await Promise.all([
                    this.prisma.withdrwalRequest.update({
                        where: { id: requestId },
                        data: { status: 'GRANTED' }
                    }),
                    this.prisma.wallet.update({
                        where: { userId: request.linkedBank.userId },
                        data: {
                            lastApprovedAt: new Date(),
                            lastApprovedAmount: request.amount,
                            balance: { increment: request.amount },
                        }
                    })
                ])

                updatedRequest = withdrawal
            }

            res.on('finish', async () => {
                // TODO: send email for starus change
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: updatedRequest })
        } catch (err) {
            this.misc.handlePaystackAndServerError(res, err)
        }
    }

    async fetchWithdrawalRequest(
        res: Response,
        { sub, role }: ExpressUser,
        {
            min,
            max,
            sortBy,
            status,
            page = 1,
            limit = 50,
            search = '',
            endDate = '',
            startDate = '',
        }: FetchWithdrawalRequestsDTO
    ) {
        try {
            page = Number(page)
            limit = Number(limit)

            if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
                return this.response.sendError(res, StatusCodes.BadRequest, "Invalid pagination query")
            }

            const offset = (page - 1) * limit

            const dateFilter = {
                gte: startDate !== '' ? new Date(startDate) : new Date(0),
                lte: endDate !== '' ? new Date(endDate) : new Date(),
            }

            const rangeFilter = {
                gte: min ? Number(min) : null,
                lte: max ? Number(max) : null,
            }

            const [requests, total] = await Promise.all([
                this.prisma.withdrwalRequest.findMany({
                    where: {
                        linkedBank: (role === "ADMIN" || role === "MODERATOR") ? {
                            userId: undefined
                        } : { userId: sub },
                        amount: rangeFilter,
                        createdAt: dateFilter,
                        status: status || undefined,
                        OR: [
                            { linkedBank: { bankName: { contains: search, mode: 'insensitive' } } },
                            { linkedBank: { accountName: { contains: search, mode: 'insensitive' } } },
                        ]
                    },
                    orderBy: sortBy === "HIGHEST" ? { amount: 'desc' } : sortBy === "LOWEST" ? { amount: 'asc' } : { createdAt: 'desc' },
                    take: limit,
                    skip: offset,
                }),
                this.prisma.withdrwalRequest.count({
                    where: {
                        linkedBank: (role === "ADMIN" || role === "MODERATOR") ? {
                            userId: undefined
                        } : { userId: sub },
                        amount: rangeFilter,
                        createdAt: dateFilter,
                        status: status || undefined,
                        OR: [
                            { linkedBank: { bankName: { contains: search, mode: 'insensitive' } } },
                            { linkedBank: { accountName: { contains: search, mode: 'insensitive' } } },
                        ]
                    },
                })
            ])

            const totalPage = Math.ceil(total / limit)
            const hasNext = page < totalPage
            const hasPrev = page > 1

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: requests,
                metadata: {
                    page,
                    limit,
                    total,
                    totalPage,
                    hasNext,
                    hasPrev,
                }
            })
        } catch (err) {
            this.misc.handlePaystackAndServerError(res, err)
        }
    }

    async verifyProofOfAddress(res: Response, driverId: string) {
        try {
            const verification = await this.prisma.verification.findUnique({
                where: { driverId }
            })

            const newVerification = await this.prisma.verification.update({
                where: { driverId },
                data: { addressVerified: !verification.addressVerified },
                select: {
                    driverId: true,
                    proofOfAddress: true,
                    addressVerified: true,
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: newVerification })
        } catch (err) {
            this.misc.handlePaystackAndServerError(res, err)
        }
    }
}
