import { Module } from '@nestjs/common';
import { DriverService } from './driver.service';
import { PassportModule } from '@nestjs/passport';
import { DriverController } from './driver.controller';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [
    CloudinaryModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [DriverController],
  providers: [DriverService],
  exports: [DriverService],
})
export class DriverModule {}
