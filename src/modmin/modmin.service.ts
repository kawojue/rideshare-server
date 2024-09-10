import {
    User,
    Modmin,
    TransferStatus,
    WithdrwalRequest,
} from '@prisma/client'
import { Mutex } from 'async-mutex'
import {
    Injectable,
    NotFoundException,
    ConflictException,
    ForbiddenException,
    BadRequestException,
    UnauthorizedException,
} from '@nestjs/common'
import { Utils } from 'helpers/utils'
import { avatars } from 'utils/avatars'
import { TimeToMilli } from 'enums/base'
import {
    CreateSmsNotificationEvent,
    CreatePushNotificationEvent,
    CreateEmailNotificationEvent,
    CreateInAppNotificationEvent,
} from 'src/notification/notification.event'
import { MiscService } from 'libs/misc.service'
import { PrismaService } from 'prisma/prisma.service'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { StoreService } from 'src/store/store.service'
import { WithdrawalRequestDTO } from './dto/payout.dto'
import { ResponseService } from 'libs/response.service'
import { EncryptionService } from 'libs/encryption.service'
import { FetchModminsDTO } from 'src/app/dto/pagination.dto'
import { InviteNewModminDTO, LoginDTO } from './dto/auth.dto'
import { PaystackService } from 'libs/Paystack/paystack.service'


@Injectable()
export class ModminService {
    constructor(
        private readonly misc: MiscService,
        private readonly store: StoreService,
        private readonly event: EventEmitter2,
        private readonly prisma: PrismaService,
        private readonly response: ResponseService,
        private readonly paystack: PaystackService,
        private readonly encryption: EncryptionService,
    ) { }

    // private mutexes = new Map<string, Mutex>()

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

        await this.store.set(
            `token_${modmin.id}`,
            { refresh_token },
            TimeToMilli.OneHundredTwentyDays
        )

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
        const avatar = avatars.find(avatar => avatar.id === +avatarId)

        const data = await this.prisma.modmin.update({
            where: { id: sub },
            data: { avatar: avatar.url },
            select: { avatar: true }
        })

        return { data, message: "Avatar was updated successfully" }
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

        const data = { ...modmin, password }

        return { data, message: "A new Moderator/Admin has been invited" }
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

    async withdrawalRequest(requestId: string, { action }: WithdrawalRequestDTO) {
        let request = await this.prisma.withdrwalRequest.findUnique({
            where: { id: requestId },
            include: {
                wallet: {
                    select: {
                        user: {
                            select: { email: true }
                        },
                        userId: true,
                    },
                }
            }
        })

        if (!request) {
            throw new NotFoundException("Withdrawal request not found")
        }

        if (request.locked) {
            throw new ConflictException("Request is already being processed")
        }

        let mutex = await this.store.get<Mutex>(request.wallet.userId)

        if (!mutex) {
            mutex = new Mutex()
            this.store.set(`withdrawal_${request.wallet.userId}`, mutex)
        }

        const release = await mutex.acquire()

        await this.prisma.withdrwalRequest.update({
            where: { id: requestId },
            data: { locked: true }
        })

        let updatedRequest: WithdrwalRequest

        try {
            if (action === "GRANT") {
                const amount = request.amount
                const fee = Utils.calculateFees(+amount)
                const settlementAmount = amount.toNumber() - fee.totalFee
                const amountInKobo = settlementAmount * 100

                const { data: details } = await this.paystack.resolveAccount(
                    request.destinationAccountNumber,
                    request.destinationBankCode
                )

                const { data: recepient } = await this.paystack.createRecipient({
                    account_number: details.account_number,
                    bank_code: request.destinationBankCode,
                    currency: 'NGN',
                    name: details.account_name,
                    type: 'nuban',
                })

                const { data: transfer } = await this.paystack.initiateTransfer({
                    source: 'balance',
                    amount: amountInKobo,
                    reason: `RideShare - withdrawal`,
                    recipient: recepient.recipient_code,
                    reference: `withdrawal-${Utils.generateRandomDigits(7)}${Date.now()}`,
                })

                const [withdrawal] = await this.prisma.$transaction([
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
                            user: { connect: { id: request.wallet.userId } },
                        },
                    }),
                ])

                updatedRequest = withdrawal
            }

            if (action === "DECLINE") {
                const [withdrawal] = await this.prisma.$transaction([
                    this.prisma.withdrwalRequest.update({
                        where: { id: requestId },
                        data: { status: 'DECLINED' }
                    }),
                    this.prisma.wallet.update({
                        where: { userId: request.wallet.userId },
                        data: {
                            lastApprovedAmount: request.amount,
                            balance: { increment: request.amount },
                        }
                    })
                ])

                updatedRequest = withdrawal
            }

            this.event.emit(
                'notification.in-app',
                new CreateEmailNotificationEvent({
                    subject: `Withdrwal Request ${action === 'GRANT' ? 'Approved' : 'Declined'}`,
                    template: '',
                    emails: request.wallet.user.email,
                })
            )

        } catch (err) {
            console.error(err)
            throw err
        } finally {
            release()
            await this.prisma.withdrwalRequest.update({
                where: { id: requestId },
                data: { locked: false }
            })
            await this.store.delete(`withdrawal_${request.wallet.userId}`)
        }

        return updatedRequest
    }

    async verifyProofOfAddress(driverId: string) {
        const verification = await this.prisma.verification.findUnique({
            where: { driverId }
        })

        return await this.prisma.verification.update({
            where: { driverId },
            data: { addressVerified: !verification.addressVerified },
            select: {
                driverId: true,
                proofOfAddress: true,
                addressVerified: true,
            }
        })
    }
}
