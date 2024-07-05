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
import { ApiBearerAuth } from '@nestjs/swagger'
import { JwtRoleAuthGuard } from 'src/jwt/jwt-role.guard'
import { FetchRatingAndReviewsDTO, RatingDTO } from './dto/rate.dto'

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @ApiBearerAuth()
  @Roles(Role.PASSENGER)
  @Post('rating/rate/:driverId')
  @UseGuards(JwtRoleAuthGuard)
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
  @UseGuards(JwtRoleAuthGuard)
  @Roles(Role.PASSENGER, Role.ADMIN)
  @Delete('/rating/remove/:ratingId')
  async deleteRating(
    @Req() req: IRequest,
    @Res() res: Response,
    @Param('ratingId') ratingId: string
  ) {
    await this.userService.deleteRating(res, ratingId, req.user)
  }
}
