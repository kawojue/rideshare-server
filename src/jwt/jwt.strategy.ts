import { Request } from 'express'
import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request: Request) => {
                    const cookieToken = request.cookies?.access_token
                    const authHeader = request.headers.authorization
                    const bearerToken = authHeader?.startsWith('Bearer ')
                        ? authHeader.substring(7)
                        : null

                    return cookieToken || bearerToken
                }
            ]),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET,
        })
    }

    async validate(payload: any) {
        return payload
    }
}