import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { BullModule } from '@nestjs/bullmq'
import { StoreModule } from 'src/store/store.module'
import { PrismaService } from 'prisma/prisma.service'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { TransferConsumer } from './transfer-consumer'
import { PaystackService } from 'libs/Paystack/paystack.service'
import { ChargeSuccessConsumer } from './charge-sucess.consumer'
import { CreateCustomerConsumer } from './create-customer.consumer'

const SharedModule = BullModule.registerQueue(
    {
        name: 'create-customer-queue',
        defaultJobOptions: {
            removeOnFail: true,
            removeOnComplete: true,
        }
    },
    {
        name: 'transfer-queue',
        defaultJobOptions: {
            removeOnFail: false,
            removeOnComplete: true,
        }
    },
    {
        name: 'charge.sucsess-queue',
        defaultJobOptions: {
            removeOnFail: false,
            removeOnComplete: true,
        }
    }
)

@Module({
    imports: [
        HttpModule,
        StoreModule,
        SharedModule,
    ],
    providers: [
        PrismaService,
        EventEmitter2,
        PaystackService,
        TransferConsumer,
        ChargeSuccessConsumer,
        CreateCustomerConsumer,
    ],
    exports: [SharedModule]
})
export class QueueModule { }
