import {
    IsString,
    IsNotEmpty,
    IsOptional,
    MaxLength,
    MinLength,
} from "class-validator"
import { ApiProperty } from "@nestjs/swagger"
import { Transform } from "class-transformer"

export class AmountDTO {
    @ApiProperty({
        example: 2000.23,
    })
    @IsNotEmpty()
    @Transform(({ value }) => Number(value))
    amount: number
}

export class FundWalletDTO {
    @ApiProperty({
        example: 'ref-fdknvkdnv-dvkdnv'
    })
    @IsString()
    @IsNotEmpty()
    reference: string
}