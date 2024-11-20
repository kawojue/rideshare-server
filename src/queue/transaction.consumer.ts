import { Job } from 'bull';
import { Mutex } from 'async-mutex';
import { Utils } from 'helpers/utils';
import {
  Process,
  Processor,
  OnQueueActive,
  OnQueueFailed,
  OnQueueCompleted,
} from '@nestjs/bull';
import {
  CreateSmsNotificationEvent,
  CreatePushNotificationEvent,
  CreateInAppNotificationEvent,
  CreateEmailNotificationEvent,
} from 'src/notification/notification.event';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from 'prisma/prisma.service';
import { StoreService } from 'src/store/store.service';
import { User, Prisma, TxHistory, TransferStatus } from '@prisma/client';

@Processor('transaction-queue')
export class TransactionsConsumer {
  constructor(
    private readonly store: StoreService,
    private readonly event: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

  @Process({
    name: 'charge.sucess',
    concurrency: 2,
  })
  async chargeSuccess({ data }: Job<ChargeSuccessEventData>) {
    const reference = data.reference;
    const status = Utils.toUpperCase(data.status) as TransferStatus;

    const customer = await this.prisma.user.findUnique({
      where: { customerCode: data.customer.customer_code },
    });

    if (customer) {
      const transaction = await this.prisma.txHistory.findUnique({
        where: { reference },
      });

      let walletMutex = await this.store.get<Mutex>(
        `wb-wallet-update_${customer.id}`,
      );

      if (!walletMutex) {
        walletMutex = new Mutex();
        await this.store.set(`wb-wallet-update_${customer.id}`, walletMutex);
      }

      const release = await walletMutex.acquire();

      if (!transaction) {
        try {
          const [newTransaction] = await this.prisma.$transaction([
            this.prisma.txHistory.create({
              data: {
                status,
                reference,
                type: 'DEPOSIT',
                amount: +data.amount,
                ip: data?.ip_address,
                authorization: data?.authorization,
                ...(data?.paidAt && { paidAt: new Date(data.paidAt) }),
                user: { connect: { id: customer.id } },
              },
            }),
            this.prisma.wallet.update({
              where: { userId: customer.id },
              data: {
                lastDepositedAt: new Date(),
                lastDepositedAmount: +data.amount,
                balance: { increment: +data.amount },
              },
            }),
          ]);

          this.emitChargeNotifications(customer, newTransaction);
        } catch (err) {
          console.error(err);
          throw err;
        } finally {
          release();
          await this.store.delete(`wb-wallet-update_${customer.id}`);
        }
      }
    }
  }

  @Process({
    name: 'transfer.sucess',
  })
  async transfer({ data }: Job<TransferEventData>) {
    const reference = data.reference;
    const status = Utils.toUpperCase(data.status) as TransferStatus;

    const transaction = await this.prisma.$transaction(async (prisma) => {
      const transaction = await this.getTransaction(prisma, reference);
      if (transaction && transaction.status !== status) {
        await this.updateTransactionStatus(prisma, reference, status);
      }

      return transaction;
    });

    this.emitSuccessNotifications(transaction, transaction.amount.toNumber());
  }

  @Process({
    name: 'transfer.failed-reverse',
    concurrency: 5,
  })
  async tranferRevOrFailed({ data }: Job<TransferEventData>) {
    const reference = data.reference;
    const status = Utils.toUpperCase(data.status) as TransferStatus;

    const transaction = await this.prisma.$transaction(async (prisma) => {
      const transaction = await this.getTransaction(prisma, reference);

      await this.updateTransactionStatus(prisma, reference, status);

      const amount = this.calculateTotalAmount(
        +data.amount,
        +transaction.totalFee,
      );

      await this.updateUserBalance(prisma, transaction.userId, amount);

      return { ...transaction, amount };
    });

    this.emitReversalNotifications(
      transaction.userId,
      transaction.reference,
      transaction.amount,
      transaction.user.phone,
    );
  }

  private async getTransaction(
    prisma: Prisma.TransactionClient,
    reference: string,
  ) {
    return await prisma.txHistory.findUnique({
      where: { reference },
      include: {
        user: {
          select: {
            email: true,
            phone: true,
          },
        },
      },
    });
  }

  private async updateTransactionStatus(
    prisma: Prisma.TransactionClient,
    reference: string,
    status: TransferStatus,
    paidAt?: string,
  ) {
    return await prisma.txHistory.update({
      where: {
        reference,
        type: 'WITHDRAWAL',
      },
      data: { status, ...(paidAt && { paidAt: new Date(paidAt) }) },
    });
  }

  private calculateTotalAmount(amount: number, totalFee: number) {
    const KOBO = 100 as const;
    return amount / KOBO + totalFee;
  }

  private async updateUserBalance(
    prisma: Prisma.TransactionClient,
    userId: string,
    amount: number,
  ) {
    let walletMutex = await this.store.get<Mutex>(`wb-wallet-update_${userId}`);

    if (!walletMutex) {
      walletMutex = new Mutex();
      await this.store.set(`wb-wallet-update_${userId}`, walletMutex);
    }

    const release = await walletMutex.acquire();

    try {
      return await prisma.wallet.update({
        where: { userId },
        data: { balance: { increment: amount } },
      });
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      release();
      await this.store.delete(`wb-wallet-update_${userId}`);
    }
  }

  private emitChargeNotifications(user: User, transaction: TxHistory) {
    this.event.emit(
      'notification.in-app',
      new CreateInAppNotificationEvent({
        userId: user.id,
        topic: 'TRANSACTIONS',
        title: 'New Deposit',
        body: `Your account has been credited with ₦${transaction.amount}`,
      }),
    );

    this.event.emit(
      'notification.push',
      new CreatePushNotificationEvent({
        userId: user.id,
        title: 'New Deposit',
        body: `Your account has been credited with ₦${transaction.amount}`,
      }),
    );

    this.event.emit(
      'notification.email',
      new CreateEmailNotificationEvent({
        template: 'FundWallet',
        emails: user.email,
        subject: 'Balance Credited',
        data: {},
      }),
    );
  }

  private emitSuccessNotifications(transaction: any, amount: number) {
    this.event.emit(
      'notification.in-app',
      new CreateInAppNotificationEvent({
        userId: transaction.userId,
        topic: 'TRANSACTIONS',
        title: 'Transaction Reversed',
        body: `Your transaction ${transaction.reference} has been reversed.`,
      }),
    );

    this.event.emit(
      'notification.push',
      new CreatePushNotificationEvent({
        body: `₦${amount} was Reversed. Create a new Withdrawal Request.`,
        userId: transaction.userId,
        title: 'Transfer was Reversed',
      }),
    );

    this.event.emit(
      'notification.email',
      new CreateEmailNotificationEvent({
        template: 'TransferSuccessful',
        emails: transaction.user.email,
        subject: 'Transfer Successful',
        data: {},
      }),
    );
  }

  private emitReversalNotifications(
    userId: string,
    reference: string,
    amount: number,
    phone: string,
  ) {
    this.event.emit(
      'notification.push',
      new CreatePushNotificationEvent({
        body: `₦${amount} was Reversed. Create a new Withdrawal Request.`,
        userId: userId,
        title: 'Transfer was Reversed',
      }),
    );

    this.event.emit(
      'notification.in-app',
      new CreateInAppNotificationEvent({
        userId: userId,
        topic: 'TRANSACTIONS',
        title: 'Transaction Reversed',
        body: `Your transaction ${reference} has been reversed.`,
      }),
    );

    this.event.emit(
      'notification.sms',
      new CreateSmsNotificationEvent({
        phone: phone,
        message: `Transfer Reversed. ₦${amount} was Reversed. Create a new Withdrawal Request.`,
      }),
    );
  }

  @OnQueueActive()
  onActive(job: Job) {
    console.info(
      `(Queue) Processing: job ${job.id} of ${job.queue.name} with data: ${JSON.stringify(job.data)}...`,
    );
  }

  @OnQueueCompleted()
  async OnQueueCompleted(job: Job) {
    console.info('(Queue) Completed: job ', job.id, job.queue.name);
  }

  @OnQueueFailed()
  OnQueueFailed(job: Job, error: Error) {
    console.info(
      '(Queue) Error on: job ',
      job.id,
      ' -> error: ',
      error.message,
    );
  }
}
