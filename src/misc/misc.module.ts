import { JwtModule } from '@nestjs/jwt';
import { config } from 'configs/env.config';
import { MiscService } from './misc.service';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  imports: [JwtModule.register({ secret: config.jwt.secret })],
  providers: [MiscService],
  exports: [MiscService],
})
export class MiscModule {}
