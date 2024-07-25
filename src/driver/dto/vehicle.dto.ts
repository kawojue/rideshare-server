import { Transform } from "class-transformer"
import { PartialType } from "@nestjs/mapped-types"
import { titleText, toUpperCase } from "helpers/transformer"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { IsString, IsOptional, IsNotEmpty, ValidateIf } from 'class-validator'

export class VehicleDTO {
    @ApiProperty({
        example: 'Tesla',
    })
    @IsString()
    @IsNotEmpty()
    brand: string

    @ApiProperty({
        example: 'Model S',
    })
    @IsString()
    @IsNotEmpty()
    model: string

    @ApiProperty({
        example: 'Sedan',
    })
    @IsString()
    @IsNotEmpty()
    classification: string

    @ApiPropertyOptional({
        example: '2020',
    })
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value !== undefined ? value.toString() : undefined)
    year?: string

    @ApiProperty({
        example: 'Red',
    })
    @IsString()
    @IsNotEmpty()
    color: string

    @ApiProperty({
        example: 4
    })
    @IsNotEmpty()
    @Transform(({ value }) => parseInt(value, 10))
    seatNumber: number

    @ApiProperty({
        example: '1HGCM82633A123456',
        required: false
    })
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    @Transform(({ value }) => toUpperCase(value))
    vin: string

    @ApiProperty({
        example: 'ABC1234',
    })
    @IsString()
    @IsNotEmpty()
    plateNumber: string

    @ApiProperty({
        example: true,
    })
    @IsNotEmpty()
    @Transform(({ value }) => value === "true")
    isOwner: boolean

    @ApiPropertyOptional({
        example: 'John Doe',
    })
    @IsString()
    @ValidateIf(o => !o.isOwner)
    @IsNotEmpty()
    @Transform(({ value }) => titleText(value))
    ownerName?: string

    @ApiPropertyOptional({
        example: '08131911964',
    })
    @IsString()
    @ValidateIf(o => !o.isOwner)
    @IsNotEmpty()
    ownerPhoneNumber?: string

    @ApiPropertyOptional({
        example: true,
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
