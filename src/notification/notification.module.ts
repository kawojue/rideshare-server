import { Module } from '@nestjs/common';
import { config } from 'configs/env.config';
import { ApiModule } from 'src/api/api.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { NotificationService } from './notification.service';
import { NotificationListener } from './notification.listener';

@Module({
  imports: [
    ApiModule,
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
    }),
  ],
  providers: [NotificationService, NotificationListener],
  exports: [NotificationService],
})
export class NotificationModule {}
