import { Module } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { RealtimeService } from './realtime.service'
import { RealtimeGateway } from './realtime.gateway'
import { PrismaService } from 'prisma/prisma.service'
import { CloudinaryService } from 'src/cloudinary/cloudinary.service'

@Module({
  providers: [
    RealtimeGateway,
    RealtimeService,
    CloudinaryService,
    PrismaService,
    ConfigService,
    JwtService,
  ],
})
export class RealtimeModule { }
