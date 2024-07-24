import { ApiProperty } from "@nestjs/swagger"
import { Transform } from "class-transformer"
import { IsEnum, IsOptional } from "class-validator"
import { PayoutStatus, TransferStatus, TxType } from "@prisma/client"
import { SortUsers, UserEnum, SortWithdrawalRequests } from "enums/base"

class PaginationBaseDTO {
    @ApiProperty({
        example: 1,
        required: false,
    })
    @IsOptional()
    page?: number

    @ApiProperty({
        example: 72,
        required: false,
    })
    @IsOptional()
    limit?: number
}

class SearchBaseDTO {
    @ApiProperty({
        example: ' ',
        required: false,
    })
    @Transform(({ value }) => value?.trim())
    @IsOptional()
    search?: string
}

export class InfiniteScrollDTO extends PaginationBaseDTO {
    @ApiProperty({
        example: ' ',
        required: false,
    })
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    search?: string

    @ApiProperty({
        example: '2024-01-01T00:00:00.000Z',
        default: 0,
        required: false,
    })
    @IsOptional()
    startDate?: string

    @ApiProperty({
        example: '2024-05-02T00:00:00.000Z',
        default: new Date(),
        required: false
    })
    @IsOptional()
    endDate?: string
}

export class SearchAndSortDTO extends SearchBaseDTO {
    @ApiProperty({
        enum: SortUsers,
        required: false,
    })
    @IsOptional()
    @IsEnum(SortUsers)
    sortBy?: SortUsers
}

export class PaginationDTO extends InfiniteScrollDTO {
    @ApiProperty({
        enum: SortUsers,
        required: false,
    })
    @IsOptional()
    @IsEnum(SortUsers)
    sortBy?: SortUsers
}

export class FetchUsersDTO extends PaginationDTO {
    @ApiProperty({
        enum: UserEnum,
        required: false,
    })
    @IsOptional()
    @IsEnum(UserEnum)
    role?: UserEnum
}

export class FetchModminsDTO extends InfiniteScrollDTO {
    @ApiProperty({
        enum: UserEnum,
        required: false,
    })
    @IsOptional()
    @IsEnum(UserEnum)
    role?: UserEnum
}

export class AmountBaseDTO extends InfiniteScrollDTO {
    @ApiProperty({
        example: 2000,
        required: false
    })
    @IsOptional()
    min?: number

    @ApiProperty({
        example: 50000,
        required: false,
    })
    @IsOptional()
    max?: number

    @ApiProperty({
        enum: SortWithdrawalRequests,
        required: false,
    })
    @IsOptional()
    @IsEnum(SortWithdrawalRequests)
    sortBy?: SortWithdrawalRequests
}

export class FetchWithdrawalRequestsDTO extends AmountBaseDTO {
    @ApiProperty({
        enum: PayoutStatus,
        required: false,
    })
    @IsOptional()
    @IsEnum(PayoutStatus)
    status?: PayoutStatus
}

export class FetchTxHistoryDTO extends AmountBaseDTO {
    @ApiProperty({
        enum: TransferStatus,
        required: false,
    })
    @IsOptional()
    @IsEnum(TransferStatus)
    status?: TransferStatus

    @ApiProperty({
        enum: TxType,
        required: false,
    })
    @IsOptional()
    @IsEnum(TxType)
    type?: TxType
}