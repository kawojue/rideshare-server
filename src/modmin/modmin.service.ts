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
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { StatusCodes } from 'enums/statusCodes'
import { MiscService } from 'libs/misc.service'
import { PrismaService } from 'prisma/prisma.service'
import { WithdrawalRequestDTO } from './dto/payout.dto'
import { ResponseService } from 'libs/response.service'
import { EncryptionService } from 'libs/encryption.service'
import { InviteNewModminDTO, LoginDTO } from './dto/auth.dto'
import { PaystackService } from 'libs/Paystack/paystack.service'
import { Utils } from 'helpers/utils'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { CreateEmailNotificationEvent } from 'src/notification/notification.event'


@Injectable()
export class ModminService {
    constructor(
        private readonly misc: MiscService,
        private readonly event: EventEmitter2,
        private readonly prisma: PrismaService,
        private readonly response: ResponseService,
        private readonly paystack: PaystackService,
        private readonly encryption: EncryptionService,
    ) { }

    private async updateCache(refresh_token: string, modminId: string) {
        await this.prisma.cache.upsert({
            where: { key: `token_${modminId}`, modminId },
            create: {
                refresh_token,
                type: 'TOKEN_REFRESHER',
                key: `token_${modminId}`,
            },
            update: { refresh_token }
        })
    }

    async login({ email, password }: LoginDTO) {
        const modmin = await this.prisma.modmin.findUnique({
            where: { email }
        })

        if (!modmin) {
            throw new NotFoundException("Moderator or Admin not found")
        }

        if (modmin.status === "SUSPENDED") {
            throw new ForbiddenException("Account suspended")
        }

        const isMatch = await this.encryption.compare(password, modmin.password)
        if (!isMatch) {
            throw new UnauthorizedException("Warning! Password not match")
        }

        const payload = {
            sub: modmin.id,
            role: modmin.role,
            status: modmin.status,
        } as JwtPayload

        const access_token = await this.misc.generateAccessToken(payload)
        const refresh_token = await this.misc.generateRefreshToken(payload)

        await this.updateCache(refresh_token, modmin.id)

        return {
            access_token,
            refresh_token,
            data: {
                role: modmin.role,
                email: modmin.email,
                avatar: modmin.avatar,
                fullname: modmin.fullname,
            }
        }
    }

    async updateAvatar(avatarId: string, { sub }: JwtDecoded) {
        const avatar = avatars.find(avatar => String(avatar.id) === avatarId)

        const data = await this.prisma.modmin.update({
            where: { id: sub },
            data: { avatar: avatar.url },
            select: { avatar: true }
        })

        return data
    }

    async inviteNewModmin({ email, password, role, fullname }: InviteNewModminDTO) {
        const isExists = await this.prisma.modmin.findUnique({
            where: { email }
        })

        if (isExists) {
            throw new ConflictException(`${Utils.titleText(isExists.role)} already exists`)
        }

        const hashedPswd = await this.encryption.hash(password, 12)

        const modmin = await this.prisma.modmin.create({
            data: {
                fullname,
                role, email,
                password: hashedPswd,
                avatar: avatars[Math.floor(Math.random() * avatars.length)].url,
            },
            select: {
                role: true,
                email: true,
                avatar: true,
                fullname: true,
            }
        })

        return { ...modmin, password }
    }

    async toggleAccountSuspension(accountId: string, { sub }: JwtDecoded) {
        if (accountId === sub) {
            throw new ConflictException("You can't suspend yourself")
        }


        let account: User | Modmin | null = await this.prisma.user.findUnique({
            where: { id: accountId }
        })

        let name: string = account?.firstname

        if (!account) {
            account = await this.prisma.modmin.findUnique({
                where: { id: accountId }
            })

            name = account ? account.fullname.split(' ')[0] : ''
        }

        if (!account) {
            throw new NotFoundException("Account not found")
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

        this.event.emit(
            'notification.email',
            new CreateEmailNotificationEvent({
                template: (account.role === "ADMIN" || account.role === "MODERATOR") ? 'ModminAccountStatusChanged' : 'UserAccountStatusChanged',
                subject: acc.status === 'SUSPENDED' ? 'Account Suspended' : 'Account Activated',
                emails: account.email,
                data: {
                    name,
                    status: acc.status,
                    date: account.updatedAt,
                }
            })
        )

        return acc
    }

    async fetchModmins({
        role,
        page = 1,
        limit = 50,
        search = '',
        endDate = '',
        startDate = '',
    }: FetchModminsDTO) {
        page = Number(page)
        limit = Number(limit)

        if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
            throw new BadRequestException("Invalid pagination query")
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

        return {
            data: modmins,
            metadata: {
                page,
                limit,
                total,
                totalPage,
                hasNext,
                hasPrev,
            }
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
                include: { wallet: true }
            })

            if (!request) {
                throw new NotFoundException("Withdrawal request not found")
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
                const fee = Utils.calculateFees(+amount)
                const settlementAmount = amount.toNumber() - fee.totalFee
                const amountInKobo = settlementAmount * 100

                const { data: details } = await this.paystack.resolveAccount(request.wallet.accountNumber, request.wallet.)

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
        { sub, role }: JwtDecoded,
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
