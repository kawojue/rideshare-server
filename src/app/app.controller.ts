import { Request } from 'express'
import { RealIP } from 'nestjs-real-ip'
import { AppService } from './app.service'
import { Controller, Get, Req } from '@nestjs/common'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  base(@Req() req: Request, @RealIP() ip: string) {
    return this.appService.base(req, ip)
  }
}
