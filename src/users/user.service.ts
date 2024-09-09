import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common'
import {
    RatingDTO,
    FetchRatingAndReviewsDTO,
} from './dto/rate.dto'
import {
    FetchUsersDTO,
    FetchTxHistoriesDTO,
    FetchWithdrawalRequestsDTO,
} from 'src/app/dto/pagination.dto'
import { Utils } from 'helpers/utils'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'prisma/prisma.service'

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async rateRider(
        targetUserId: string,
        { sub, role }: JwtDecoded,
        { point, review }: RatingDTO
    ) {
        const user = await this.prisma.user.findUnique({
            where: { id: targetUserId }
        })

        if (!user) {
            throw new NotFoundException("Target user not found")
        }

        if (user.role !== "DRIVER" || role !== "PASSENGER") {
            throw new BadRequestException("Only passenger can rate rider/driver")
        }

        return await this.prisma.rating.create({
            data: {
                point, review,
                rater: { connect: { id: sub } },
                target: { connect: { id: user.id } },
            }
        })
    }

    async fetchRatingAndReviews(
        userId: string,
        {
            point, search = '',
            limit = 20, page = 1,
        }: FetchRatingAndReviewsDTO
    ) {
        limit = Number(limit)
        const offset = (Number(page) - 1) * limit

        const ratingsCount = await this.prisma.rating.count({
            where: { targetUserId: userId }
        })

        const totalRatings = await Utils.getTotalRating(this.prisma, userId)

        const pointTypes = [
            {
                point: 1.0,
                label: 'ONE'
            },
            {
                point: 2.0,
                label: 'TWO'
            },
            {
                point: 3.0,
                label: 'THREE'
            },
            {
                point: 4.0,
                label: 'FOUR'
            },
            {
                point: 5.0,
                label: 'FIVE'
            },
        ]

        let chart: {
            label: string
            points: number
        }[] = []

        let total = 0

        for (const pointType of pointTypes) {
            const rating = await this.prisma.rating.aggregate({
                where: {
                    targetUserId: userId,
                    point: pointType.point
                },
                _sum: { point: true }
            })

            chart.push({
                label: pointType.label,
                points: rating._sum.point ?? 0
            })
            total += rating._sum.point ?? 0
        }

        const totalReviews = await this.prisma.rating.count({
            where: point ? {
                point,
                targetUserId: userId,
                OR: [
                    { review: { contains: search, mode: 'insensitive' } }
                ],
            } : {
                targetUserId: userId,
                OR: [
                    { review: { contains: search, mode: 'insensitive' } }
                ],
            },
        })

        const totalPages = Math.ceil(totalReviews / limit)
        const hasNext = page < totalPages
        const hasPrev = page > 1

        const reviews = await this.prisma.rating.findMany({
            where: {
                targetUserId: userId,
                ...(point && { point }),
                OR: [
                    { review: { contains: search, mode: 'insensitive' } }
                ],
            },
            select: {
                id: true,
                point: true,
                review: true,
                rater: {
                    select: {
                        lastname: true,
                        firstname: true,
                        profile: {
                            select: { avatar: true }
                        },
                    }
                },
            },
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' }
        })

        return {
            reviews,
            metadata: {
                totalPages,
                hasNext,
                hasPrev,
            },
            analytics: {
                chart,
                total,
                ratingsCount,
                totalRatings,
            },
        }
    }

    async deleteRating(ratingId: string) {
        const existingRating = await this.prisma.rating.findUnique({
            where: { id: ratingId },
        })

        if (!existingRating) {
            throw new NotFoundException("Review not found")
        }

        await this.prisma.rating.delete({
            where: { id: ratingId },
        })
    }

    async fetchUsers(
        {
            role,
            sortBy,
            page = 1,
            limit = 50,
            search = '',
        }: FetchUsersDTO,
        { role: authRole }: JwtDecoded,
    ) {
        page = Number(page)
        limit = Number(limit)

        if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
            throw new BadRequestException("Invalid pagination query")
        }

        const offset = (page - 1) * limit
        const SUPERIOR = authRole === "ADMIN" || authRole === "MODERATOR"

        let isAllowed: boolean

        if (SUPERIOR) {
            isAllowed = true
        } else if (authRole === "DRIVER" && role === "DRIVER") {
            isAllowed = false
        } else if (authRole === "PASSENGER") {
            isAllowed = true
        } else {
            isAllowed = false
        }

        if (!isAllowed) {
            throw new ForbiddenException("Forbidden Resource")
        }

        const whereClause = {
            role: role ? role : { in: ['PASSENGER', 'DRIVER'] },
            ...(!SUPERIOR && { status: 'ACTIVE' }),
            OR: [
                { firstname: { contains: search, mode: 'insensitive' } },
                { lastname: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                ...(search.length > 3 ? [{ phone: { equals: search } }] : []),
            ]
        } as Prisma.UserWhereInput

        let [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where: whereClause,
                take: limit,
                skip: offset,
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    lastname: true,
                    firstname: true,
                    status: true,
                    profile: {
                        select: {
                            avatar: true,
                            gender: true,
                            address: true,
                        }
                    },
                },
                orderBy: sortBy === "NAME" ? { firstname: 'desc' } : { createdAt: 'desc' },
            }),
            this.prisma.user.count({
                where: whereClause
            })
        ])

        const totalPage = Math.ceil(total / limit)
        const hasNext = page < totalPage
        const hasPrev = page > 1

        if (role === "DRIVER" || sortBy === "RATING") {
            users = await Promise.all(users.map(async (user) => {
                const totalVehicles = await this.prisma.vehicle.count({
                    where: { driverId: user.id }
                })

                const rating = await Utils.getTotalRating(this.prisma, user.id)

                return { ...user, totalVehicles, rating }
            }))

            if (sortBy === "RATING") {
                //@ts-ignore
                users.sort((a, b) => b.rating - a.rating)
            }
        }

        return {
            users,
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

    async fetchTxHistories(
        { sub, role }: JwtDecoded,
        {
            min,
            max,
            type,
            sortBy,
            status,
            reference,
            page = 1,
            limit = 50,
            search = '',
            endDate = '',
            startDate = '',
        }: FetchTxHistoriesDTO
    ) {
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

        const rangeFilter = {
            gte: min ? Number(min) : null,
            lte: max ? Number(max) : null,
        }

        const SUPERIOR = role === "ADMIN" || role === "MODERATOR"

        const whereClause = {
            amount: rangeFilter,
            createdAt: dateFilter,
            ...(type && { type }),
            ...(status && { status }),
            ...(reference && { reference }),
            ...(!SUPERIOR && { userId: sub }),
            ...(SUPERIOR && {
                OR: [
                    {
                        user: {
                            email: { contains: search, mode: 'insensitive' },
                            firstname: { contains: search, mode: 'insensitive' }
                        }
                    }
                ]
            })
        } as Prisma.TxHistoryWhereInput

        const [histories, total] = await Promise.all([
            this.prisma.txHistory.findMany({
                where: whereClause,
                orderBy: sortBy === "HIGHEST" ? { amount: 'desc' } : sortBy === "LOWEST" ? { amount: 'asc' } : { createdAt: 'desc' },
                take: limit,
                skip: offset,
                include: {
                    user: {
                        select: {
                            email: true,
                            phone: true,
                            lastname: true,
                            firstname: true,
                        }
                    }
                }
            }),
            this.prisma.txHistory.count({
                where: whereClause,
            })
        ])

        const totalPage = Math.ceil(total / limit)
        const hasNext = page < totalPage
        const hasPrev = page > 1

        return {
            histories,
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

    async fetchTxHistory(id: string, { sub, role }: JwtDecoded) {
        const history = await this.prisma.txHistory.findFirst({
            where: (role === "ADMIN" || role === "MODERATOR") ? {
                OR: [
                    { id },
                    { reference: id }
                ]
            } : {
                OR: [
                    { id },
                    { reference: id }
                ],
                userId: sub,
            },
            include: {
                user: {
                    select: {
                        email: true,
                        phone: true,
                        lastname: true,
                        firstname: true,
                    }
                }
            }
        })

        if (!history) {
            throw new NotFoundException("Transaction History not found")
        }

        return history
    }

    async fetchWithdrawalRequests(
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

        const rangeFilter = {
            gte: min ? Number(min) : null,
            lte: max ? Number(max) : null,
        }

        const SUPERIOR = role === "ADMIN" || role === "MODERATOR"

        const whereClause = {
            amount: rangeFilter,
            createdAt: dateFilter,
            ...(status && { status }),
            ...(!SUPERIOR && { userId: sub }),
            ...(SUPERIOR && {
                OR: [
                    {
                        wallet: {
                            user: {
                                email: { contains: search, mode: 'insensitive' },
                                firstname: { contains: search, mode: 'insensitive' }
                            }
                        }
                    }
                ]
            })
        } as Prisma.WithdrwalRequestWhereInput

        const [histories, total] = await Promise.all([
            this.prisma.withdrwalRequest.findMany({
                where: whereClause,
                orderBy: sortBy === "HIGHEST" ? { amount: 'desc' } : sortBy === "LOWEST" ? { amount: 'asc' } : { createdAt: 'desc' },
                take: limit,
                skip: offset,
                include: {
                    wallet: {
                        select: {
                            balance: true,
                            lastApprovedAt: true,
                            lastRequestedAt: true,
                            lastApprovedAmount: true,
                        }
                    }
                }
            }),
            this.prisma.withdrwalRequest.count({
                where: whereClause,
            })
        ])

        const totalPage = Math.ceil(total / limit)
        const hasNext = page < totalPage
        const hasPrev = page > 1

        return {
            histories,
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
}
