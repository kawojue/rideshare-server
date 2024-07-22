import { Chart } from 'enums/base'
import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsOptional } from 'class-validator'
import { Role, TransferStatus } from '@prisma/client'

export class ChartDTO {
    @ApiProperty({
        enum: Chart
    })
    @IsOptional()
    @IsEnum(Chart)
    q: Chart
}

export class UsersAnalyticsDTO extends ChartDTO {
    @ApiProperty({
        enum: Role
    })
    @IsOptional()
    @IsEnum(Role)
    role: Role
}

export class MoneyFlowDTO {
    @ApiProperty({
        enum: TransferStatus
    })
    @IsOptional()
    @IsEnum(TransferStatus)
    status?: TransferStatus
}