import { Response } from 'express'
import { JwtService } from '@nestjs/jwt'
import { Injectable } from '@nestjs/common'
import { StatusCodes } from 'enums/statusCodes'
import { ResponseService } from './response.service'

@Injectable()
export class MiscService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly response: ResponseService,
    ) { }

    handleServerError(res: Response, err?: any, msg?: string) {
        console.error(err)
        return this.response.sendError(res, StatusCodes.InternalServerError, msg || err?.message || 'Something went wrong')
    }

    handlePaystackAndServerError(res: Response, err: any) {
        if (err.response?.message) {
            console.error(err)
            this.response.sendError(res, err.status, err.response.message)
        } else {
            this.handleServerError(res, err)
        }
    }

    async generateAccessToken({ sub, role, status }: JwtPayload): Promise<string> {
        return await this.jwtService.signAsync({ sub, role, status }, {
            expiresIn: '30m',
            secret: process.env.JWT_SECRET,
        })
    }

    async generateRefreshToken({ sub, role, status }: JwtPayload): Promise<string> {
        return await this.jwtService.signAsync({ sub, role, status }, {
            expiresIn: '60d',
            secret: process.env.JWT_SECRET,
        })
    }

    async generateNewAccessToken(refreshToken: string): Promise<string> {
        try {
            const decoded = await this.jwtService.verifyAsync(refreshToken, {
                secret: process.env.JWT_SECRET,
                ignoreExpiration: false,
            }) as JwtDecoded

            return await this.generateAccessToken(decoded)
        } catch (err) {
            throw err
        }
    }

    async calculateFees(amount: number): Promise<Fee> {
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
}