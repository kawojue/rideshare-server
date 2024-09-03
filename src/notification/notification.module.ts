import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ApiModule } from 'src/api/api.module'
import { MailerService } from '@nestjs-modules/mailer'
import { NotificationService } from './notification.service'
import { NotificationListener } from './notification.listener'

@Module({
    providers: [
        ApiModule,
        HttpModule,
        MailerService,
        NotificationService,
        NotificationListener,
    ],
    exports: [NotificationService]
})
export class NotificationModule { }