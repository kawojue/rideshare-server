import { Module } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { MiscService } from 'libs/misc.service'
import { ModminService } from './modmin.service'
import { PassportModule } from '@nestjs/passport'
import { JwtStrategy } from 'src/jwt/jwt.strategy'
import { StoreModule } from 'src/store/store.module'
import { PrismaService } from 'prisma/prisma.service'
import { ModminController } from './modmin.controller'
import { ResponseService } from 'libs/response.service'
import { EncryptionService } from 'libs/encryption.service'
import { PaystackService } from 'libs/Paystack/paystack.service'

@Module({
  imports: [
    StoreModule,
    PassportModule.register({ defaultStrategy: 'jwt' })
  ],
  controllers: [ModminController],
  providers: [
    ModminService,
    JwtStrategy,
    JwtService,
    MiscService,
    PrismaService,
    PaystackService,
    ResponseService,
    EncryptionService,
  ],
  exports: [ModminService]
})
export class ModminModule { }
