import {
  Res,
  Get,
  Body,
  Post,
  Query,
  Param,
  Delete,
  UseGuards,
  Controller,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger'
import {
  RatingDTO,
  FetchRatingAndReviewsDTO,
} from './dto/rate.dto'
import { Response } from 'express'
import {
  FetchUsersDTO,
  FetchTxHistoriesDTO,
  FetchWithdrawalRequestsDTO,
} from 'src/app/dto/pagination.dto'
import { Role } from '@prisma/client'
import { UsersService } from './user.service'
import { Roles } from 'src/jwt/role.decorator'
import { StatusCodes } from 'enums/statusCodes'
import { ResponseService } from 'libs/response.service'
import { JwtRoleAuthGuard } from 'src/jwt/auth-role.guard'
import { GetAuthParam } from 'src/jwt/auth-param.decorator'

@ApiTags("User")
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtRoleAuthGuard)
export class UsersController {
  constructor(
    private readonly userService: UsersService,
    private readonly response: ResponseService,
  ) { }

  @Get('/')
  async fetchUsers(
    @Res() res: Response,
    @Query() q: FetchUsersDTO,
    @GetAuthParam() auth: JwtDecoded,
  ) {
    const data = await this.userService.fetchUsers(q, auth)

    return this.response.sendSuccess(res, StatusCodes.OK, { data })
  }

  @Roles(Role.PASSENGER)
  @Post('rating/rate/:driverId')
  async rateRider(
    @Res() res: Response,
    @Body() body: RatingDTO,
    @GetAuthParam() auth: JwtDecoded,
    @Param('driverId') driverId: string,
  ) {
    const data = await this.userService.rateRider(driverId, auth, body)

    return this.response.sendSuccess(res, StatusCodes.Created, { data })
  }

  @Get('/rating/reviews/:driverId')
  async fetchRatingAndReviews(
    @Res() res: Response,
    @Param('driverId') driverId: string,
    @Query() query: FetchRatingAndReviewsDTO
  ) {
    const data = await this.userService.fetchRatingAndReviews(driverId, query)

    return this.response.sendSuccess(res, StatusCodes.OK, { data })
  }

  @Roles(Role.ADMIN)
  @Delete('/rating/remove/:ratingId')
  async deleteRating(@Res() res: Response, @Param('ratingId') ratingId: string) {
    await this.userService.deleteRating(ratingId)

    return this.response.sendNoContent(res)
  }

  @Get('/withdrawal-requests')
  async fetchWithdrawalRequests(
    @Res() res: Response,
    @GetAuthParam() auth: JwtDecoded,
    @Query() q: FetchWithdrawalRequestsDTO
  ) {
    const data = await this.userService.fetchWithdrawalRequests(auth, q)

    return this.response.sendSuccess(res, StatusCodes.OK, { data })
  }

  @Get('/transaction-histories')
  async fetchTransactionHistories(
    @Res() res: Response,
    @GetAuthParam() auth: JwtDecoded,
    @Query() q: FetchTxHistoriesDTO,
  ) {
    const data = await this.userService.fetchTxHistories(auth, q)

    return this.response.sendSuccess(res, StatusCodes.OK, { data })
  }

  @ApiOperation({
    summary: 'ID could either be the id or reference'
  })
  @Get('/transaction-histories/:id')
  async fetchTransactionHistory(
    @Res() res: Response,
    @Param('id') id: string,
    @GetAuthParam() auth: JwtDecoded,
  ) {
    const data = await this.userService.fetchTxHistory(id, auth)

    return this.response.sendSuccess(res, StatusCodes.OK, { data })
  }
}
