import {
  Put,
  Req,
  Res,
  Body,
  Post,
  Param,
  Delete,
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
import {
  DriverLicenseDTO,
  IDVerificationDTO,
} from './dto/verification.dto'
import { Response } from 'express'
import { Role } from '@prisma/client'
import { Roles } from 'src/jwt/role.decorator'
import { DriverService } from './driver.service'
import { JwtRoleAuthGuard } from 'src/jwt/auth-role.guard'
import { FileInterceptor } from '@nestjs/platform-express'
import { UpdateVehicleDTO, VehicleDTO } from './dto/vehicle.dto'

@ApiBearerAuth()
@ApiTags("Driver")
@Controller('driver')
@UseGuards(JwtRoleAuthGuard)
export class DriverController {
  constructor(private readonly driverService: DriverService) { }

  // @Roles(Role.DRIVER)
  // @Put('/verification/digital')
  // async idVerification(
  //   @Req() req: IRequest,
  //   @Res() res: Response,
  //   @Body() body: IDVerificationDTO
  // ) {
  //   await this.driverService.idVerification(res, req.user, body)
  // }

  // @Roles(Role.DRIVER)
  // @Put('/verification/driver-license')
  // async driverLicenseVerification(
  //   @Req() req: IRequest,
  //   @Res() res: Response,
  //   @Body() body: DriverLicenseDTO
  // ) {
  //   await this.driverService.driverLicenseVerification(res, req.user, body)
  // }

  // @Roles(Role.DRIVER)
  // @ApiConsumes('multipart/form-data')
  // @Put('/verification/proof-of-address')
  // @UseInterceptors(FileInterceptor('proofOfAddress'))
  // @ApiOperation({ summary: 'The form-data key should be proofOfAddress' })
  // async uploadProofOfAddress(
  //   @Req() req: IRequest,
  //   @Res() res: Response,
  //   @UploadedFile() file: Express.Multer.File,
  // ) {
  //   await this.driverService.uploadProofOfAddress(res, req.user, file)
  // }

  // @Post('/vehicle')
  // @Roles(Role.DRIVER)
  // @ApiConsumes('multipart/form-data')
  // @UseInterceptors(FileInterceptor('agreement'))
  // @ApiOperation({ summary: 'The form-data key should be agreement if the driver is not the owner' })
  // async addVehicle(
  //   @Req() req: IRequest,
  //   @Res() res: Response,
  //   @Body() body: VehicleDTO,
  //   @UploadedFile() file: Express.Multer.File,
  // ) {
  //   await this.driverService.addVehicle(res, req.user, body, file)
  // }

  // @Roles(Role.DRIVER)
  // @Post('/vehicle/:vehicleId/update')
  // @ApiConsumes('multipart/form-data')
  // @UseInterceptors(FileInterceptor('agreement'))
  // @ApiOperation({ summary: 'The form-data key should be agreement if the update requires an agreement' })
  // async updateVehicle(
  //   @Req() req: IRequest,
  //   @Res() res: Response,
  //   @Body() body: UpdateVehicleDTO,
  //   @Param('vehicleId') vehicleId: string,
  //   @UploadedFile() file: Express.Multer.File,
  // ) {
  //   await this.driverService.updateVehicle(res, req.user, vehicleId, body, file)
  // }


  // @Delete('/vehicle/:vehicleId/delete')
  // @Roles(Role.DRIVER, Role.ADMIN, Role.MODERATOR)
  // async deleteVehicle(
  //   @Req() req: IRequest,
  //   @Res() res: Response,
  //   @Param('vehicleId') vehicleId: string,
  // ) {
  //   await this.driverService.deleteVehicle(res, req.user, vehicleId)
  // }
}
