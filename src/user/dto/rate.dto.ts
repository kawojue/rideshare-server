import { RatingPoint } from 'enums/base'
import { ApiProperty } from '@nestjs/swagger'
import { InfiniteScrollDTO } from './pagination.dto'
import {
    IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength
} from 'class-validator'
import { Transform } from 'class-transformer'

export class RatingDTO {
    @ApiProperty({
        example: 'Well, and calm person'
    })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    @MaxLength(150)
    @Transform(({ value }) => value?.trim())
    review?: string

    @ApiProperty({
        enum: RatingPoint,
        description: 'It should either be 0NE, TWO, THREE, FOUR, FIVE - this stops overloading within the valid range'
    })
    @IsNotEmpty()
    @IsEnum(RatingPoint)
    point: RatingPoint
}

export class FetchRatingAndReviewsDTO extends InfiniteScrollDTO {
    @ApiProperty({
        enum: RatingPoint,
        description: 'It should either be 0NE, TWO, THREE, FOUR, FIVE - this stops overloading within the valid range'
    })
    @IsOptional()
    @IsEnum(RatingPoint)
    point: RatingPoint
}
