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
  OTPDTO,
  PinDTO,
  EmailDTO,
  SigninDTO,
  SignupDTO,
  ResetPasswordDTO,
  UpdatePasswordDTO,
  BiometricLoginDTO,
  EmergencyContractDTO,
} from './dto/auth.dto'
import { Role } from '@prisma/client'
import { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { Roles } from 'src/jwt/role.decorator'
import { StatusCodes } from 'enums/statusCodes'
import { ResponseService } from 'libs/response.service'
import { JwtRoleAuthGuard } from 'src/jwt/jwt-role.guard'
import { FileInterceptor } from '@nestjs/platform-express'
import { GoogleAuthGuard } from 'src/jwt/google-auth.guard'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiTags("Auth")
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly response: ResponseService,
  ) { }

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
    const data = await this.authService.googleSignin(req.user)

    this.response.sendSuccess(res, StatusCodes.OK, { data })
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

  @Post('/otp/verify')
  async verifyOtp(@Res() res: Response, @Body() body: OTPDTO) {
    await this.authService.verifyOtp(res, body)
  }

  @Post('/otp/request')
  async requestOtp(@Res() res: Response, @Body() body: EmailDTO) {
    await this.authService.requestOtp(res, body)
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
  @Post('/pin/create')
  @UseGuards(JwtRoleAuthGuard)
  @Roles(Role.DRIVER, Role.PASSENGER)
  async createTxPin(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: PinDTO,
  ) {
    await this.authService.createTxPin(res, req.user, body)
  }

  @ApiBearerAuth()
  @Put('/avatar/upload')
  @UseGuards(JwtRoleAuthGuard)
  @ApiConsumes('multipart/form-data')
  @Roles(Role.DRIVER, Role.PASSENGER)
  @ApiOperation({ summary: 'The form-data key should be avatar' })
  @UseInterceptors(FileInterceptor('avatar'))
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
    @Body() body: EmergencyContractDTO,
  ) {
    await this.authService.emergencyContact(res, req.user, body)
  }
}
