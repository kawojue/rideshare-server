import { StoreService } from './store.service';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  providers: [StoreService],
  exports: [StoreService],
})
export class StoreModule {}
