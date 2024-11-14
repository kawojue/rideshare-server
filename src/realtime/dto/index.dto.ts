import {
  IsUUID,
  IsBase64,
  IsString,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { randomUUID } from 'crypto';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationBaseDTO } from 'src/app/dto/pagination.dto';

export class MessageDTO {
  @ApiProperty({
    example: '65b..',
  })
  @IsUUID()
  @IsString()
  @IsNotEmpty()
  receiverId: string;

  @ApiProperty({
    example: 'Why is it taking too long to reach your destination?',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  content?: string;

  @ApiProperty({
    example: 'base64 string. Image/video/audio',
  })
  @IsOptional()
  @IsBase64()
  file?: any;
}

export class OnlineStatusDTO {
  @ApiProperty({
    example: randomUUID(),
  })
  @IsUUID()
  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}

export class ReceiverDTO {
  @ApiProperty({
    example: randomUUID(),
  })
  @IsUUID()
  @IsString()
  @IsNotEmpty()
  receiverId: string;
}

export class FetchMessagesDTO extends PaginationBaseDTO {
  @ApiProperty({
    example: randomUUID(),
  })
  @IsUUID()
  @IsString()
  @IsNotEmpty()
  inboxId: string;
}

export class CallerDTO {
  @ApiProperty({
    example: randomUUID(),
  })
  @IsUUID()
  @IsString()
  @IsNotEmpty()
  callerId: string;
}
