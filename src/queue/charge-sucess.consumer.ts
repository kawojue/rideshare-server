import { Job } from 'bullmq'
import { Mutex } from 'async-mutex'
import { Utils } from 'helpers/utils'
import {
    CreatePushNotificationEvent,
    CreateInAppNotificationEvent,
    CreateEmailNotificationEvent,
} from 'src/notification/notification.event'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { PrismaService } from 'prisma/prisma.service'
import { Processor, WorkerHost } from '@nestjs/bullmq'
import { StoreService } from 'src/store/store.service'
import { TransferStatus, TxHistory, User } from '@prisma/client'

@Processor('charge.success-queue')
export class ChargeSuccessConsumer extends WorkerHost {
    constructor(
        private readonly store: StoreService,
        private readonly event: EventEmitter2,
        private readonly prisma: PrismaService,
    ) {
        super()
    }

    async process({ data }: Job<ChargeSuccessEventData>) {
        const reference = data.reference
        const status = Utils.toUpperCase(data.status) as TransferStatus

        const customer = await this.prisma.user.findUnique({
            where: { customerCode: data.customer.customer_code }
        })

        if (customer) {
            const transaction = await this.prisma.txHistory.findUnique({
                where: { reference }
            })

            let walletMutex = await this.store.get<Mutex>(`wb-wallet-update_${customer.id}`)

            if (!walletMutex) {
                walletMutex = new Mutex()
                await this.store.set(`wb-wallet-update_${customer.id}`, walletMutex)
            }

            const release = await walletMutex.acquire()

            if (!transaction) {
                try {
                    const [newTransaction] = await this.prisma.$transaction([
                        this.prisma.txHistory.create({
                            data: {
                                type: 'DEPOSIT',
                                status, reference,
                                amount: data.amount,
                                ip: data?.ip_address,
                                authorization: data?.authorization,
                                ...(data?.paidAt && { paidAt: new Date(data.paidAt) }),
                                user: { connect: { id: customer.id } },
                            }
                        }),
                        this.prisma.wallet.update({
                            where: { userId: customer.id },
                            data: {
                                lastDepositedAt: new Date(),
                                lastDepositedAmount: data.amount,
                                balance: { increment: data.amount },
                            }
                        })
                    ])

                    await this.emitNotifications(customer, newTransaction)
                } catch (err) {
                    console.error(err)
                    throw err
                } finally {
                    release()
                    await this.store.delete(`wb-wallet-update_${customer.id}`)
                }
            }
        }
    }

    private async emitNotifications(user: User, transaction: TxHistory) {
        this.event.emit(
            'notification.in-app',
            new CreateInAppNotificationEvent({
                userId: user.id,
                topic: 'TRANSACTIONS',
                title: 'New Deposit',
                body: `Your account has been credited with ₦${transaction.amount}`,
            })
        )

        this.event.emit(
            'notification.push',
            new CreatePushNotificationEvent({
                userId: user.id,
                title: 'New Deposit',
                body: `Your account has been credited with ₦${transaction.amount}`,
            })
        )

        this.event.emit(
            'notification.email',
            new CreateEmailNotificationEvent({
                template: 'FundWallet',
                emails: user.email,
                subject: 'Balance Credited',
                data: {

                }
            })
        )
    }
}