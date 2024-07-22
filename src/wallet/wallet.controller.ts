import {
  Get,
  Req,
  Res,
  Body,
  Post,
  Query,
  Param,
  Controller,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
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
import { BankDetailsDTO, ValidateBankDTO } from './dto/bank.dto'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiTags("Wallet")
@Controller('wallet')
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

  @ApiBearerAuth()
  @Get('/linked-banks')
  @Roles(Role.DRIVER, Role.PASSENGER)
  async linkedBanks(@Req() req: IRequest, @Res() res: Response) {
    await this.walletService.linkedBanks(res, req.user)
  }

  @ApiBearerAuth()
  @Post('/linked-banks/add')
  @Roles(Role.PASSENGER, Role.DRIVER)
  async linkBankAccount(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: BankDetailsDTO
  ) {
    await this.walletService.linkBankAccount(res, req.user, body)
  }

  @ApiBearerAuth()
  @Get('/linked-banks/:id')
  @Roles(Role.PASSENGER, Role.DRIVER)
  async getLinkedBank(
    @Req() req: IRequest,
    @Res() res: Response,
    @Param('id') id: string,
  ) {
    await this.walletService.getLinkedBank(id, res, req.user)
  }

  @ApiBearerAuth()
  @Post('/deposit')
  @Roles(Role.PASSENGER, Role.DRIVER)
  async fundWallet(
    @Res() res: Response,
    @Req() req: IRequest,
    @Body() body: FundWalletDTO
  ) {
    await this.walletService.fundWallet(res, req.user, body)
  }

  @ApiBearerAuth()
  @Post('/request-withdrawal/:linkedBankId')
  async initiateWithdrawal(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: AmountDTO,
    @Param('linkedBankId') linkedBankId: string,
  ) {
    await this.walletService.requestWithrawal(res, linkedBankId, req.user, body)
  }

  @Post('/paystack/webhook')
  @ApiOperation({
    summary: "Ignore. It's for Transfer Webhook"
  })
  async manageFiatEvents(@Req() req: Request) {
    if (!req.body || !req.body?.event || !req.body?.data) {
      throw new BadRequestException('Invalid request body received')
    }

    const allowedIPAddresses = ['52.31.139.75', '52.49.173.169', '52.214.14.220']
    const ipAddress = getIPAddress(req)

    if (!allowedIPAddresses.includes(ipAddress)) {
      throw new UnauthorizedException("Unauthorized IP Address")
    }

    try {
      await this.walletService.enqueueRequest(req)
    } catch (err) {
      console.error(err)
      throw new InternalServerErrorException("Something went wrong")
    }
  }
}
