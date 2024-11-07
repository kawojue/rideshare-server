import { JwtService } from '@nestjs/jwt';
import { config } from 'configs/env.config';
import { NestMiddleware } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { NextFunction, Request, Response } from 'express';

export class CustomAuthMiddleware implements NestMiddleware {
  private prisma: PrismaService;
  private jwtService: JwtService;

  constructor() {
    this.prisma = new PrismaService();
    this.jwtService = new JwtService();
  }

  private async validateAndDecodeToken(token: string) {
    try {
      return await this.jwtService.verifyAsync(token, {
        ignoreExpiration: false,
        secret: config.jwt.secret,
      });
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async use(req: Request, res: Response, next: NextFunction) {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.access_token;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (cookieToken) {
      token = cookieToken;
    }

    if (!token) {
      return next();
    }

    const decoded = await this.validateAndDecodeToken(token);
    if (!decoded) {
      return next();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user || user.status !== decoded.status) {
      return next();
    }

    req.user = {
      ...decoded,
      email: user?.email,
      phone: user?.phone,
      lastname: user?.lastname,
      firstname: user?.firstname,
      middlename: user?.middlename,
      regionCode: user?.regionCode,
      countryCode: user?.countryCode,
      customerCode: user?.customerCode,
    } as JwtDecoded;

    next();
  }
}
