import { Module } from '@nestjs/common'
import { config } from 'configs/env.config'
import { StoreService } from './store.service'
import { redisStore } from 'cache-manager-redis-store'
import { CacheModule, CacheStore } from '@nestjs/cache-manager'

@Module({
  providers: [StoreService],
  exports: [StoreService],
})
export class StoreModule { }