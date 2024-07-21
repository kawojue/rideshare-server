import { Sort, UserEnum } from "enums/base"
import { ApiProperty } from "@nestjs/swagger"
import { Transform } from "class-transformer"
import { IsEnum, IsOptional } from "class-validator"

class PaginationBaseDTO {
    @ApiProperty({
        example: 1
    })
    @IsOptional()
    page?: number

    @ApiProperty({
        example: 72
    })
    @IsOptional()
    limit?: number
}

class SearchBaseDTO {
    @ApiProperty({
        example: ' '
    })
    @Transform(({ value }) => value?.trim())
    @IsOptional()
    search?: string
}

export class InfiniteScrollDTO extends PaginationBaseDTO {
    @ApiProperty({
        example: ' '
    })
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    search?: string
}

export class SearchAndSortDTO extends SearchBaseDTO {
    @ApiProperty({
        enum: Sort
    })
    @IsOptional()
    @IsEnum(Sort)
    sortBy?: Sort
}

export class PaginationDTO extends InfiniteScrollDTO {
    @ApiProperty({
        enum: Sort
    })
    @IsOptional()
    @IsEnum(Sort)
    sortBy?: Sort
}

export class FetchUsersDTO extends PaginationDTO {
    @ApiProperty({
        enum: UserEnum
    })
    @IsOptional()
    @IsEnum(UserEnum)
    role?: UserEnum
}

export class FetchModminsDTO extends InfiniteScrollDTO {
    @ApiProperty({
        enum: UserEnum
    })
    @IsOptional()
    @IsEnum(UserEnum)
    role?: UserEnum
}