import { config } from 'configs/env.config'
import { PrismaClient } from '@prisma/client'
import { BadRequestException } from '@nestjs/common'
import { parsePhoneNumber } from 'awesome-phonenumber'

const { isValidPhoneNumber } = require('libphonenumber-js')

export class Utils {
    static normalizePhoneNumber(phoneNumber: string) {
        const trimmed = phoneNumber.replace(/ /g, '')

        const isValid = isValidPhoneNumber(trimmed)
        if (!isValid) {
            throw new BadRequestException("Invalid Phone number")
        }

        const pn = parsePhoneNumber(trimmed)

        if (pn.regionCode !== "NG") {
            throw new BadRequestException("Only NG is allowed")
        }

        return {
            regionCode: pn.regionCode,
            countryCode: `+${pn.countryCode}`,
            significant: pn.number.significant,
        }
    }

    static titleText(text: string): string {
        return text.trim()
            .split(" ")
            .map(txt => txt[0].toUpperCase() + txt.slice(1).toLowerCase())
            .join(" ")
    }

    static toLowerCase(text: string) {
        return text.toLowerCase().trim()
    }

    static toUpperCase(text: string) {
        return text.toUpperCase().trim()
    }

    static sanitizeData<T>(data: T, skipFieldNames: Array<keyof T>) {
        const removeFields = (obj: any) => {
            for (const key of skipFieldNames) {
                if (key in obj) {
                    delete obj[key]
                }
            }

            for (const key in obj) {
                if (obj[key] && typeof obj[key] === 'object') {
                    removeFields(obj[key])
                }
            }
        }

        removeFields(data)
    }

    static removeNullFields<T>(obj: T | T[]) {
        if (Array.isArray(obj)) {
            return obj.map(this.removeNullFields)
        } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
            return Object.keys(obj).reduce((acc, key) => {
                const value = obj[key]
                if (value !== null) {
                    acc[key] = this.removeNullFields(value)
                }
                return acc
            }, {} as { [key: string]: any })
        } else {
            return obj
        }
    }

    static formatDate(date: Date | string, format: 'YYYY-MM-DD' | 'DD-MM-YYYY' | 'MM-DD-YYYY') {
        const d = new Date(date)
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')

        switch (format) {
            case 'YYYY-MM-DD':
                return `${year}-${month}-${day}`
            case 'DD-MM-YYYY':
                return `${day}-${month}-${year}`
            case 'MM-DD-YYYY':
                return `${month}-${day}-${year}`
            default:
                throw new Error('Invalid date format')
        }
    }

    static formatDuration(seconds: number | null) {
        if (seconds === null) return null

        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = Math.floor(seconds % 60)

        const hStr = h > 0 ? `${h}h` : ''
        const mStr = m > 0 ? `${m}m` : ''
        const sStr = s > 0 ? `${s}s` : ''

        return `${hStr} ${mStr} ${sStr}`.trim()
    }

    static generateRandomDigits(length: number): string {
        let num: string = ''
        const digits: string = '0123456789'
        for (let i = 0; i < length; i++) {
            num += digits[Math.floor(Math.random() * length)]
        }

        return num
    }

    static generateOTP(length: number = 4): IGenOTP {
        const now: Date = new Date()
        const totp_expiry: Date = new Date(
            now.setMinutes(now.getMinutes() + 10)
        )

        let payload = {
            totp_expiry,
            count: 0,
            max: 3
        } as IGenOTP

        if (config.env === 'live') {
            payload.otp = this.generateRandomDigits(length)
        } else {
            payload.otp = '0'.repeat(length)
        }

        return payload
    }

    static calculateFees(amount: number): Fee {
        const processingFee = 15
        let paystackFee: number

        if (amount <= 5_000) {
            paystackFee = 10
        } else {
            paystackFee = amount <= 50_000 ? 25 : 50
        }

        const totalFee = processingFee + paystackFee

        return { processingFee, paystackFee, totalFee }
    }

    static replaceSpaces(text: string, delimiter: string = "") {
        return text.replace(/\s+/g, delimiter)
    }

    static async getTotalRating(prisma: PrismaClient, userId: string) {
        const ratings = await prisma.rating.findMany({
            where: { targetUserId: userId },
            select: { point: true }
        })

        if (ratings.length === 0) return 0

        const totalRating = ratings.reduce((sum, rating) => sum + rating.point, 0)
        const averageRating = totalRating / ratings.length

        const scaledRating = (averageRating / 5) * 4 + 1

        return scaledRating
    }

    static paginateHelper(totalItems: number, currentPage: number, limit: number) {
        const totalPages = Math.ceil(totalItems / limit)
        const hasNext = currentPage < totalPages
        const hasPrev = currentPage > 1

        return {
            totalItems,
            totalPages,
            currentPage,
            nextPage: hasNext ? currentPage + 1 : null,
            previousPage: hasPrev ? currentPage - 1 : null,
            hasNext,
            hasPrev,
        }
    }
}