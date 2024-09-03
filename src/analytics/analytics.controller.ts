import {
  Get,
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
import { StatusCodes } from 'enums/statusCodes'
import { AnalyticsService } from './analytics.service'
import { ResponseService } from 'libs/response.service'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtRoleAuthGuard } from 'src/jwt/auth-role.guard'
import { GetAuthParam } from 'src/jwt/auth-param.decorator'

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly response: ResponseService,
    private readonly analyticsService: AnalyticsService
  ) { }

  @ApiBearerAuth()
  @Get('/users-chart')
  @UseGuards(JwtRoleAuthGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  async usersChart(@Res() res: Response, @Query() query: UsersAnalyticsDTO) {
    const data = await this.analyticsService.usersChart(query)

    return this.response.sendSuccess(res, StatusCodes.OK, data)
  }

  @ApiBearerAuth()
  @Get('/money-flow')
  @UseGuards(JwtRoleAuthGuard)
  async moneyFlowAggregate(
    @Res() res: Response,
    @Query() query: MoneyFlowDTO,
    @GetAuthParam() auth: JwtDecoded,
  ) {
    const data = await this.analyticsService.moneyFlowAggregate(query, auth)

    return this.response.sendSuccess(res, StatusCodes.OK, data)
  }

  @ApiBearerAuth()
  @Get('/money-flow/chart')
  @UseGuards(JwtRoleAuthGuard)
  async moneyFlowChart(
    @Res() res: Response,
    @GetAuthParam() auth: JwtDecoded,
    @Query() query: MoneyFlowChartDTO
  ) {
    const data = await this.analyticsService.moneyFlowChart(auth, query)

    return this.response.sendSuccess(res, StatusCodes.OK, data)
  }
}
