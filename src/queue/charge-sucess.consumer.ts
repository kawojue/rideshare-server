
import { Job } from 'bullmq'
import { config } from 'configs/env.config'
import {
    CreatePushNotificationEvent,
    CreateInAppNotificationEvent,
    CreateEmailNotificationEvent,
} from 'src/notification/notification.event'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { PrismaService } from 'prisma/prisma.service'
import { Processor, WorkerHost } from '@nestjs/bullmq'

@Processor('charge.success-queue')
export class ChargeSuccess extends WorkerHost {
    constructor(
        private readonly event: EventEmitter2,
        private readonly prisma: PrismaService,
    ) {
        super()
    }

    async process({ data }: Job) {

    }
}