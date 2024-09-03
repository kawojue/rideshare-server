import { Request } from 'express'
import { JwtService } from '@nestjs/jwt'
import {
    Injectable,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common'
import { config } from 'configs/env.config'
import { AuthGuard } from '@nestjs/passport'
import { PrismaService } from 'prisma/prisma.service'

@Injectable()
export class OnboardingGuard extends AuthGuard('jwt') {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) {
        super()
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const ctx = context.switchToHttp()
        const request = ctx.getRequest<Request>()

        const result = (await super.canActivate(context)) as boolean
        if (!result) {
            return false
        }

        const cookieToken = request.cookies?.access_token
        const authHeader = request.headers.authorization
        const bearerToken = authHeader?.startsWith('Bearer ')
            ? authHeader.substring(7)
            : null

        const access_token = cookieToken || bearerToken
        if (!access_token) return false

        try {
            const decoded = await this.jwtService.verifyAsync(access_token, {
                secret: config.jwt.secret,
                ignoreExpiration: false,
            })

            const user = await this.prisma.user.findUnique({
                where: { id: decoded.sub, status: decoded.status },
            })

            if (!user) {
                return false
            }

            request.user = decoded
            return true
        } catch {
            throw new UnauthorizedException()
        }
    }

    handleRequest(err: any, user: any, info: any) {
        if (err || !user) {
            throw err || new UnauthorizedException()
        }
        return user
    }
}