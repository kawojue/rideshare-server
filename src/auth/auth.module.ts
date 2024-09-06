import { Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { ConfigService } from '@nestjs/config'
import { MiscService } from 'libs/misc.service'
import { PassportModule } from '@nestjs/passport'
import { JwtStrategy } from 'src/jwt/jwt.strategy'
import { AuthController } from './auth.controller'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'libs/response.service'
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module'
import { CloudinaryService } from 'src/cloudinary/cloudinary.service'

@Module({
  imports: [
    CloudinaryModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    MiscService,
    PrismaService,
    ConfigService,
    ResponseService,
    CloudinaryService,
  ],
  exports: [AuthService]
})
export class AuthModule { }
