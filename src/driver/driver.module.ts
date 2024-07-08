import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MiscService } from 'libs/misc.service'
import { DriverService } from './driver.service'
import { PassportModule } from '@nestjs/passport'
import { PrismaService } from 'prisma/prisma.service'
import { DriverController } from './driver.controller'
import { ResponseService } from 'libs/response.service'
import { CloudinaryService } from 'src/cloudinary/cloudinary.service'
import { JwtService } from '@nestjs/jwt'

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [DriverController],
  providers: [
    DriverService,
    JwtService,
    MiscService,
    PrismaService,
    ConfigService,
    ResponseService,
    CloudinaryService,
  ],
})
export class DriverModule { }
