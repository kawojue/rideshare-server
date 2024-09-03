import { Request } from 'express'
import { UAParser } from 'ua-parser-js'
import { Injectable } from '@nestjs/common'

@Injectable()
export class AppService {
  base(req: Request, ip: string) {
    const parser = new UAParser(req.headers['user-agent']).getResult()

    const os = parser.os.name
    const device = parser.device.model
    const cpu = parser.cpu.architecture
    const browser = parser.browser.name
    const deviceType = parser.device.type

    return { ip, os, device, browser, deviceType, cpu }
  }
}
