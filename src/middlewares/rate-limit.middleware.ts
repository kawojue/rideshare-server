import { getIPAddress } from 'helpers/getIPAddress'
import { NextFunction, Request, Response } from 'express'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { HttpException, Injectable, NestMiddleware } from '@nestjs/common'

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
    private rateLimiter = new RateLimiterMemory({
        points: 30,
        duration: 60,
    })

    async use(req: Request, res: Response, next: NextFunction) {
        const remoteAddr = getIPAddress(req)

        try {
            await this.rateLimiter.consume(remoteAddr)
        } catch (err) {
            console.error(err)
            throw new HttpException('Too Many Requests', 429)
        }

        next()
    }
}