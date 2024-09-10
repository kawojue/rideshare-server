
import { Job } from 'bullmq'
import {
    CreatePushNotificationEvent,
    CreateInAppNotificationEvent,
    CreateEmailNotificationEvent,
} from 'src/notification/notification.event'
import { TransferStatus } from '@prisma/client'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { PrismaService } from 'prisma/prisma.service'
import { Processor, WorkerHost } from '@nestjs/bullmq'

@Processor('transfer-queue')
export class ChargeSuccess extends WorkerHost {
    constructor(
        private readonly event: EventEmitter2,
        private readonly prisma: PrismaService,
    ) {
        super()
    }

    async process({ name, data }: Job<{ data: TransferEventData }>) {
        switch (name) {
            case 'transfer.success':

                break
            case 'transfer.failed':
            case 'transfer.reversed':

                break

            default:
                break
        }
    }

    private async getTransaction(reference: string) {
        return await this.prisma.txHistory.findUnique({
            where: { reference }
        })
    }

    private async updateTransactionStatus(reference: string, status: TransferStatus, reversed?: boolean) {
        return await this.prisma.txHistory.update({
            where: { reference },
            data: { status, reversed }
        })
    }

    private calculateTotalAmount(amount: number, totalFee: number) {
        const KOBO = 100 as const
        return (amount / KOBO) + totalFee
    }

    private async updateUserBalance(userId: string, amount: number, action: 'increment' | 'decrement') {
        return await this.prisma.wallet.update({
            where: { userId },
            data: { balance: { [action]: amount } }
        })
    }
}