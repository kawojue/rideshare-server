import { Response } from 'express'
import { JwtService } from '@nestjs/jwt'
import { StatusCodes } from 'enums/statusCodes'
import { ResponseService } from './response.service'
import { ForbiddenException, Injectable } from '@nestjs/common'

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

    async generateAccessToken({ sub, role, status }: JwtPayload): Promise<string> {
        return await this.jwtService.signAsync({ sub, role, status }, {
            expiresIn: '10m',
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
            const decoded = this.jwtService.verify(refreshToken, {
                secret: process.env.JWT_SECRET,
            })

            const expiry = decoded.exp

            if ((Date.now() / 1000) > expiry) {
                throw new ForbiddenException("Refresh token has expired")
            }

            return await this.generateAccessToken(decoded)
        } catch (err) {
            throw err
        }
    }
}