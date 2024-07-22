import { Response } from 'express'
import { Role } from '@prisma/client'
import { Roles } from 'src/jwt/role.decorator'
import { UsersAnalyticsDTO } from './dto/index.dto'
import { AnalyticsService } from './analytics.service'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtRoleAuthGuard } from 'src/jwt/jwt-role.guard'
import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common'

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) { }

  @Get('/users')
  @ApiBearerAuth()
  @UseGuards(JwtRoleAuthGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  async users(@Res() res: Response, @Query() query: UsersAnalyticsDTO) {
    await this.analyticsService.users(res, query)
  }
}
