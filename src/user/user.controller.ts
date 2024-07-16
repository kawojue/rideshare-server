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
import { JwtRoleAuthGuard } from 'src/jwt/jwt-role.guard'
import { FetchRatingAndReviewsDTO, RatingDTO } from './dto/rate.dto'

@ApiTags("User")
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

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
}
