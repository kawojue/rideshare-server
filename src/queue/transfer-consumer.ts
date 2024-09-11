import { Job } from 'bullmq'
import { Mutex } from 'async-mutex'
import { Utils } from 'helpers/utils'
import {
    CreateSmsNotificationEvent,
    CreatePushNotificationEvent,
    CreateInAppNotificationEvent,
    CreateEmailNotificationEvent,
} from 'src/notification/notification.event'
import { TransferStatus } from '@prisma/client'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { PrismaService } from 'prisma/prisma.service'
import { Processor, WorkerHost } from '@nestjs/bullmq'
import { StoreService } from 'src/store/store.service'

@Processor('transfer-queue')
export class TransferConsumer extends WorkerHost {
    constructor(
        private readonly store: StoreService,
        private readonly event: EventEmitter2,
        private readonly prisma: PrismaService,
    ) {
        super()
    }

    async process({ name, data }: Job<TransferEventData>) {
        const reference = data.reference
        const status = Utils.toUpperCase(data.status) as TransferStatus

        const transaction = await this.getTransaction(reference)

        let reverseNeeded = false

        if (transaction && transaction.status !== status) {
            switch (name) {
                case 'transfer.success':
                    await this.updateTransactionStatus(reference, status)
                    await this.emitSuccessNotifications(transaction, transaction.amount.toNumber())
                    break
                case 'transfer.reversed':
                case 'transfer.failed':
                    await this.updateTransactionStatus(reference, status)
                    reverseNeeded = true
                    break

                default:
                    break
            }
        }

        if (reverseNeeded) {
            const amount = this.calculateTotalAmount(data.amount, +transaction.totalFee)
            await this.updateUserBalance(transaction.userId, amount)

            await this.emitReversalNotifications(
                transaction.userId,
                transaction.reference,
                amount,
                transaction.user.phone
            )
        }
    }

    private async emitSuccessNotifications(transaction: any, amount: number) {
        this.event.emit(
            'notification.in-app',
            new CreateInAppNotificationEvent({
                userId: transaction.userId,
                topic: 'TRANSACTIONS',
                title: 'Transaction Reversed',
                body: `Your transaction ${transaction.reference} has been reversed.`,
            })
        )

        this.event.emit(
            'notification.push',
            new CreatePushNotificationEvent({
                body: `₦${amount} was Reversed. Create a new Withdrawal Request.`,
                userId: transaction.userId,
                title: 'Transfer was Reversed'
            })
        )

        this.event.emit(
            'notification.email',
            new CreateEmailNotificationEvent({
                template: 'TransferSuccessful',
                emails: transaction.user.email,
                subject: 'Transfer Successful',
                data: {

                }
            })
        )
    }

    private async emitReversalNotifications(userId: string, reference: string, amount: number, phone: string) {
        this.event.emit(
            'notification.push',
            new CreatePushNotificationEvent({
                body: `₦${amount} was Reversed. Create a new Withdrawal Request.`,
                userId: userId,
                title: 'Transfer was Reversed'
            })
        )

        this.event.emit(
            'notification.in-app',
            new CreateInAppNotificationEvent({
                userId: userId,
                topic: 'TRANSACTIONS',
                title: 'Transaction Reversed',
                body: `Your transaction ${reference} has been reversed.`,
            })
        )

        this.event.emit(
            'notification.sms',
            new CreateSmsNotificationEvent({
                phone: phone,
                message: `Transfer Reversed. ₦${amount} was Reversed. Create a new Withdrawal Request.`
            })
        )
    }

    private async getTransaction(reference: string) {
        return await this.prisma.txHistory.findUnique({
            where: { reference },
            include: {
                user: {
                    select: {
                        email: true,
                        phone: true,
                    }
                }
            }
        })
    }

    private async updateTransactionStatus(reference: string, status: TransferStatus, paidAt?: string) {
        return await this.prisma.txHistory.update({
            where: {
                reference,
                type: 'WITHDRAWAL',
            },
            data: { status, ...(paidAt && { paidAt: new Date(paidAt) }) }
        })
    }

    private calculateTotalAmount(amount: number, totalFee: number) {
        const KOBO = 100 as const
        return (amount / KOBO) + totalFee
    }

    private async updateUserBalance(userId: string, amount: number) {
        let walletMutex = await this.store.get<Mutex>(`wb-wallet-update_${userId}`)

        if (!walletMutex) {
            walletMutex = new Mutex()
            await this.store.set(`wb-wallet-update_${userId}`, walletMutex)
        }

        const release = await walletMutex.acquire()

        try {
            return await this.prisma.wallet.update({
                where: { userId },
                data: { balance: { increment: amount } }
            })
        } catch (err) {
            console.error(err)
            throw err
        } finally {
            release()
            await this.store.delete(`wb-wallet-update_${userId}`)
        }
    }
}