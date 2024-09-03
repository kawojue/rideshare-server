import {
    CreateSmsNotificationEvent,
    CreatePushNotificationEvent,
    CreateEmailNotificationEvent,
} from './notification.event'
import { Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { NotificationService } from './notification.service'

@Injectable()
export class NotificationListener {
    constructor(private service: NotificationService) { }

    @OnEvent('notification.push')
    async sendPushNotification(event: CreatePushNotificationEvent) {
        await this.service.sendPushNotification(event)
    }

    @OnEvent('notification.email')
    async sendEmail(event: CreateEmailNotificationEvent) {
        await this.service.sendEmailNotification(event)
    }

    @OnEvent('notification.sms')
    async sendSms(event: CreateSmsNotificationEvent) {
        await this.service.sendSmsNotification(event)
    }
}