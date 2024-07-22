import { IsEnum } from 'class-validator'
import { PayoutAction } from 'enums/base'
import { ApiProperty } from '@nestjs/swagger'

export class WithdrawalRequestDTO {
    @ApiProperty({
        enum: PayoutAction
    })
    @IsEnum(PayoutAction)
    action: PayoutAction
}