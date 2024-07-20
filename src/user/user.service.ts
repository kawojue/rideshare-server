import { Response } from 'express'
import { Injectable } from '@nestjs/common'
import { StatusCodes } from 'enums/statusCodes'
import { MiscService } from 'libs/misc.service'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'libs/response.service'
import { FetchRatingAndReviewsDTO, RatingDTO } from './dto/rate.dto'

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
}
