import {
  Get,
  Req,
  Res,
  Body,
  Post,
  Query,
  Param,
  UseGuards,
  Controller,
  HttpException,
} from '@nestjs/common'
import { Role } from '@prisma/client'
import { Utils } from 'helpers/utils'
import { RealIP } from 'nestjs-real-ip'
import { Request, Response } from 'express'
import { Roles } from 'src/jwt/role.decorator'
import { StatusCodes } from 'enums/statusCodes'
import { WalletService } from './wallet.service'
import { ValidateBankDTO } from './dto/bank.dto'
import { ResponseService } from 'libs/response.service'
import { JwtRoleAuthGuard } from 'src/jwt/auth-role.guard'
import { GetAuthParam } from 'src/jwt/auth-param.decorator'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { RequestWidrawalDTO, FundWalletDTO, AmountDTO } from './dto/tx.dto'

@ApiBearerAuth()
@ApiTags("Wallet")
@Controller('wallet')
@UseGuards(JwtRoleAuthGuard)
export class WalletController {
  constructor(
    private readonly response: ResponseService,
    private readonly walletService: WalletService
  ) { }

  @Post('/fee')
  async fee(@Res() res: Response, @Body() { amount }: AmountDTO) {
    return this.response.sendSuccess(res, StatusCodes.OK, {
      data: Utils.calculateFees(amount)
    })
  }

  @Get('/verify/bank-details')
  async bankAccountVerification(@Res() res: Response, @Query() query: ValidateBankDTO) {
    const resoleveAccount = await this.walletService.bankAccountVerification(query)

    return this.response.sendSuccess(res, StatusCodes.OK, { data: resoleveAccount })
  }

  @Get('/fetch/banks')
  async fetchBanks(@Res() res: Response) {
    const banks = await this.walletService.fetchBanks()

    return this.response.sendSuccess(res, StatusCodes.OK, { data: banks })
  }

  @Get('/fetch/banks/:bankCode')
  async fetchBank(@Res() res: Response, @Param('bankCode') bankCode: string) {
    const bank = await this.walletService.fetchBankByBankCode(bankCode)

    return this.response.sendSuccess(res, StatusCodes.OK, { data: bank })
  }

  @Post('/deposit')
  @Roles(Role.PASSENGER, Role.DRIVER)
  async fundWallet(
    @Res() res: Response,
    @Body() body: FundWalletDTO,
    @GetAuthParam() auth: JwtDecoded,
  ) {
    const data = await this.walletService.fundWallet(auth, body)

    return this.response.sendSuccess(res, StatusCodes.OK, {
      data,
      message: "Successful"
    })
  }

  @Roles(Role.DRIVER)
  @Post('/request-withdrawal')
  async requestWithdrawal(
    @Res() res: Response,
    @Body() body: RequestWidrawalDTO,
    @GetAuthParam() auth: JwtDecoded,
  ) {
    const data = await this.walletService.requestWithdrawal(res, auth, body)

    return this.response.sendSuccess(res, StatusCodes.OK, data)
  }

  // @ApiOperation({
  //   summary: "Ignore."
  // })
  // @Post('/paystack/webhook')
  // async manageFiatEvents(@Res() res: Response, @Req() req: Request, @RealIP() ip: string) {
  //   if (!req.body || !req.body?.event || !req.body?.data) {
  //     throw new HttpException("Unauthorized IP Address", StatusCodes.BadRequest)
  //   }

  //   const allowedIPAddresses = ['52.31.139.75', '52.49.173.169', '52.214.14.220']

  //   if (!allowedIPAddresses.includes(ip)) {
  //     throw new HttpException("Unauthorized IP Address", StatusCodes.Unauthorized)
  //   }

  //   try {
  //     await this.walletService.enqueueRequest(req)
  //     res.sendStatus(StatusCodes.OK).end()
  //   } catch (err) {
  //     console.error(err)
  //     throw new HttpException("Something went wrong", StatusCodes.InternalServerError)
  //   }
  // }
}
