import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RealtimeService } from './realtime.service';
import { RealtimeGateway } from './realtime.gateway';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Module({
  providers: [
    RealtimeGateway,
    RealtimeService,
    CloudinaryService,
    ConfigService,
  ],
  exports: [RealtimeGateway, RealtimeService],
})
export class RealtimeModule {}
