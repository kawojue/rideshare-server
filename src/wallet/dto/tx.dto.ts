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

export class InitiateWithdrawalDTO extends AmountDTO {
    @ApiProperty({
        example: '1234',
    })
    @IsString()
    @MinLength(4)
    @MaxLength(4)
    @IsOptional()
    pin?: string

    @ApiProperty({
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    })
    @IsString()
    @IsOptional()
    biometricToken?: string
}

export class FundWalletDTO {
    @ApiProperty({
        example: 'ref-fdknvkdnv-dvkdnv'
    })
    @IsString()
    @IsNotEmpty()
    reference: string
}