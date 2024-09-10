import {
  Get,
  Res,
  Post,
  Body,
  Param,
  Query,
  Patch,
  UseGuards,
  Controller,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { Response } from 'express'
import { Role } from '@prisma/client'
import { avatars } from 'utils/avatars'
import { Roles } from 'src/jwt/role.decorator'
import { StatusCodes } from 'enums/statusCodes'
import { ModminService } from './modmin.service'
import { WithdrawalRequestDTO } from './dto/payout.dto'
import { ResponseService } from 'libs/response.service'
import { JwtRoleAuthGuard } from 'src/jwt/auth-role.guard'
import { GetAuthParam } from 'src/jwt/auth-param.decorator'
import { FetchModminsDTO, } from 'src/app/dto/pagination.dto'
import { InviteNewModminDTO, LoginDTO } from './dto/auth.dto'

@ApiTags("Moderator & Admin")
@Controller('modmins')
export class ModminController {
  constructor(
    private readonly response: ResponseService,
    private readonly modminService: ModminService
  ) { }

  @Get('/')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @UseGuards(JwtRoleAuthGuard)
  async fetchModmins(@Res() res: Response, @Query() q: FetchModminsDTO) {
    const data = await this.modminService.fetchModmins(q)

    return this.response.sendSuccess(res, StatusCodes.OK, { data })
  }

  @Post('/login')
  async login(@Res() res: Response, @Body() body: LoginDTO) {
    const data = await this.modminService.login(body)

    return this.response.sendSuccess(res, StatusCodes.OK, { data })
  }

  @ApiBearerAuth()
  @Get('/avatars')
  @UseGuards(JwtRoleAuthGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  listAvatars() {
    return { data: avatars }
  }

  @ApiBearerAuth()
  @UseGuards(JwtRoleAuthGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Patch('/avatars/:avartarId')
  async updateAvatar(
    @Res() res: Response,
    @GetAuthParam() auth: JwtDecoded,
    @Param('avatarId') avatarId: string
  ) {
    const data = await this.modminService.updateAvatar(avatarId, auth)

    return this.response.sendSuccess(res, StatusCodes.OK, data)
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Post('/invite-modmin')
  @UseGuards(JwtRoleAuthGuard)
  async inviteNewModmin(@Res() res: Response, @Body() body: InviteNewModminDTO) {
    const data = await this.modminService.inviteNewModmin(body)

    return this.response.sendSuccess(res, StatusCodes.OK, data)
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @UseGuards(JwtRoleAuthGuard)
  @Patch('/toggle-suspension/:accountId')
  async toggleAccountSuspension(
    @Res() res: Response,
    @GetAuthParam() auth: JwtDecoded,
    @Param('accountId') accountId: string
  ) {
    const data = await this.modminService.toggleAccountSuspension(accountId, auth)

    return this.response.sendSuccess(res, StatusCodes.OK, { data })
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Post('/withdrawal-requests/:requestId')
  async withdrawalRequest(
    @Res() res: Response,
    @Query() q: WithdrawalRequestDTO,
    @GetAuthParam() auth: JwtDecoded,
    @Param('requestId') requestId: string
  ) {
    const data = await this.modminService.withdrawalRequest(requestId, auth, q)

    return this.response.sendSuccess(res, StatusCodes.OK, data)
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Post('/proof-of-address/:driverId')
  @ApiOperation({
    summary: "This is to toggle Proof of Address verification"
  })
  async verifyProofOfAddress(
    @Res() res: Response,
    @Param('driverId') driverId: string,
    @Body() body: WithdrawalRequestDTO,
  ) {
    const data = await this.modminService.verifyProofOfAddress(driverId, body)

    return this.response.sendSuccess(res, StatusCodes.OK, data)
  }
}
