import { Request } from 'express'
import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const GetAuthParam = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest<Request>()
        return request.user as JwtDecoded
    },
)