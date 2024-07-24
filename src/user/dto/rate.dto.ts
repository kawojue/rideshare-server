import { RatingPoint } from 'enums/base'
import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { InfiniteScrollDTO } from './pagination.dto'
import {
    IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength
} from 'class-validator'

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
        example: "ONE",
    })
    @IsNotEmpty()
    @Transform(({ value }) => Number(RatingPoint[value]))
    @IsEnum(RatingPoint, {
        message: "point must be one of the following values: 0NE, TWO, THREE, FOUR, FIVE"
    })
    point: RatingPoint
}

export class FetchRatingAndReviewsDTO extends InfiniteScrollDTO {
    @ApiProperty({
        example: "THREE",
        required: false,
    })
    @IsOptional()
    @Transform(({ value }) => Number(RatingPoint[value]))
    @IsEnum(RatingPoint, {
        message: "point must be one of the following values: 0NE, TWO, THREE, FOUR, FIVE"
    })
    point?: RatingPoint
}
