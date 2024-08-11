import {
  OTPDTO,
  EmailDTO,
  SigninDTO,
  SignupDTO,
  ResetPasswordDTO,
  UpdatePasswordDTO,
  BiometricLoginDTO,
  EmergencyContactDTO,
} from './dto/auth.dto'
import {
  Get,
  Put,
  Req,
  Res,
  Body,
  Post,
  Patch,
  UseGuards,
  Controller,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import {
  ApiTags,
  ApiConsumes,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { Role } from '@prisma/client'
import { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { Roles } from 'src/jwt/role.decorator'
import { JwtRoleAuthGuard } from 'src/jwt/jwt-role.guard'
import { FileInterceptor } from '@nestjs/platform-express'
import { GoogleAuthGuard } from 'src/jwt/google-auth.guard'

@ApiTags("Auth")
@Controller('auth')
export class AuthController {
  private isProd: boolean

  constructor(
    private readonly authService: AuthService,
  ) {
    this.isProd = process.env.NODE_ENV === "production"
  }

  @ApiOperation({
    summary: 'Use this - only for signin',
  })
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Req() req: Request) { }

  @ApiOperation({
    summary: 'Ignore this',
  })
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleSignin(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { payload, setup, user } = await this.authService.googleSignin(req.user)

    const access_token = await this.authService.updateLoginState(res, payload, 'lastUsedCredentialAt')

    const data = {
      access_token,
      data: {
        setup,
        id: user.id,
        role: user.role,
        profile: user.profile,
        lastname: user.lastname,
        firstname: user.firstname,
      }
    }

    res.cookie('access_token', data.access_token, {
      sameSite: this.isProd ? 'none' : 'lax',
      secure: this.isProd,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })

    res.redirect('http://localhost:3000')
  }

  @Post('/signin')
  async signin(@Res() res: Response, @Body() body: SigninDTO) {
    await this.authService.signin(res, body)
  }

  @Post('/biometric/signin')
  async biometricSignin(@Res() res: Response, @Body() body: BiometricLoginDTO) {
    await this.authService.biometricSignin(res, body)
  }

  @ApiBearerAuth()
  @Patch('/biometric/toggle')
  @UseGuards(JwtRoleAuthGuard)
  @Roles(Role.DRIVER, Role.PASSENGER)
  async toggleBiometric(@Res() res: Response, @Req() req: IRequest) {
    await this.authService.toggleBiometric(res, req.user)
  }

  @Post('/signup')
  async signup(@Res() res: Response, @Body() body: SignupDTO) {
    await this.authService.signup(res, body)
  }

  @Post('/refresh/access-token')
  async refreshAccessToken(@Res() res: Response, @Req() req: Request) {
    await this.authService.refreshAccessToken(req, res)
  }

  @Post('/otp/request')
  async requestOtp(@Res() res: Response, @Body() body: EmailDTO) {
    await this.authService.requestOtp(res, body)
  }

  @Post('/otp/verify')
  async verifyOtp(@Res() res: Response, @Body() body: OTPDTO) {
    await this.authService.verifyOtp(res, body)
  }

  @ApiBearerAuth()
  @Patch('/password/update')
  @UseGuards(JwtRoleAuthGuard)
  @Roles(Role.DRIVER, Role.PASSENGER)
  async updatePassword(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: UpdatePasswordDTO
  ) {
    await this.authService.updatePassword(res, req.user, body)
  }

  @Patch('/password/reset')
  async resetPassword(@Res() res: Response, @Body() body: ResetPasswordDTO) {
    await this.authService.resetPassword(res, body)
  }

  @ApiBearerAuth()
  @Put('/avatar/upload')
  @UseGuards(JwtRoleAuthGuard)
  @ApiConsumes('multipart/form-data')
  @Roles(Role.DRIVER, Role.PASSENGER)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({ summary: 'The form-data key should be avatar' })
  async uploadAvatar(
    @Req() req: IRequest,
    @Res() res: Response,
    @UploadedFile() file: Express.Multer.File
  ) {
    await this.authService.uploadAvatar(res, file, req.user)
  }

  @ApiBearerAuth()
  @Put('/emergency-contact')
  @UseGuards(JwtRoleAuthGuard)
  @Roles(Role.DRIVER, Role.PASSENGER)
  async emergencyContact(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: EmergencyContactDTO,
  ) {
    await this.authService.emergencyContact(res, req.user, body)
  }
}
