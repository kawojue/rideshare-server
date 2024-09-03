import {
  Res,
  Req,
  Get,
  Body,
  Post,
  Query,
  Param,
  Delete,
  UseGuards,
  Controller,
} from '@nestjs/common'
import { Response } from 'express'
import { Role } from '@prisma/client'
import { UserService } from './user.service'
import { Roles } from 'src/jwt/role.decorator'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtRoleAuthGuard } from 'src/jwt/auth-role.guard'
import { FetchRatingAndReviewsDTO, RatingDTO } from './dto/rate.dto'
import { FetchTxHistoryDTO, FetchUsersDTO } from 'src/app/dto/pagination.dto'

@ApiTags("User")
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Get('/')
  @ApiBearerAuth()
  @UseGuards(JwtRoleAuthGuard)
  async fetchUsers(
    @Res() res: Response,
    @Res() req: IRequest,
    @Query() q: FetchUsersDTO
  ) {
    await this.userService.fetchUsers(res, q, req.user)
  }

  @ApiBearerAuth()
  @Roles(Role.PASSENGER)
  @UseGuards(JwtRoleAuthGuard)
  @Post('rating/rate/:driverId')
  async rateRider(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: RatingDTO,
    @Param('driverId') driverId: string,
  ) {
    await this.userService.rateRider(res, driverId, req.user, body)
  }

  @Get('/rating/reviews/:driverId')
  async fetchRatingAndReviews(
    @Res() res: Response,
    @Param('driverId') driverId: string,
    @Query() query: FetchRatingAndReviewsDTO
  ) {
    await this.userService.fetchRatingAndReviews(res, driverId, query)
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @UseGuards(JwtRoleAuthGuard)
  @Delete('/rating/remove/:ratingId')
  async deleteRating(@Res() res: Response, @Param('ratingId') ratingId: string) {
    await this.userService.deleteRating(res, ratingId)
  }

  @ApiBearerAuth()
  @Get('/tx-histories')
  @UseGuards(JwtRoleAuthGuard)
  async fetchWithdrawalRequest(
    @Res() res: Response,
    @Req() req: IRequest,
    @Query() q: FetchTxHistoryDTO
  ) {
    await this.userService.fetchTxHistories(res, req.user, q)
  }

  @ApiBearerAuth()
  @UseGuards(JwtRoleAuthGuard)
  @Get('/tx-histories/:historyId')
  async fetchTxHistory(
    @Res() res: Response,
    @Req() req: IRequest,
    @Param('historyId') historyId: string
  ) {
    await this.userService.fetchTxHistory(res, historyId, req.user)
  }
}
