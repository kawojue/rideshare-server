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
import { Request, Response } from 'express'
import { Roles } from 'src/jwt/role.decorator'
import { StatusCodes } from 'enums/statusCodes'
import { MiscService } from 'libs/misc.service'
import { WalletService } from './wallet.service'
import { getIPAddress } from 'helpers/getIPAddress'
import { AmountDTO, FundWalletDTO } from './dto/tx.dto'
import { ResponseService } from 'libs/response.service'
import { JwtRoleAuthGuard } from 'src/jwt/jwt-role.guard'
import { BankDetailsDTO, ValidateBankDTO } from './dto/bank.dto'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiBearerAuth()
@ApiTags("Wallet")
@Controller('wallet')
@UseGuards(JwtRoleAuthGuard)
export class WalletController {
  constructor(
    private readonly misc: MiscService,
    private readonly response: ResponseService,
    private readonly walletService: WalletService
  ) { }

  @Post('/fee')
  async fee(@Res() res: Response, @Body() { amount }: AmountDTO) {
    this.response.sendSuccess(res, StatusCodes.OK, {
      data: await this.misc.calculateFees(amount)
    })
  }

  @Get('/verify/bank-details')
  async bankAccountVerification(@Res() res: Response, @Query() query: ValidateBankDTO) {
    await this.walletService.bankAccountVerification(res, query)
  }

  @Get('/fetch/banks')
  async fetchBanks(@Res() res: Response) {
    await this.walletService.fetchBanks(res)
  }

  @Get('/fetch/banks/:bankCode')
  async fetchBank(@Res() res: Response, @Param('bankCode') bankCode: string) {
    await this.walletService.fetchBankByBankCode(res, bankCode)
  }


  @Get('/linked-banks')
  @Roles(Role.DRIVER, Role.PASSENGER)
  async linkedBanks(@Req() req: IRequest, @Res() res: Response) {
    await this.walletService.linkedBanks(res, req.user)
  }


  @Post('/linked-banks/add')
  @Roles(Role.PASSENGER, Role.DRIVER)
  async linkBankAccount(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: BankDetailsDTO
  ) {
    await this.walletService.linkBankAccount(res, req.user, body)
  }


  @Get('/linked-banks/:id')
  @Roles(Role.PASSENGER, Role.DRIVER)
  async getLinkedBank(
    @Req() req: IRequest,
    @Res() res: Response,
    @Param('id') id: string,
  ) {
    await this.walletService.getLinkedBank(id, res, req.user)
  }


  @Post('/deposit')
  @Roles(Role.PASSENGER, Role.DRIVER)
  async fundWallet(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: FundWalletDTO
  ) {
    await this.walletService.fundWallet(res, req.user, body)
  }


  @Post('/request-withdrawal/:linkedBankId')
  async initiateWithdrawal(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: AmountDTO,
    @Param('linkedBankId') linkedBankId: string,
  ) {
    await this.walletService.requestWithrawal(res, linkedBankId, req.user, body)
  }

  @ApiOperation({
    summary: "Ignore. It's for Transfer Webhook"
  })
  @Post('/paystack/webhook')
  async manageFiatEvents(@Req() req: Request) {
    if (!req.body || !req.body?.event || !req.body?.data) {
      throw new HttpException("Unauthorized IP Address", StatusCodes.BadRequest)
    }

    const allowedIPAddresses = ['52.31.139.75', '52.49.173.169', '52.214.14.220']
    const ipAddress = getIPAddress(req)

    if (!allowedIPAddresses.includes(ipAddress)) {
      throw new HttpException("Unauthorized IP Address", StatusCodes.Unauthorized)
    }

    try {
      await this.walletService.enqueueRequest(req)
    } catch (err) {
      console.error(err)
      throw new HttpException("Something went wrong", StatusCodes.InternalServerError)
    }
  }
}
