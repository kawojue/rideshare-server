import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { PassportModule } from '@nestjs/passport';
import { WalletController } from './wallet.controller';
import { PaystackService } from 'libs/Paystack/paystack.service';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [WalletController],
  providers: [WalletService, PaystackService],
  exports: [WalletService],
})
export class WalletModule {}
