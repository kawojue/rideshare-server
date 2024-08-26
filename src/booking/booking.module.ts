import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { BookingService } from './booking.service'
import { BookingController } from './booking.controller'

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService]
})
export class BookingModule { }
