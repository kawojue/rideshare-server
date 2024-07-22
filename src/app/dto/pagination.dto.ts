import { ApiProperty } from "@nestjs/swagger"
import { Transform } from "class-transformer"
import { PayoutStatus } from "@prisma/client"
import { IsEnum, IsOptional } from "class-validator"
import { SortUsers, UserEnum, SortWithdrawalRequests } from "enums/base"

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

    @ApiProperty({
        example: '2024-01-01T00:00:00.000Z',
        default: 0,
    })
    @IsOptional()
    startDate?: string

    @ApiProperty({
        example: '2024-05-02T00:00:00.000Z',
        default: new Date(),
    })
    @IsOptional()
    endDate?: string
}

export class SearchAndSortDTO extends SearchBaseDTO {
    @ApiProperty({
        enum: SortUsers
    })
    @IsOptional()
    @IsEnum(SortUsers)
    sortBy?: SortUsers
}

export class PaginationDTO extends InfiniteScrollDTO {
    @ApiProperty({
        enum: SortUsers
    })
    @IsOptional()
    @IsEnum(SortUsers)
    sortBy?: SortUsers
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

export class FetchWithdrawalRequestsDTO extends InfiniteScrollDTO {
    @ApiProperty({
        enum: PayoutStatus
    })
    @IsOptional()
    @IsEnum(PayoutStatus)
    status?: PayoutStatus

    @ApiProperty({
        example: 2000
    })
    @IsOptional()
    min: number

    @ApiProperty({
        example: 50000
    })
    @IsOptional()
    max: number

    @ApiProperty({
        enum: SortWithdrawalRequests
    })
    @IsOptional()
    @IsEnum(SortWithdrawalRequests)
    sortBy?: SortWithdrawalRequests
}