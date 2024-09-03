import { Module } from '@nestjs/common'
import { ApiService } from './api.service'
import { HttpModule } from '@nestjs/axios'

@Module({
  imports: [HttpModule],
  providers: [ApiService],
  exports: [ApiService]
})
export class ApiModule { }
