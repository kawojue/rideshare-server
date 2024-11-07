import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AppService } from './app.service';
import { config } from 'configs/env.config';
import { ConfigModule } from '@nestjs/config';
import { ApiModule } from 'src/api/api.module';
import { AppController } from './app.controller';
import { AuthModule } from 'src/auth/auth.module';
import { MiscModule } from 'src/misc/misc.module';
import { PrismaModule } from 'prisma/prisma.module';
import { UsersModule } from 'src/users/users.module';
import { QueueModule } from 'src/queue/queue.module';
import { StoreModule } from 'src/store/store.module';
import { redisStore } from 'cache-manager-redis-store';
import { DriverModule } from 'src/driver/driver.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { ModminModule } from 'src/modmin/modmin.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RealtimeModule } from 'src/realtime/realtime.module';
import { ResponseModule } from 'src/response/response.module';
import cloudinaryConfig from 'src/cloudinary/cloudinary.config';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { AnalyticsModule } from 'src/analytics/analytics.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    ApiModule,
    MiscModule,
    AuthModule,
    UsersModule,
    QueueModule,
    StoreModule,
    DriverModule,
    PrismaModule,
    WalletModule,
    ModminModule,
    RealtimeModule,
    ResponseModule,
    AnalyticsModule,
    CloudinaryModule,
    NotificationModule,
    ConfigModule.forRoot({
      load: [cloudinaryConfig],
    }),
    EventEmitterModule.forRoot({
      global: true,
    }),
    BullModule.forRoot(
      config.isProd
        ? {
            redis: {
              ...(config.redis.username &&
                config.redis.password && {
                  password: config.redis.password,
                  username: config.redis.username,
                }),
              host: config.redis.host,
              port: config.redis.port,
              db: config.redis.database,
            },
          }
        : { url: config.redis.url },
    ),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const store = await redisStore(
          config.isProd
            ? {
                ...(config.redis.username &&
                  config.redis.password && {
                    password: config.redis.password,
                    username: config.redis.username,
                  }),
                socket: {
                  host: config.redis.host,
                  port: config.redis.port,
                },
                pingInterval: 100,
                store: undefined,
              }
            : {
                store: undefined,
                url: config.redis.url,
              },
        );
        return {
          max: Infinity,
          ttl: 14 * 24 * 60 * 60,
          store: store as unknown as CacheStore,
        };
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [AppService],
})
export class AppModule {}
