import {
    User,
    Modmin,
    Prisma,
    TransferStatus,
    WithdrwalRequest,
} from '@prisma/client'
import {
    FilterBy,
    SignupPromoDTO,
    FetchPromosDTO,
} from './dto/promo.dto'
import {
    Injectable,
    NotFoundException,
    ConflictException,
    ForbiddenException,
    BadRequestException,
    UnauthorizedException,
} from '@nestjs/common'
import { Mutex } from 'async-mutex'
import { Utils } from 'helpers/utils'
import { avatars } from 'utils/avatars'
import { TimeToMilli } from 'enums/base'
import {
    CreatePushNotificationEvent,
    CreateEmailNotificationEvent,
    CreateInAppNotificationEvent,
} from 'src/notification/notification.event'
import { MiscService } from 'libs/misc.service'
import { PrismaService } from 'prisma/prisma.service'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { StoreService } from 'src/store/store.service'
import { WithdrawalRequestDTO } from './dto/payout.dto'
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
        private readonly paystack: PaystackService,
        private readonly encryption: EncryptionService,
    ) { }

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

        return {
            data: modmins,
            metadata: Utils.paginateHelper(total, page, limit)
        }
    }

    async withdrawalRequest(
        requestId: string,
        { sub }: JwtDecoded,
        { action }: WithdrawalRequestDTO
    ) {
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
            await this.store.set(`withdrawal_${request.wallet.userId}`, mutex)
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
                        data: {
                            status: 'GRANTED',
                            modmin: { connect: { id: sub } }
                        }
                    }),
                    this.prisma.txHistory.create({
                        data: {
                            amount: amount,
                            type: 'WITHDRAWAL',
                            totalFee: fee.totalFee,
                            paystackFee: fee.paystackFee,
                            reference: transfer.reference,
                            processingFee: fee.processingFee,
                            transferCode: transfer.transfer_code,
                            recipientCode: String(transfer.recipient),
                            createdAt: new Date(transfer.createdAt),
                            destinationBankCode: recepient.details.bank_code,
                            destinationBankName: recepient.details.bank_name,
                            destinationAccountName: recepient.details.account_name,
                            destinationAccountNumber: recepient.details.account_number,
                            status: Utils.toUpperCase(transfer.status) as TransferStatus,
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
                        data: {
                            status: 'DECLINED',
                            modmin: { connect: { id: sub } }
                        }
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
                new CreateInAppNotificationEvent({
                    topic: 'ACTIVITIES',
                    title: 'Withdrawal Request',
                    body: `Withdrwal Request ${action === 'GRANT' ? 'Approved' : 'Declined'}`,
                })
            )

            this.event.emit(
                'notification.push',
                new CreatePushNotificationEvent({
                    title: 'Withdrawal Request',
                    body: `Withdrwal Request ${action === 'GRANT' ? 'Approved' : 'Declined'}`,
                    userId: request.wallet.userId,
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

        return {
            data: updatedRequest,
            message: "Successful"
        }
    }

    async verifyProofOfAddress(driverId: string, { action }: WithdrawalRequestDTO) {
        const user = await this.prisma.user.findUnique({
            where: { id: driverId },
            select: { email: true }
        })

        let data: {
            driverId: string
            addressVerified: boolean
            proofOfAddress: Prisma.JsonValue
        }

        if (action === 'GRANT') {
            data = await this.prisma.verification.update({
                where: { driverId },
                data: { addressVerified: true },
                select: {
                    driverId: true,
                    proofOfAddress: true,
                    addressVerified: true,
                }
            })
        } else {
            data = await this.prisma.verification.update({
                where: { driverId },
                data: {
                    proofOfAddress: null,
                    addressVerified: false
                },
                select: {
                    driverId: true,
                    proofOfAddress: true,
                    addressVerified: true,
                }
            })
        }

        this.event.emit(
            'notification.email',
            new CreateEmailNotificationEvent({
                template: data.addressVerified ? 'ProofOfAddressApproved' : 'ProofOfAddressDisapproved',
                subject: 'Proof of Address',
                emails: user.email,
                data: {

                }
            })
        )

        return {
            data,
            message: `Proof of Address has been ${data.addressVerified ? 'Approved' : 'Disapproved'}`
        }
    }


    async getPromo(key: string, findBy: 'code' | 'id') {
        const promo = await this.prisma.signupPromo.findUnique({
            where: findBy === 'code' ? { code: key } : { id: key },
        })

        return promo
    }

    async createPromo(
        { sub }: JwtDecoded,
        {
            code,
            title,
            expiry,
            reward,
            max = 50,
        }: SignupPromoDTO
    ) {
        const expiry_date = expiry ? new Date(expiry) : null

        if (expiry) {
            if (new Date() > expiry_date) {
                throw new BadRequestException('Invalid date')
            }
        }

        const promo = await this.getPromo(code, 'code')
        if (promo) {
            throw new ConflictException('Promo code already exist')
        }

        const data = await this.prisma.signupPromo.create({
            data: {
                code,
                title,
                reward,
                constraint: max,
                expiry: expiry_date,
                modmin: { connect: { id: sub } }
            },
        })

        return {
            data: { ...data, status: 'Active' },
            message: "Promo Code created successfully"
        }
    }

    async deletePromo(promoId: string) {
        const promo = await this.getPromo(promoId, 'id')
        if (!promo) {
            throw new NotFoundException('Promo not found')
        }

        await this.prisma.signupPromo.delete({ where: { id: promoId } })
    }

    async togglePromo(promoId: string) {
        const promo = await this.getPromo(promoId, 'id')
        if (!promo) {
            throw new NotFoundException('Promo not found')
        }

        const data = await this.prisma.signupPromo.update({
            where: { id: promoId },
            data: { isActive: !promo.isActive },
        })

        return {
            data: { ...data, status: data.isActive ? 'Active' : 'Disabled' },
            message: "Promo code status has been updated"
        }
    }

    async fetchPromos({
        endDate,
        page = 1,
        filterBy,
        startDate,
        limit = 50,
        search = '',
    }: FetchPromosDTO) {
        page = Number(page)
        limit = Number(limit)

        if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
            throw new BadRequestException('Invalid query parameters')
        }

        const offset = (page - 1) * limit

        const dateFilter = {
            gte:
                startDate !== '' && !isNaN(new Date(startDate).getTime())
                    ? new Date(startDate)
                    : new Date(0),
            lte:
                endDate !== '' && !isNaN(new Date(endDate).getTime())
                    ? new Date(endDate)
                    : new Date(),
        }

        const whereClause: Prisma.SignupPromoWhereInput = {
            OR: [
                { code: { contains: search, mode: 'insensitive' } },
                { title: { contains: search, mode: 'insensitive' } },
            ],
            createdAt: dateFilter,
        }

        if (filterBy) {
            if (filterBy === FilterBy.ACTIVE) {
                whereClause.isActive = true
                whereClause.expiry = {
                    gte: new Date(),
                }
            } else if (filterBy === FilterBy.EXPIRED) {
                whereClause.expiry = {
                    lte: new Date(),
                }
            } else if (filterBy === FilterBy.DISABLED) {
                whereClause.isActive = false
            }
        }

        const promos = await this.prisma.signupPromo.findMany({
            where: whereClause,
            skip: offset,
            take: limit,
            orderBy: { createdAt: 'desc' },
        })

        const promosWithStatus = promos.map((promo) => {
            let status = promo.isActive ? 'Active' : 'Disabled'

            if (promo?.expiry) {
                if (new Date() > new Date(promo.expiry)) {
                    status = 'Expired'
                }
            }

            return { ...promo, status }
        })

        const total = await this.prisma.signupPromo.count({ where: whereClause })

        return {
            data: promosWithStatus,
            metadata: Utils.paginateHelper(total, page, limit),
        }
    }
}
