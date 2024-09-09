import { Module } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AppService } from './app.service'
import { HttpModule } from '@nestjs/axios'
import { BullModule } from '@nestjs/bullmq'
import { config } from 'configs/env.config'
import { ConfigModule } from '@nestjs/config'
import { ApiModule } from 'src/api/api.module'
import { MiscService } from 'libs/misc.service'
import { AppController } from './app.controller'
import { AuthModule } from 'src/auth/auth.module'
import { UsersModule } from 'src/users/users.module'
import { QueueModule } from 'src/queue/queue.module'
import { StoreModule } from 'src/store/store.module'
import { PrismaService } from 'prisma/prisma.service'
import { DriverModule } from 'src/driver/driver.module'
import { WalletModule } from 'src/wallet/wallet.module'
import { ModminModule } from 'src/modmin/modmin.module'
import { ResponseService } from 'libs/response.service'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { RealtimeModule } from 'src/realtime/realtime.module'
import cloudinaryConfig from 'src/cloudinary/cloudinary.config'
import { AnalyticsModule } from 'src/analytics/analytics.module'
import { NotificationModule } from 'src/notification/notification.module'

@Module({
  imports: [
    ApiModule,
    AuthModule,
    HttpModule,
    UsersModule,
    QueueModule,
    StoreModule,
    DriverModule,
    WalletModule,
    ModminModule,
    RealtimeModule,
    AnalyticsModule,
    NotificationModule,
    ConfigModule.forRoot({
      load: [cloudinaryConfig],
    }),
    EventEmitterModule.forRoot({ global: true }),
    BullModule.forRoot({
      connection: {
        host: config.redis.host,
        port: config.redis.port,
        db: config.redis.database,
        password: config.redis.password,
        ...(config.redis.username && {
          username: config.redis.username,
        }),
      }
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtService,
    MiscService,
    PrismaService,
    ResponseService,
  ],
  exports: [AppService]
})
export class AppModule { }