import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuthService } from './auth.service'
import { ConfigService } from '@nestjs/config'
import { MiscService } from 'libs/misc.service'
import { PassportModule } from '@nestjs/passport'
import { PlunkService } from 'libs/plunk.service'
import { JwtStrategy } from 'src/jwt/jwt.strategy'
import { AuthController } from './auth.controller'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'libs/response.service'
import { GoogleStrategy } from 'src/jwt/google.strategy'
import { EncryptionService } from 'libs/encryption.service'
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module'
import { CloudinaryService } from 'src/cloudinary/cloudinary.service'

@Module({
  imports: [
    CloudinaryModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '10m' },
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    MiscService,
    PlunkService,
    PrismaService,
    ConfigService,
    GoogleStrategy,
    ResponseService,
    EncryptionService,
    CloudinaryService,
  ],
})
export class AuthModule { }
