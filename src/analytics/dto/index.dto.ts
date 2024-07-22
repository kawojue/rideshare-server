import { Chart } from 'enums/base'
import { Role } from '@prisma/client'
import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsOptional } from 'class-validator'

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