import {
  SigninDTO,
  OnboardingDTO,
  GoogleSigninDTO,
  VerifySigninDTO,
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
import { Utils } from 'helpers/utils'
import { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { Roles } from 'src/jwt/role.decorator'
import { StatusCodes } from 'enums/statusCodes'
import { ResponseService } from 'libs/response.service'
import { JwtRoleAuthGuard } from 'src/jwt/auth-role.guard'
import { OnboardingGuard } from 'src/jwt/onboarding.guard'
import { FileInterceptor } from '@nestjs/platform-express'
import { GetAuthParam } from 'src/jwt/auth-param.decorator'

@ApiTags("Auth")
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly response: ResponseService,
  ) { }

  @Post('/send-otp')
  async sendOtp(@Res() res: Response, @Body() body: SigninDTO) {
    const data = await this.authService.sendOtp(body)

    return this.response.sendSuccess(res, StatusCodes.OK, { data })
  }

  @Post('/signin')
  async signin(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: VerifySigninDTO
  ) {
    const data = await this.authService.verifySignin(req, body)

    await this.authService.setCookie(res, data)

    Utils.sanitizeData<typeof data>(data, ['refresh_token'])
    return this.response.sendSuccess(res, StatusCodes.Created, { data })
  }

  @Get('google/signin')
  async googleSignin(
    @Res() res: Response,
    @Req() req: Request,
    @Body() body: GoogleSigninDTO
  ) {
    const data = await this.authService.verifyGoogleSignin(req, body)

    await this.authService.setCookie(res, data)

    Utils.sanitizeData<typeof data>(data, ['refresh_token'])
    return this.response.sendSuccess(res, StatusCodes.OK, { data })
  }

  @Post('/biometric/signin')
  async biometricSignin(@Res() res: Response, @Body() body: BiometricLoginDTO) {
    const data = await this.authService.biometricSignin(body)

    return this.response.sendSuccess(res, StatusCodes.OK, { data })
  }

  @ApiBearerAuth()
  @Post('/onboarding')
  @UseGuards(OnboardingGuard)
  async onboarding(
    @Res() res: Response,
    @Body() body: OnboardingDTO,
    @GetAuthParam() auth: JwtDecoded,
  ) {
    const data = await this.authService.onboarding(auth, body)

    await this.authService.setCookie(res, data)

    Utils.sanitizeData<typeof data>(data, ['refresh_token'])
    return this.response.sendSuccess(res, StatusCodes.OK, { data })
  }

  @ApiBearerAuth()
  @Patch('/biometric/toggle')
  @UseGuards(JwtRoleAuthGuard)
  @Roles(Role.DRIVER, Role.PASSENGER)
  async toggleBiometric(@Res() res: Response, @GetAuthParam() auth: JwtDecoded) {
    const { profile: data } = await this.authService.toggleBiometric(auth)

    return this.response.sendSuccess(res, StatusCodes.OK, { data })
  }

  @Post('/refresh/access-token')
  async refreshAccessToken(@Res() res: Response, @Req() req: Request) {
    const data = await this.authService.refreshAccessToken(req)

    return this.response.sendSuccess(res, StatusCodes.OK, { data })
  }

  @ApiBearerAuth()
  @Put('/avatar/upload')
  @UseGuards(JwtRoleAuthGuard)
  @ApiConsumes('multipart/form-data')
  @Roles(Role.DRIVER, Role.PASSENGER)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({ summary: 'The form-data key should be avatar' })
  async uploadAvatar(
    @Res() res: Response,
    @GetAuthParam() auth: JwtDecoded,
    @UploadedFile() file: Express.Multer.File
  ) {
    const payload = await this.authService.uploadAvatar(file, auth)

    return this.response.sendSuccess(res, StatusCodes.OK, { data: payload })
  }

  @ApiBearerAuth()
  @Post('/emergency-contact')
  @UseGuards(JwtRoleAuthGuard)
  @Roles(Role.DRIVER, Role.PASSENGER)
  async emergencyContact(
    @Res() res: Response,
    @GetAuthParam() auth: JwtDecoded,
    @Body() body: EmergencyContactDTO,
  ) {
    const data = await this.authService.emergencyContact(auth, body)

    return this.response.sendSuccess(res, StatusCodes.Created, { data })
  }
}
