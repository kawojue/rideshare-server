import { Module } from '@nestjs/common';
import { UsersService } from './user.service';
import { PassportModule } from '@nestjs/passport';
import { UsersController } from './users.controller';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
