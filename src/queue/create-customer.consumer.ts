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
import { PaystackService } from 'libs/Paystack/paystack.service'

@Processor('create-customer')
export class CreateCustomerConsumer extends WorkerHost {
    constructor(
        private readonly event: EventEmitter2,
        private readonly prisma: PrismaService,
        private readonly paystack: PaystackService,
    ) {
        super()
    }

    async process({ data: {
        userId, phone, promoCode,
        first_name, last_name, email
    } }: Job<{
        email: string
        userId: string
        phone?: string
        promoCode: string
        last_name: string
        first_name: string
    }>) {
        let customerResponse: CreateCustomerResponse
        const modminEmails = (await this.prisma.modmin.findMany({ select: { email: true } })).map(m => m?.email)

        try {
            customerResponse = await this.paystack.createCustomer({
                phone, last_name,
                first_name, email,
            })
        } catch (err) {
            this.event.emit(
                'notification.email',
                new CreateEmailNotificationEvent({
                    template: 'CreateCustomerError',
                    emails: modminEmails,
                    subject: "Error Creating User Wallet",
                    from: 'Rideshare - Error Log',
                    data: {
                        errorMessage: err.message,
                        userId, phone, promoCode,
                        first_name, last_name, email,
                    }
                })
            )

            throw err
        }

        const customer = customerResponse.data

        if (customer) {
            const user = await this.prisma.user.update({
                where: { id: userId },
                data: { customerCode: customer.customer_code }
            })

            if (user) {
                let account
                try {
                    const { data: createdAccount } = await this.paystack.createDVA({
                        customer: user.customerCode,
                        preferred_bank: config.env === 'live' ? 'paystack-titan' : 'test-bank',
                    })
                    account = createdAccount
                } catch (err) {
                    this.event.emit(
                        'notification.email',
                        new CreateEmailNotificationEvent({
                            template: 'CreateDVAError',
                            emails: modminEmails,
                            subject: "Error Creating DVA",
                            from: 'Rideshare - Error Log',
                            data: {
                                customerCode: user.customerCode,
                                errorMessage: err.message, userId,
                            },
                        })
                    )
                    throw err
                }

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
                    let earned = false

                    const promo = await this.prisma.signupPromo.findUnique({
                        where: { code: promoCode }
                    })

                    if (
                        promo &&
                        promo.isActive &&
                        promo.signups < promo?.constraint &&
                        promo?.expiry &&
                        new Date() < new Date(promo.expiry)
                    ) {
                        await this.prisma.$transaction([
                            this.prisma.wallet.update({
                                where: { id: wallet.id },
                                data: { balance: { increment: promo.reward } }
                            }),
                            this.prisma.promoUser.create({
                                data: {
                                    signupPromo: { connect: { id: promo.id } },
                                    user: { connect: { id: userId } }
                                }
                            }),
                            this.prisma.signupPromo.update({
                                where: { id: promo.id },
                                data: { signups: { increment: 1 } }
                            })
                        ])

                        earned = true
                    }

                    await this.emitNotifications(userId, earned, promoCode, promo.reward.toNumber())
                }
            }
        }
    }

    async emitNotifications(userId: string, earned?: boolean, code?: string, reward?: number) {
        this.event.emit(
            'notification.in-app',
            new CreateInAppNotificationEvent({
                userId: userId,
                title: 'Account Number Assigned!',
                body: 'A new account number has been generated for you.',
                topic: 'ACTIVITIES',
            })
        )

        if (earned) {
            this.event.emit(
                'notification.in-app',
                new CreateInAppNotificationEvent({
                    userId: userId,
                    title: `Promo Code Reward - ${code}`,
                    body: `Your account has been credited with ₦${reward}`,
                    topic: 'GENERAL',
                })
            )

            this.event.emit(
                'notification.push',
                new CreatePushNotificationEvent({
                    userId: userId,
                    title: `Promo Code Reward - ${code}`,
                    body: `Your account has been credited with ₦${reward}`,
                })
            )
        }
    }
}