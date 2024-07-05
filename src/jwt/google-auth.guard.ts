import { AuthGuard } from '@nestjs/passport'
import {
    Injectable, ExecutionContext, UnauthorizedException
} from '@nestjs/common'

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
    canActivate(context: ExecutionContext) {
        return super.canActivate(context)
    }

    handleRequest(err: any, user: any, info: any) {
        if (err || !user) {
            throw err || new UnauthorizedException()
        }
        return user
    }
}
