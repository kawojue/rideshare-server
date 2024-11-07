import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { config } from 'configs/env.config';
import { Global, Module } from '@nestjs/common';
import { CustomerConsumer } from './customer.consumer';
import { TransactionsConsumer } from './transaction.consumer';
import { PaystackService } from 'libs/Paystack/paystack.service';

const backoff = {
  type: 'fixed',
  delay: config.env === 'live' ? 60 * 60 * 1000 : 60 * 1000,
};

const SharedModule = BullModule.registerQueue(
  {
    name: 'customer-queue',
    defaultJobOptions: {
      removeOnComplete: true,
    },
  },
  {
    name: 'transaction-queue',
    defaultJobOptions: {
      removeOnComplete: true,
      backoff,
    },
  },
);

@Global()
@Module({
  imports: [HttpModule, SharedModule],
  providers: [PaystackService, CustomerConsumer, TransactionsConsumer],
  exports: [SharedModule],
})
export class QueueModule {}
