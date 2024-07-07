import { Role } from '@prisma/client'
import { JwtService } from '@nestjs/jwt'
import { Reflector } from '@nestjs/core'
import {
    Injectable, UnauthorizedException,
    ExecutionContext, ForbiddenException
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { PrismaService } from 'prisma/prisma.service'

@Injectable()
export class JwtRoleAuthGuard extends AuthGuard('jwt') {
    constructor(
        private readonly reflector: Reflector,
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) {
        super()
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const ctx = context.switchToHttp()
        const request = ctx.getRequest()

        const result = (await super.canActivate(context)) as boolean
        if (!result) {
            return false
        }

        const access_token = request.headers.authorization?.split('Bearer ')[1]
        if (!access_token) return false

        try {
            const decoded = await this.jwtService.verifyAsync(access_token, {
                secret: process.env.JWT_SECRET!,
                ignoreExpiration: false,
            })

            const userOrAdmin = await (this.prisma[
                (decoded.role === 'ADMIN' || decoded.role === 'MODERATOR') ? 'modmin' : 'user'
            ] as any).findFirst({
                where: { id: decoded.sub, status: decoded.status },
            })

            if (!userOrAdmin) {
                return false
            }

            request.user = decoded

            const requiredRoles = this.reflector.get<Role[]>('roles', context.getHandler())
            if (!requiredRoles) {
                return true
            }

            if (!requiredRoles.includes(decoded.role)) {
                throw new ForbiddenException('You do not have the required role to access this resource')
            }

            return true
        } catch (err) {
            console.error(err)
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