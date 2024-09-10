import {
  Put,
  Res,
  Body,
  Post,
  Param,
  Delete,
  UseGuards,
  Controller,
  UploadedFile,
  UseInterceptors,
  Patch,
} from '@nestjs/common'
import {
  ApiTags,
  ApiConsumes,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger'
import {
  DriverLicenseDTO,
  IDVerificationDTO,
  UploadProofOfAddressDTO,
} from './dto/verification.dto'
import { Response } from 'express'
import { Role } from '@prisma/client'
import { Roles } from 'src/jwt/role.decorator'
import { StatusCodes } from 'enums/statusCodes'
import { DriverService } from './driver.service'
import { ResponseService } from 'libs/response.service'
import { JwtRoleAuthGuard } from 'src/jwt/auth-role.guard'
import { FileInterceptor } from '@nestjs/platform-express'
import { GetAuthParam } from 'src/jwt/auth-param.decorator'
import { UpdateVehicleDTO, VehicleDTO } from './dto/vehicle.dto'

@ApiBearerAuth()
@ApiTags("Driver")
@Controller('driver')
@UseGuards(JwtRoleAuthGuard)
export class DriverController {
  constructor(
    private readonly response: ResponseService,
    private readonly driverService: DriverService,
  ) { }

  @Roles(Role.DRIVER)
  @Put('/verification/digital')
  async idVerification(
    @Res() res: Response,
    @Body() body: IDVerificationDTO,
    @GetAuthParam() auth: JwtDecoded,
  ) {
    const data = await this.driverService.idVerification(auth, body)

    return this.response.sendSuccess(res, StatusCodes.OK, { data })
  }

  @Roles(Role.DRIVER)
  @Put('/verification/driver-license')
  async driverLicenseVerification(
    @Res() res: Response,
    @Body() body: DriverLicenseDTO,
    @GetAuthParam() auth: JwtDecoded,
  ) {
    const data = await this.driverService.driverLicenseVerification(auth, body)

    return this.response.sendSuccess(res, StatusCodes.OK, { data })
  }

  @Roles(Role.DRIVER)
  @ApiConsumes('image/png', 'image/jpg')
  @Put('/verification/proof-of-address')
  @UseInterceptors(FileInterceptor('proofOfAddress'))
  @ApiOperation({ summary: 'The form-data key should be proofOfAddress' })
  async uploadProofOfAddress(
    @Res() res: Response,
    @GetAuthParam() auth: JwtDecoded,
    @Body() body: UploadProofOfAddressDTO,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const data = await this.driverService.uploadProofOfAddress(auth, file, body)

    return this.response.sendSuccess(res, StatusCodes.OK, {
      data,
      message: "Proof of Address has been submitted succesfully"
    })
  }

  @Post('/vehicle')
  @Roles(Role.DRIVER)
  @ApiConsumes('image/png', 'image/jpg')
  @UseInterceptors(FileInterceptor('agreement'))
  @ApiOperation({ summary: 'The form-data key should be agreement if the driver is not the owner' })
  async addVehicle(
    @Res() res: Response,
    @Body() body: VehicleDTO,
    @GetAuthParam() auth: JwtDecoded,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const data = await this.driverService.addVehicle(auth, body, file)

    return this.response.sendSuccess(res, StatusCodes.OK, { data })
  }

  @Roles(Role.DRIVER)
  @Patch('/vehicle/:vehicleId/update')
  async updateVehicle(
    @Res() res: Response,
    @Body() body: UpdateVehicleDTO,
    @GetAuthParam() auth: JwtDecoded,
    @Param('vehicleId') vehicleId: string,
  ) {
    const data = await this.driverService.updateVehicle(auth, vehicleId, body)

    return this.response.sendSuccess(res, StatusCodes.OK, { data })
  }

  @Delete('/vehicle/:vehicleId/delete')
  @Roles(Role.DRIVER, Role.ADMIN, Role.MODERATOR)
  async deleteVehicle(
    @Res() res: Response,
    @GetAuthParam() auth: JwtDecoded,
    @Param('vehicleId') vehicleId: string,
  ) {
    await this.driverService.deleteVehicle(auth, vehicleId)

    return this.response.sendNoContent(res)
  }
}
