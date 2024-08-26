import {
    Injectable,
    NestMiddleware,
    UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { NextFunction, Request, Response } from 'express'

@Injectable()
export class CustomAuthMiddleware implements NestMiddleware {
    constructor(private readonly jwtService: JwtService) { }

    private async validateAndDecodeToken(token: string) {
        try {
            return await this.jwtService.verifyAsync(token, {
                ignoreExpiration: false,
                secret: process.env.JWT_SECRET,
            })
        } catch {
            return null
        }
    }

    async use(req: Request, res: Response, next: NextFunction) {
        let token: string | undefined

        const authHeader = req.headers.authorization
        const cookieToken = req.cookies?.access_token

        if (cookieToken) {
            token = cookieToken
        } else if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1]
        }

        if (token) {
            const decodedToken = await this.validateAndDecodeToken(token)
            if (decodedToken) {
                req.user = decodedToken
            } else {
                throw new UnauthorizedException('Invalid or expired token')
            }
        }

        next()
    }
}