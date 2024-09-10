import {
    IsEnum,
    IsString,
    IsNotEmpty,
    IsOptional,
} from "class-validator"
import { IDType } from "@prisma/client"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"

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

export class UploadProofOfAddressDTO {
    @ApiPropertyOptional({
        example: 'Opp. General Hospital',
        description: 'This is just an option for the driver to type in a popular landmark'
    })
    landmark?: string

    @ApiPropertyOptional({
        type: 'string',
        format: 'binary',
    })
    @IsOptional()
    file?: Express.Multer.File
}