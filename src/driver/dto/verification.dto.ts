import {
    IsString,
    MaxLength,
    MinLength,
    IsNotEmpty,
} from "class-validator"
import { ApiProperty } from "@nestjs/swagger"
import { Transform } from "class-transformer"


export class VerificationDTO {
    @ApiProperty({
        example: '02730846093'
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(11)
    @MaxLength(11)
    nationalId: string

    @ApiProperty({
        example: 'SF895332826955L0'
    })
    @IsString()
    @IsNotEmpty()
    vnin: string

    @ApiProperty({
        example: 'AAA00000AA00'
    })
    @IsString()
    @IsNotEmpty()
    driverLicenseId: string

    @ApiProperty({
        example: new Date()
    })
    @IsNotEmpty()
    @IsString()
    @Transform(({ value }) => new Date(value))
    dob: Date

    @ApiProperty({
        type: 'string',
        format: 'binary'
    })
    proofOfAddress: Express.Multer.File
}