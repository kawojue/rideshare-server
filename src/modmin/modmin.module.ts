import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { MiscService } from 'libs/misc.service'
import { ModminService } from './modmin.service'
import { PlunkService } from 'libs/plunk.service'
import { PassportModule } from '@nestjs/passport'
import { JwtStrategy } from 'src/jwt/jwt.strategy'
import { PrismaService } from 'prisma/prisma.service'
import { ModminController } from './modmin.controller'
import { ResponseService } from 'libs/response.service'
import { EncryptionService } from 'libs/encryption.service'

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '30m' },
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [ModminController],
  providers: [
    ModminService,
    JwtStrategy,
    MiscService,
    PlunkService,
    PrismaService,
    ResponseService,
    EncryptionService,
  ],
})
export class ModminModule { }
