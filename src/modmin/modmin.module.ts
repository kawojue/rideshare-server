import { Module } from '@nestjs/common';
import { ModminService } from './modmin.service';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from 'src/jwt/jwt.strategy';
import { ModminController } from './modmin.controller';
import { EncryptionService } from 'libs/encryption.service';
import { PaystackService } from 'libs/Paystack/paystack.service';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [ModminController],
  providers: [ModminService, JwtStrategy, PaystackService, EncryptionService],
  exports: [ModminService],
})
export class ModminModule {}
