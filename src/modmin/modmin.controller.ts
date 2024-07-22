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
import { Response } from 'express'
import { Role } from '@prisma/client'
import { avatars } from 'utils/avatars'
import { Roles } from 'src/jwt/role.decorator'
import { ModminService } from './modmin.service'
import { WithdrawalRequestDTO } from './dto/payout.dto'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtRoleAuthGuard } from 'src/jwt/jwt-role.guard'
import { FetchModminsDTO } from 'src/app/dto/pagination.dto'
import { InviteNewModminDTO, LoginDTO } from './dto/auth.dto'

@ApiTags("Moderator & Admin")
@Controller('modmins')
export class ModminController {
  constructor(private readonly modminService: ModminService) { }

  @Get('/')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @UseGuards(JwtRoleAuthGuard)
  async fetchModmins(@Res() res: Response, @Query() q: FetchModminsDTO) {
    await this.modminService.fetchModmins(res, q)
  }

  @Post('/login')
  async login(@Res() res: Response, @Body() body: LoginDTO) {
    await this.modminService.login(res, body)
  }

  @ApiBearerAuth()
  @UseGuards(JwtRoleAuthGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Get('/avatars')
  listAvatars() {
    return { data: avatars }
  }

  @ApiBearerAuth()
  @UseGuards(JwtRoleAuthGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Patch('/avatars/:avartarId')
  async updateAvatar(
    @Res() res: Response,
    @Res() req: IRequest,
    @Param('avatarId') avatarId: string
  ) {
    await this.modminService.updateAvatar(res, avatarId, req.user)
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Post('/invite-modmin')
  @UseGuards(JwtRoleAuthGuard)
  async inviteNewModmin(@Res() res: Response, @Body() body: InviteNewModminDTO) {
    await this.modminService.inviteNewModmin(res, body)
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Patch('/toggle-suspension/:accountId')
  @UseGuards(JwtRoleAuthGuard)
  async toggleAccountSuspension(
    @Res() res: Response,
    @Res() req: IRequest,
    @Param('accountId') accountId: string
  ) {
    await this.modminService.toggleAccountSuspension(res, accountId, req.user)
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Post('/withdrawal-request/:requestId')
  async withdrawalRequest(
    @Res() res: Response,
    @Query() q: WithdrawalRequestDTO,
    @Param('requestId') requestId: string
  ) {
    await this.modminService.withdrawalRequest(res, requestId, q)
  }
}
