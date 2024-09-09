import { Module } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UsersService } from './user.service'
import { PassportModule } from '@nestjs/passport'
import { UsersController } from './users.controller'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'libs/response.service'

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [UsersController],
  providers: [
    UsersService,
    JwtService,
    PrismaService,
    ResponseService,
  ],
  exports: [UsersService]
})
export class UsersModule { }
