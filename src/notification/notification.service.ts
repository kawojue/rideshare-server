import {
    CreateSmsNotificationEvent,
    CreatePushNotificationEvent,
    CreateEmailNotificationEvent,
    CreateInAppNotificationEvent,
} from './notification.event'
import * as admin from 'firebase-admin'
import { Injectable } from '@nestjs/common'
import { config } from 'configs/env.config'
import { ApiService } from 'src/api/api.service'
import { PrismaService } from 'prisma/prisma.service'
import { MailerService } from '@nestjs-modules/mailer'
import { getMessaging } from 'firebase-admin/messaging'
import { loadTemplate, render } from 'src/templates/render'

@Injectable()
export class NotificationService {
    constructor(
        private readonly api: ApiService,
        private readonly mail: MailerService,
        private readonly prisma: PrismaService,
    ) {
        if (config.google.serviceAccountKey) {
            const key: admin.ServiceAccount = JSON.parse(
                atob(config.google.serviceAccountKey),
            )

            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert(
                        key as admin.ServiceAccount,
                    ),
                })
            }
        }
    }

    async sendPushNotification({ userId, title, body }: CreatePushNotificationEvent) {
        const mobileDevices = await this.prisma.mobileDevice.findMany({
            where: {
                ...(userId && { userId }),
                notificationToken: { not: null }
            },
            select: { notificationToken: true },
            orderBy: { lastLoggedInAt: 'desc' },
        })

        for (const { notificationToken } of mobileDevices) {
            await getMessaging().send({
                notification: { body, title },
                token: notificationToken
            })
        }
    }

    async sendEmailNotification(event: CreateEmailNotificationEvent) {
        const template = event?.dynamic
            ? event.template
            : loadTemplate(event.template)

        const html = event?.dynamic ? event.template : render(template, event.data)

        await this.mail.sendMail({
            to: event.emails,
            html,
            from: event.from,
            subject: event.subject,
            attachments: Array.isArray(event.attachments) ? event.attachments : Array.of(event.attachments)
        })
    }

    async sendSmsNotification({ message, phone }: CreateSmsNotificationEvent) {
        const params = new URLSearchParams()

        params.append('to', phone)
        params.append('message', message)
        params.append('from', config.africasTalking.shortCode)
        params.append('username', config.africasTalking.username)

        await this.api.POST<AfricasTalkingResponse>(`${config.africasTalking.baseUrl}/messaging?${params.toString()}`, {}, {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        })
    }

    async sendInAppNotification({ body, topic, title, userId }: CreateInAppNotificationEvent) {
        await this.prisma.notification.create({
            data: {
                title, topic, body,
                ...(userId && { userId })
            }
        })
    }
}