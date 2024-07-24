import { Response } from 'express'
import { Injectable } from '@nestjs/common'
import { StatusCodes } from 'enums/statusCodes'
import { MiscService } from 'libs/misc.service'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'libs/response.service'
import { normalizePhoneNumber } from 'helpers/generators'
import { FetchRatingAndReviewsDTO, RatingDTO } from './dto/rate.dto'
import { FetchTxHistoryDTO, FetchUsersDTO } from 'src/app/dto/pagination.dto'

@Injectable()
export class UserService {
    constructor(
        private readonly misc: MiscService,
        private readonly prisma: PrismaService,
        private readonly response: ResponseService,
    ) { }

    async rateRider(
        res: Response,
        targetUserId: string,
        { sub, role }: ExpressUser,
        { point, review }: RatingDTO
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: targetUserId }
            })

            if (!user) {
                return this.response.sendError(res, StatusCodes.NotFound, "Target user not found")
            }

            if (user.role !== "DRIVER" || role !== "PASSENGER") {
                return this.response.sendError(res, StatusCodes.BadRequest, "Only passenger can rate driver")
            }

            const rating = await this.prisma.rating.create({
                data: {
                    point, review,
                    rater: { connect: { id: sub } },
                    target: { connect: { id: user.id } },
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: rating })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async fetchRatingAndReviews(
        res: Response,
        userId: string,
        {
            point, search = '',
            limit = 200, page = 1,
        }: FetchRatingAndReviewsDTO
    ) {
        try {
            limit = Number(limit)
            const offset = (Number(page) - 1) * limit

            console.log(point)

            const ratingsCount = await this.prisma.rating.count({
                where: { targetUserId: userId }
            })

            const totalRatings = await this.prisma.getTotalRating(userId)

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

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: {
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
                },
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async deleteRating(
        res: Response,
        ratingId: string,
    ) {
        try {
            const existingRating = await this.prisma.rating.findUnique({
                where: { id: ratingId },
            })

            if (!existingRating) {
                return this.response.sendError(res, StatusCodes.NotFound, "Rating not found")
            }

            const rating = await this.prisma.rating.delete({
                where: { id: ratingId },
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: rating,
                message: "Rating deleted successfully"
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async fetchUsers(
        res: Response,
        {
            role,
            sortBy,
            page = 1,
            limit = 50,
            search = '',
        }: FetchUsersDTO,
        { role: authRole }: ExpressUser,
    ) {
        try {
            page = Number(page)
            limit = Number(limit)

            if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
                return this.response.sendError(res, StatusCodes.BadRequest, "Invalid pagination query")
            }

            const offset = (page - 1) * limit

            let isAllowed: boolean

            if (authRole === "ADMIN" || authRole === "MODERATOR") {
                isAllowed = true
            } else if (authRole === "DRIVER" && role === "DRIVER") {
                isAllowed = false
            } else if (authRole === "PASSENGER") {
                isAllowed = true
            } else {
                isAllowed = false
            }

            if (!isAllowed) {
                return this.response.sendError(res, StatusCodes.Forbidden, "Forbidden Resource")
            }

            let [users, total] = await Promise.all([
                this.prisma.user.findMany({
                    where: {
                        role: role ? role : { in: ['PASSENGER', 'DRIVER'] },
                        OR: [
                            { firstname: { contains: search, mode: 'insensitive' } },
                            { lastname: { contains: search, mode: 'insensitive' } },
                            { email: { contains: search, mode: 'insensitive' } },
                            { phone: { equals: normalizePhoneNumber(search) } },
                        ]
                    },
                    take: limit,
                    skip: offset,
                    select: {
                        id: true,
                        email: true,
                        phone: true,
                        lastname: true,
                        firstname: true,
                        createdAt: true,
                        middlename: true,
                        profile: {
                            select: {
                                avatar: true,
                                gender: true,
                                address: true,
                                email_verified: true,
                            }
                        },
                        role: true,
                        status: true,
                    },
                    orderBy: sortBy === "NAME" ? { firstname: 'desc' } : { createdAt: 'desc' },
                }),
                this.prisma.user.count({
                    where: {
                        role: role ? role : { in: ['PASSENGER', 'DRIVER'] },
                        OR: [
                            { firstname: { contains: search, mode: 'insensitive' } },
                            { lastname: { contains: search, mode: 'insensitive' } },
                            { email: { contains: search, mode: 'insensitive' } },
                            { phone: { equals: normalizePhoneNumber(search) } },
                        ]
                    }
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

                    const rating = await this.prisma.getTotalRating(user.id)

                    return { ...user, totalVehicles, rating }
                }))

                if (sortBy === "RATING") {
                    // @ts-ignore
                    users.sort((a, b) => b.rating - a.rating)
                }
            }

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: users,
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

    async fetchTxHistories(
        res: Response,
        { sub, role }: ExpressUser,
        {
            min,
            max,
            type,
            sortBy,
            status,
            page = 1,
            limit = 50,
            search = '',
            endDate = '',
            startDate = '',
        }: FetchTxHistoryDTO
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
                this.prisma.txHistory.findMany({
                    where: {
                        userId: (role === "ADMIN" || role === "MODERATOR") ? undefined : sub,
                        amount: rangeFilter,
                        createdAt: dateFilter,
                        type: type || undefined,
                        status: status || undefined,
                        OR: [
                            { user: { firstname: { contains: search, mode: 'insensitive' } } },
                            { user: { email: { contains: search, mode: 'insensitive' } } },
                        ]
                    },
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
                    where: {
                        userId: (role === "ADMIN" || role === "MODERATOR") ? undefined : sub,
                        amount: rangeFilter,
                        createdAt: dateFilter,
                        type: type || undefined,
                        status: status || undefined,
                        OR: [
                            { user: { firstname: { contains: search, mode: 'insensitive' } } },
                            { user: { email: { contains: search, mode: 'insensitive' } } },
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

    async fetchTxHistory(
        res: Response,
        historyId: string,
        { sub, role }: ExpressUser,
    ) {
        const history = await this.prisma.txHistory.findUnique({
            where: (role === "ADMIN" || role === "MODERATOR") ? {
                id: historyId
            } : {
                id: historyId,
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
            return this.response.sendError(res, StatusCodes.NotFound, "Transaction History not found")
        }

        this.response.sendSuccess(res, StatusCodes.OK, { data: history })
    }
}
