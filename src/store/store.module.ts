import { Module } from '@nestjs/common'
import { config } from 'configs/env.config'
import { StoreService } from './store.service'
import { redisStore } from 'cache-manager-redis-store'
import { CacheModule, CacheStore } from '@nestjs/cache-manager'

@Module({
  imports: [
    CacheModule.registerAsync({
      useFactory: async () => {
        const store = await redisStore({
          ...(config.redis.username && {
            username: config.redis.username,
          }),
          database: config.redis.database,
          password: config.redis.password,
          socket: {
            host: config.redis.host,
            port: config.redis.port,
          },
        })

        return {
          max: Infinity,
          store: store as unknown as CacheStore,
          ttl: 7 * 24 * 60 * 60 * 1000,
        }
      },
    }),
  ],
  providers: [StoreService],
  exports: [StoreService],
})
export class StoreModule { }