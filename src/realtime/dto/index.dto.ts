import {
    IsBase64,
    IsString,
    IsNotEmpty,
    IsOptional,
} from "class-validator"
import { v4 as uuidv4 } from 'uuid'
import { ApiProperty } from "@nestjs/swagger"


export class MessageDTO {
    @ApiProperty({
        example: '65b..'
    })
    @IsString()
    @IsNotEmpty()
    receiverId: string

    @ApiProperty({
        example: 'Why is it taking too long to reach your destination?'
    })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    content?: string

    @ApiProperty({
        example: 'base64 string. Image/video/audio'
    })
    @IsOptional()
    @IsBase64()
    file?: any
}

export class OnlineStatusDTO {
    @ApiProperty({
        example: uuidv4()
    })
    @IsString()
    @IsNotEmpty()
    targetUserId: string
}

export class GetInboxDTO {
    @ApiProperty({
        example: uuidv4()
    })
    @IsString()
    @IsNotEmpty()
    receiverId: string
}

export class FetchMessagesDTO {
    @ApiProperty({
        example: uuidv4()
    })
    @IsString()
    @IsNotEmpty()
    inboxId: string
}