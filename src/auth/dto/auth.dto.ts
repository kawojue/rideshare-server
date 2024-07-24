import { UserEnum } from 'enums/base'
import { Gender } from '@prisma/client'
import {
    IsEmail, IsEnum, IsNotEmpty, IsOptional,
    IsString, Matches, MaxLength, MinLength,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { normalizePhoneNumber } from 'helpers/generators'
import { titleText, toLowerCase } from 'helpers/transformer'

export class EmailDTO {
    @ApiProperty({ example: 'kawojue08@gmail.com' })
    @IsEmail()
    @IsNotEmpty()
    @Transform(({ value }) => toLowerCase(value))
    email: string
}

export class OTPDTO {
    @ApiProperty({
        example: '234517'
    })
    @IsString()
    @Matches(/^\d{6}$/, {
        message: 'OTP must be a 6-digit number'
    })
    otp: string
}

export class ResetPasswordDTO extends EmailDTO {
    @ApiProperty({ example: '^MyPswd123' })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @MaxLength(42)
    newPassword: string

    @ApiProperty({
        example: '234517'
    })
    @IsString()
    @Matches(/^\d{6}$/, {
        message: 'OTP must be a 6-digit number'
    })
    otp: string
}

export class SigninDTO {
    @ApiProperty({
        example: '08131911964 / kawojue08@gmail.com'
    })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => toLowerCase(value))
    identifier: string

    @ApiProperty({ example: '^MyPswd123' })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @MaxLength(42)
    password: string
}

export class SignupDTO extends EmailDTO {
    @ApiProperty({
        example: 'Raheem'
    })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => titleText(value))
    firstname: string

    @ApiProperty({
        example: 'Kawojue'
    })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => titleText(value))
    lastname: string

    @ApiProperty({
        example: 'Muyiwa'
    })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    @Transform(({ value }) => titleText(value))
    middlename: string

    @ApiProperty({
        enum: UserEnum
    })
    @IsString()
    @IsNotEmpty()
    @IsEnum(UserEnum)
    as: UserEnum

    @ApiProperty({ example: '^MyPswd123' })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @MaxLength(42)
    password: string

    @ApiProperty({
        example: '08131911964'
    })
    @IsString()
    @IsNotEmpty()
    phone: string

    @ApiProperty({
        enum: Gender
    })
    @IsString()
    @IsNotEmpty()
    @IsEnum(Gender)
    gender: Gender

    @ApiProperty({
        example: 'My house address'
    })
    @IsString()
    @IsNotEmpty()
    address: string
}

export class BiometricLoginDTO {
    @ApiProperty({
        example:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    })
    @IsString()
    @IsNotEmpty()
    access_token: string
}

export class UpdatePasswordDTO {
    @ApiProperty({ example: '^MyPswd123' })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @MaxLength(42)
    oldPassword: string

    @ApiProperty({ example: 'MyPswd123' })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @MaxLength(42)
    password1: string

    @ApiProperty({ example: 'MyPswd123' })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @MaxLength(42)
    password2: string
}

export class EmergencyContactDTO {
    @ApiProperty({
        example: 'Raheem Kawojue'
    })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => titleText(value))
    name: string

    @ApiProperty({
        example: '08131911964'
    })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => normalizePhoneNumber(value))
    phone: string
}