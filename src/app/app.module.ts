import { Module } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AppService } from './app.service'
import { HttpModule } from '@nestjs/axios'
import { config } from 'configs/env.config'
import { ConfigModule } from '@nestjs/config'
import { ApiModule } from 'src/api/api.module'
import { MiscService } from 'libs/misc.service'
import { AppController } from './app.controller'
import { AuthModule } from 'src/auth/auth.module'
import { UserModule } from 'src/user/user.module'
import { PrismaService } from 'prisma/prisma.service'
import { MailerModule } from '@nestjs-modules/mailer'
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
    UserModule,
    HttpModule,
    DriverModule,
    WalletModule,
    ModminModule,
    RealtimeModule,
    AnalyticsModule,
    NotificationModule,
    ConfigModule.forRoot({
      load: [cloudinaryConfig],
    }),
    MailerModule.forRoot({
      transport: {
        host: 'smtp.gmail.com',
        // port: 587, // 465
        secure: true,
        service: 'gmail',
        requireTLS: true,
        auth: {
          user: config.google.email,
          pass: config.google.emailPassword,
        },
      },
      defaults: {
        from: `No Reply`,
      },
    }),
    EventEmitterModule.forRoot({ global: true })
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
export class AppModule { }