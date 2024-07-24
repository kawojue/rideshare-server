import { Chart } from 'enums/base'
import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsOptional } from 'class-validator'
import { Role, TransferStatus, TxType } from '@prisma/client'

export class ChartDTO {
    @ApiProperty({
        enum: Chart,
        required: false,
    })
    @IsOptional()
    @IsEnum(Chart)
    q?: Chart
}

export class UsersAnalyticsDTO extends ChartDTO {
    @ApiProperty({
        enum: Role,
        required: false,
    })
    @IsOptional()
    @IsEnum(Role)
    role?: Role
}

export class MoneyFlowDTO {
    @ApiProperty({
        enum: TransferStatus,
        required: false,
    })
    @IsOptional()
    @IsEnum(TransferStatus)
    status?: TransferStatus
}

export class MoneyFlowChartDTO extends ChartDTO {
    @ApiProperty({
        enum: TxType,
        required: false,
    })
    @IsOptional()
    @IsEnum(TxType)
    type?: TxType
}