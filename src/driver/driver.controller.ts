import {
  Put,
  Req,
  Res,
  Body,
  Post,
  UseGuards,
  Controller,
  UploadedFile,
  UseInterceptors,
  Param,
  Delete,
} from '@nestjs/common'
import {
  ApiTags,
  ApiConsumes,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { Response } from 'express'
import { Role } from '@prisma/client'
import { Roles } from 'src/jwt/role.decorator'
import { VehicleDTO } from './dto/vehicle.dto'
import { DriverService } from './driver.service'
import { VerificationDTO } from './dto/verification.dto'
import { JwtRoleAuthGuard } from 'src/jwt/jwt-role.guard'
import { FileInterceptor } from '@nestjs/platform-express'

@ApiTags("Driver")
@Controller('driver')
export class DriverController {
  constructor(private readonly driverService: DriverService) { }

  @ApiBearerAuth()
  @Roles(Role.DRIVER)
  @Put('/doc-verification')
  @UseGuards(JwtRoleAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'The form-data key should be proofOfAddress' })
  @UseInterceptors(FileInterceptor('proofOfAddress'))
  async verification(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: VerificationDTO,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.driverService.verification(res, req.user, file, body)
  }

  @ApiBearerAuth()
  @Post('/vehicle')
  @Roles(Role.DRIVER)
  @UseGuards(JwtRoleAuthGuard)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('agreement'))
  @ApiOperation({ summary: 'The form-data key should be agreement if the driver is not the owner' })
  async addVehicle(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: VehicleDTO,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.driverService.addVehicle(res, req.user, body, file)
  }

  @ApiBearerAuth()
  @Roles(Role.DRIVER)
  @UseGuards(JwtRoleAuthGuard)
  @Post('/vehicle/:vehicleId/update')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('agreement'))
  @ApiOperation({ summary: 'The form-data key should be agreement if the update requires an agreement' })
  async updateVehicle(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: VehicleDTO,
    @Param('vehicleId') vehicleId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.driverService.updateVehicle(res, req.user, vehicleId, body, file)
  }

  @ApiBearerAuth()
  @Roles(Role.DRIVER, Role.ADMIN, Role.MODERATOR)
  @UseGuards(JwtRoleAuthGuard)
  @Delete('/vehicle/:vehicleId/delete')
  async deleteVehicle(
    @Req() req: IRequest,
    @Res() res: Response,
    @Param('vehicleId') vehicleId: string,
  ) {
    await this.driverService.deleteVehicle(res, req.user, vehicleId)
  }
}
