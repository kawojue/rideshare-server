import {
  Get,
  Res,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Controller,
} from '@nestjs/common'
import { Response } from 'express'
import { Role } from '@prisma/client'
import { avatars } from 'utils/avatars'
import { Roles } from 'src/jwt/role.decorator'
import { ModminService } from './modmin.service'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtRoleAuthGuard } from 'src/jwt/jwt-role.guard'
import { InviteNewModminDTO, LoginDTO } from './dto/auth.dto'

@ApiTags("Moderator & Admin")
@Controller('modmin')
export class ModminController {
  constructor(private readonly modminService: ModminService) { }

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
}
