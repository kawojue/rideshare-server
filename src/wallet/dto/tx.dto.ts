import {
    IsString,
    IsNotEmpty,
} from "class-validator"
import { ValidateBankDTO } from "./bank.dto"
import { Transform } from "class-transformer"
import { ApiProperty } from "@nestjs/swagger"

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

export class RequestWidrawalDTO extends ValidateBankDTO {
    @ApiProperty({
        example: 2000.23,
    })
    @IsNotEmpty()
    @Transform(({ value }) => Number(value))
    amount: number
}