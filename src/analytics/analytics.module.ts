import { Module } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { MiscService } from 'libs/misc.service'
import { PassportModule } from '@nestjs/passport'
import { PrismaService } from 'prisma/prisma.service'
import { AnalyticsService } from './analytics.service'
import { ResponseService } from 'libs/response.service'
import { AnalyticsController } from './analytics.controller'

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    JwtService,
    MiscService,
    PrismaService,
    ResponseService,
  ],
})
export class AnalyticsModule { }
