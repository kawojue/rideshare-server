import {
  Get,
  Req,
  Res,
  Query,
  UseGuards,
  Controller,
} from '@nestjs/common'
import {
  MoneyFlowDTO,
  MoneyFlowChartDTO,
  UsersAnalyticsDTO,
} from './dto/index.dto'
import { Response } from 'express'
import { Role } from '@prisma/client'
import { Roles } from 'src/jwt/role.decorator'
import { AnalyticsService } from './analytics.service'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtRoleAuthGuard } from 'src/jwt/jwt-role.guard'

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) { }

  @ApiBearerAuth()
  @Get('/users-chart')
  @UseGuards(JwtRoleAuthGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  async usersChart(@Res() res: Response, @Query() query: UsersAnalyticsDTO) {
    await this.analyticsService.usersChart(res, query)
  }

  @ApiBearerAuth()
  @Get('/money-flow')
  @UseGuards(JwtRoleAuthGuard)
  async moneyFlowAggregate(
    @Res() res: Response,
    @Req() req: IRequest,
    @Query() query: MoneyFlowDTO
  ) {
    await this.analyticsService.moneyFlowAggregate(res, query, req.user)
  }

  @ApiBearerAuth()
  @Get('/money-flow/chart')
  @UseGuards(JwtRoleAuthGuard)
  async moneyFlowChart(
    @Res() res: Response,
    @Req() req: IRequest,
    @Query() query: MoneyFlowChartDTO
  ) {
    await this.analyticsService.moneyFlowChart(res, req.user, query)
  }
}
