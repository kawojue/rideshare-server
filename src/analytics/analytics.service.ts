import { Response } from 'express'
import { Injectable } from '@nestjs/common'
import { MiscService } from 'libs/misc.service'
import { StatusCodes } from 'enums/statusCodes'
import { UsersAnalyticsDTO } from './dto/index.dto'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'libs/response.service'

@Injectable()
export class AnalyticsService {
    constructor(
        private readonly misc: MiscService,
        private readonly prisma: PrismaService,
        private readonly response: ResponseService,
    ) { }

    async users(
        res: Response,
        { role, q }: UsersAnalyticsDTO,
    ) {
        try {
            let total = 0
            const currentYear = new Date().getFullYear()
            let labels = [
                'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
            ]

            const chart: { label: string; count: string }[] = []

            if (q === "weekdays") {
                labels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
                const today = new Date()
                const startOfWeek = today.getDate() - today.getDay() + 1
                for (let i = 0; i < 7; i++) {
                    const startDate = new Date(today.setDate(startOfWeek + i))
                    const endDate = new Date(today.setDate(startOfWeek + i + 1))

                    const count = await this.prisma.user.count({
                        where: {
                            role: role ? role : { in: ['PASSENGER', 'DRIVER'] },
                            createdAt: {
                                gte: startDate,
                                lt: endDate
                            }
                        }
                    })
                    chart.push({ label: labels[i], count: count.toString() })
                    total += count
                }
            } else {
                for (let i = 0; i < labels.length; i++) {
                    const startDate = new Date(currentYear, i, 1)
                    const endDate = new Date(currentYear, i + 1, 1)

                    const count = await this.prisma.user.count({
                        where: {
                            role: role ? role : { in: ['PASSENGER', 'DRIVER'] },
                            createdAt: {
                                gte: startDate,
                                lt: endDate
                            }
                        }
                    })

                    chart.push({ label: labels[i], count: count.toString() })
                    total += count
                }
            }

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: { chart, total }
            })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error caching chart")
        }
    }
}
