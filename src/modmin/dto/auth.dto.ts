import {
    IsEnum,
    IsString,
    MaxLength,
    MinLength,
    IsNotEmpty,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { titleText } from 'helpers/transformer'
import { EmailDTO } from 'src/auth/dto/auth.dto'

enum Role {
    ADMIN = "ADMIN",
    MODERATOR = "MODERATOR",
}

export class LoginDTO extends EmailDTO {
    @ApiProperty({ example: '^MyPswd123' })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @MaxLength(42)
    password: string
}

export class InviteNewModminDTO extends LoginDTO {
    @ApiProperty({
        example: 'Raheem Kawojue'
    })
    @IsNotEmpty()
    @Transform(({ value }) => titleText(value))
    fullname: string

    @ApiProperty({
        enum: Role
    })
    @IsEnum(Role)
    @IsNotEmpty()
    role: Role
}