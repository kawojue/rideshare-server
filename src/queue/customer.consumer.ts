import { Job } from 'bullmq'
import { config } from 'configs/env.config'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { PrismaService } from 'prisma/prisma.service'
import { Processor, WorkerHost } from '@nestjs/bullmq'
import { PaystackService } from 'libs/Paystack/paystack.service'
import { CreateInAppNotificationEvent } from 'src/notification/notification.event'

@Processor('create-customer')
export class CreateCusomer extends WorkerHost {
    constructor(
        private readonly event: EventEmitter2,
        private readonly prisma: PrismaService,
        private readonly paystack: PaystackService,
    ) {
        super()
    }

    async process({ data: { userId, first_name, last_name, email, phone } }: Job<{
        userId: string
        email: string
        phone?: string
        last_name: string
        first_name: string
    }>) {
        const { data: customer } = await this.paystack.createCustomer({
            phone, last_name,
            first_name, email,
        })

        if (customer) {
            const user = await this.prisma.user.update({
                where: { id: userId },
                data: { customerCode: customer.customer_code }
            })

            if (user) {
                const { data: account } = await this.paystack.createDVA({
                    customer: user.customerCode,
                    preferred_bank: config.env === 'live' ? 'paystack-titan' : 'test-bank'
                })

                const wallet = await this.prisma.wallet.update({
                    where: { userId },
                    data: {
                        dvaId: account.id.toString(),
                        currency: account.currency,
                        bankName: account.bank.name,
                        accountName: account.account_name,
                        accountNumber: account.account_number,
                    }
                })

                if (wallet) {
                    this.event.emit(
                        'notification.in-app',
                        new CreateInAppNotificationEvent({
                            title: 'Account Number Assigned!',
                            body: 'A new account number has been generated for you.',
                            topic: 'ACTIVITY',
                        })
                    )
                }
            }
        }
    }
}