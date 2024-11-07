import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DriverService } from './driver.service';
import { PassportModule } from '@nestjs/passport';
import { DriverController } from './driver.controller';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Module({
  imports: [
    CloudinaryModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [DriverController],
  providers: [DriverService, ConfigService, CloudinaryService],
  exports: [DriverService],
})
export class DriverModule {}
