import {
    IsEnum,
    IsString,
    IsNotEmpty,
} from "class-validator"
import { IDType } from "@prisma/client"
import { ApiProperty } from "@nestjs/swagger"

export class IDVerificationDTO {
    @ApiProperty({
        example: '02730846093'
    })
    @IsString()
    @IsNotEmpty()
    idNumber: string

    @ApiProperty({
        example: new Date()
    })
    @IsString()
    @IsNotEmpty()
    dob: string

    @ApiProperty({
        enum: IDType
    })
    @IsNotEmpty()
    @IsEnum(IDType)
    idType: IDType
}

export class DriverLicenseDTO {
    @ApiProperty({
        example: '02730846093'
    })
    @IsString()
    @IsNotEmpty()
    licenseNumber: string

    @ApiProperty({
        example: new Date()
    })
    @IsString()
    @IsNotEmpty()
    dob: string
}