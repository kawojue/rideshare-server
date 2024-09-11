import {
  Min,
  IsEnum,
  IsNumber,
  IsString,
  MaxLength,
  MinLength,
  IsNotEmpty,
  IsOptional,
} from 'class-validator'
import { Utils } from 'helpers/utils'
import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'

export class SignupPromoDTO {
  @ApiProperty({
    example: 'RIDESHARE',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(8)
  @MinLength(8)
  @Transform(({ value }) => Utils.toUpperCase(Utils.replaceSpaces(value, '-')))
  code: string

  @ApiProperty({
    example: 'New Users',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string

  @ApiProperty({
    example: 100,
    default: 50,
    required: false,
  })
  @Min(1)
  @IsOptional()
  max: number

  @ApiProperty({
    example: 3000,
  })
  @Min(0.1)
  @IsNumber()
  @IsNotEmpty()
  reward: number

  @ApiProperty({
    example: new Date().toISOString(),
    required: false,
  })
  @IsOptional()
  expiry?: string
}

export enum FilterBy {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  DISABLED = 'DISABLED',
}

export class FetchPromosDTO {
  @ApiProperty({
    enum: FilterBy,
    required: false,
  })
  @IsOptional()
  @IsEnum(FilterBy)
  filterBy?: FilterBy

  @ApiProperty({
    example: 'Fetch',
    required: false,
  })
  @IsString()
  @IsOptional()
  search?: string

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    default: 0,
    required: false,
  })
  @IsOptional()
  startDate?: string

  @ApiProperty({
    example: new Date(),
    required: false,
  })
  @IsOptional()
  endDate?: string

  @ApiProperty({
    example: 1,
    required: false,
  })
  @IsOptional()
  page?: number

  @ApiProperty({
    example: 20,
    required: false,
  })
  @IsOptional()
  limit?: number
}
