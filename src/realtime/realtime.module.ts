import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RealtimeService } from './realtime.service';
import { RealtimeGateway } from './realtime.gateway';
import { StoreModule } from 'src/store/store.module';
import { PrismaService } from 'prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Module({
  imports: [StoreModule],
  providers: [
    RealtimeGateway,
    RealtimeService,
    CloudinaryService,
    PrismaService,
    ConfigService,
    JwtService,
  ],
  exports: [RealtimeGateway, RealtimeService],
})
export class RealtimeModule {}
