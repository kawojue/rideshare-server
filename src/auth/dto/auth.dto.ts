import {
    IsEnum,
    Matches,
    IsEmail,
    IsString,
    IsNotEmpty,
    IsOptional,
} from 'class-validator'
import { UserEnum } from 'enums/base'
import { Utils } from 'helpers/utils'
import { Gender } from '@prisma/client'
import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'

export class EmailDTO {
    @ApiProperty({ example: 'kawojue08@gmail.com' })
    @IsEmail()
    @IsNotEmpty()
    @Transform(({ value }) => Utils.toLowerCase(value))
    email: string
}

export class SigninDTO {
    @ApiProperty({
        example: '08131911964 / kawojue08@gmail.com',
        description: 'This could be a phone number or email'
    })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => Utils.toLowerCase(value))
    identifier: string
}

export class OTPDTO extends SigninDTO {
    @ApiProperty({
        example: '2347'
    })
    @IsString()
    @Matches(/^\d{4}$/, {
        message: 'OTP must be a 6-digit number'
    })
    otp: string
}

export class MobileDeviceDTO {
    @ApiProperty({
        example: 'qwertyazerkwa',
        required: false
    })
    notificationToken?: string

    @ApiProperty({
        example: 'asdfglkjhg'
    })
    deviceId: string
}

export class VerifySigninDTO extends OTPDTO {
    @ApiProperty({
        example: 'qwertyazerkwa',
        required: false
    })
    notificationToken?: string

    @ApiProperty({
        example: 'asdfglkjhg'
    })
    deviceId: string
}

export class OnboardingDTO extends EmailDTO {
    @ApiProperty({
        example: 'Raheem'
    })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => Utils.titleText(value))
    firstname: string

    @ApiProperty({
        example: 'Kawojue'
    })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => Utils.titleText(value))
    lastname: string

    @ApiProperty({
        example: 'Muyiwa',
        required: false,
    })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    @Transform(({ value }) => Utils.titleText(value))
    middlename: string

    @ApiProperty({
        enum: UserEnum
    })
    @IsString()
    @IsNotEmpty()
    @IsEnum(UserEnum)
    as: UserEnum

    @ApiProperty({
        enum: Gender
    })
    @IsString()
    @IsNotEmpty()
    @IsEnum(Gender)
    gender: Gender

    @ApiProperty({
        example: 'My house address',
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

export class EmergencyContactDTO {
    @ApiProperty({
        example: 'Raheem Kawojue'
    })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => Utils.titleText(value))
    fullname: string

    @ApiProperty({
        example: '+2348131911964',
        required: false,
    })
    @IsString()
    @IsOptional()
    phone?: string

    @ApiProperty({
        example: 'kawojue08@gmail.com',
        required: false,
    })
    @IsEmail()
    @IsOptional()
    email?: string

    @ApiProperty({
        example: 'My house address',
        required: false
    })
    @IsString()
    @IsOptional()
    address?: string
}

export class GoogleSigninDTO extends MobileDeviceDTO {
    @ApiProperty({
        example: 'xyzcomprom'
    })
    @IsString()
    @IsNotEmpty()
    idToken: string
}