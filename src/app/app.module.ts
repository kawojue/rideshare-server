import { JwtService } from '@nestjs/jwt'
import { AppService } from './app.service'
import { ConfigModule } from '@nestjs/config'
import { MiscService } from 'libs/misc.service'
import { AuthModule } from '../auth/auth.module'
import { UserModule } from '../user/user.module'
import { AppController } from './app.controller'
import { PrismaService } from 'prisma/prisma.service'
import { DriverModule } from '../driver/driver.module'
import { WalletModule } from '../wallet/wallet.module'
import { ModminModule } from '../modmin/modmin.module'
import { ResponseService } from 'libs/response.service'
import { RealtimeModule } from '../realtime/realtime.module'
import cloudinaryConfig from '../cloudinary/cloudinary.config'
import { AnalyticsModule } from 'src/analytics/analytics.module'
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { RateLimiterMiddleware } from '../middlewares/rate-limit.middleware'

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [cloudinaryConfig],
    }),
    AuthModule,
    UserModule,
    DriverModule,
    WalletModule,
    ModminModule,
    RealtimeModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtService,
    MiscService,
    PrismaService,
    ResponseService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RateLimiterMiddleware)
      .forRoutes('*')
  }
}