
import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { toLowerCase } from 'helpers/transformer'
import { IsEnum, IsOptional, IsString } from 'class-validator'

export class SearchDTO {
    @ApiProperty({
        example: ' '
    })
    @IsString()
    @IsOptional()
    @Transform(({ value }) => toLowerCase(value))
    search?: string
}

export class InfiniteScrollDTO extends SearchDTO {
    @ApiProperty({
        example: 1
    })
    @IsOptional()
    page?: number

    @ApiProperty({
        example: 27
    })
    @IsOptional()
    limit?: number
}