import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { BullModule } from '@nestjs/bullmq'
import { StoreModule } from 'src/store/store.module'
import { PrismaService } from 'prisma/prisma.service'
import { PaystackService } from 'libs/Paystack/paystack.service'
import { EventEmitter2 } from '@nestjs/event-emitter'

const SharedModule = BullModule.registerQueue(
    {
        name: 'create-customer-queue',
        defaultJobOptions: {
            removeOnFail: true,
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
    ],
    exports: [SharedModule]
})
export class QueueModule { }
