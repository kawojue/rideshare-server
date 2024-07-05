import { Module } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UserService } from './user.service'
import { MiscService } from 'libs/misc.service'
import { PassportModule } from '@nestjs/passport'
import { UserController } from './user.controller'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'libs/response.service'

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }),],
  controllers: [UserController],
  providers: [
    UserService,
    JwtService,
    MiscService,
    PrismaService,
    ResponseService,
  ],
})
export class UserModule { }
