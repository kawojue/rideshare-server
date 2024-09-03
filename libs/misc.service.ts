import { JwtService } from '@nestjs/jwt'
import { config } from 'configs/env.config'
import { Injectable, InternalServerErrorException } from '@nestjs/common'

@Injectable()
export class MiscService {
    constructor(private readonly jwtService: JwtService) { }

    async generateAccessToken({ sub, role, status }: JwtPayload): Promise<string> {
        return await this.jwtService.signAsync({ sub, role, status }, {
            expiresIn: '1d',
            secret: config.jwt.secret
        })
    }

    async generateRefreshToken({ sub, role, status }: JwtPayload): Promise<string> {
        return await this.jwtService.signAsync({ sub, role, status }, {
            expiresIn: '120d',
            secret: config.jwt.secret
        })
    }

    async generateNewAccessToken(refreshToken: string): Promise<string> {
        try {
            const decoded = await this.jwtService.verifyAsync(refreshToken, {
                secret: config.jwt.secret,
                ignoreExpiration: false,
            }) as JwtDecoded

            return await this.generateAccessToken(decoded)
        } catch (err) {
            throw new InternalServerErrorException(err.message)
        }
    }
}