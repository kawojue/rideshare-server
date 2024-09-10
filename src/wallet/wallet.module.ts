import { Module } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { WalletService } from './wallet.service'
import { PassportModule } from '@nestjs/passport'
import { StoreModule } from 'src/store/store.module'
import { QueueModule } from 'src/queue/queue.module'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { PrismaService } from 'prisma/prisma.service'
import { WalletController } from './wallet.controller'
import { ResponseService } from 'libs/response.service'
import { PaystackService } from 'libs/Paystack/paystack.service'

@Module({
  imports: [
    QueueModule,
    StoreModule,
    PassportModule.register({ defaultStrategy: 'jwt' })
  ],
  controllers: [WalletController],
  providers: [
    WalletService,
    JwtService,
    PrismaService,
    EventEmitter2,
    ResponseService,
    PaystackService,
  ],
  exports: [WalletService]
})
export class WalletModule { }
