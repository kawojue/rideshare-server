import {
    IsString,
    MaxLength,
    IsOptional,
    IsNotEmpty,
    ValidateIf,
} from 'class-validator'
import { Utils } from "helpers/utils"
import { Transform } from "class-transformer"
import { PartialType } from "@nestjs/mapped-types"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"

export class VehicleDTO {
    @ApiProperty({
        example: 'Has no tires but manageable',
        required: false
    })
    @IsString()
    @MaxLength(150)
    description?: string

    @ApiPropertyOptional({
        example: '2020',
        required: false,
    })
    @IsString()
    @IsOptional()
    year?: string

    @ApiProperty({
        example: 'Red',
        required: false,
    })
    @IsString()
    color?: string

    @ApiProperty({
        example: 4
    })
    @IsNotEmpty()
    @Transform(({ value }) => parseInt(value, 10))
    seatNumber: number

    @ApiProperty({
        example: 'ABC1234',
    })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => Utils.replaceSpaces(Utils.toUpperCase(value)))
    plateNumber: string

    @ApiProperty({
        example: true,
    })
    @IsNotEmpty()
    @Transform(({ value }) => value === "true")
    isOwner: boolean

    @ApiPropertyOptional({
        example: 'John Doe',
        required: false,
    })
    @IsString()
    @ValidateIf(o => !o.isOwner)
    @Transform(({ value }) => Utils.titleText(value))
    ownerName?: string

    @ApiPropertyOptional({
        example: '08131911964',
        required: false,
    })
    @IsString()
    @ValidateIf(o => !o.isOwner)
    ownerPhoneNo?: string

    @ApiPropertyOptional({
        example: true,
        required: false,
    })
    @IsOptional()
    @Transform(({ value }) => value === "true")
    wifi?: boolean

    @ApiPropertyOptional({
        example: true,
    })
    @IsOptional()
    @Transform(({ value }) => value === "true")
    music?: boolean

    @ApiPropertyOptional({
        example: true,
    })
    @IsOptional()
    @Transform(({ value }) => value === "true")
    phoneCharger?: boolean

    @ApiPropertyOptional({
        example: false,
    })
    @IsOptional()
    @Transform(({ value }) => value === "true")
    temperatureControl?: boolean

    @ApiPropertyOptional({
        type: 'string',
        format: 'binary',
    })
    @IsOptional()
    agreementDocument?: Express.Multer.File
}

export class UpdateVehicleDTO extends PartialType(VehicleDTO) { }
