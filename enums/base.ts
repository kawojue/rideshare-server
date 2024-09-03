export enum UserEnum {
    DRIVER = 'DRIVER',
    PASSENGER = 'PASSENGER'
}

export enum ModminEnum {
    ADMIN = 'ADMIN',
    MODERATOR = 'MODERATOR',
}

export enum RatingPoint {
    ONE = 1.0,
    TWO = 2.0,
    THREE = 3.0,
    FOUR = 4.0,
    FIVE = 5.0
}

export enum SortUsers {
    DATE = "DATE",
    NAME = "NAME",
    RATING = "RATING"
}

export enum SortWithdrawalRequests {
    DATE = "DATE",
    LOWEST = "LOWEST",
    HIGHEST = "HIGHEST"
}

export enum PayoutAction {
    GRANT = "GRANT",
    DECLINE = "DECLINE"
}

export enum Chart {
    montly = "monthly",
    weekdays = "weekdays",
}

export enum DaysToMilli {
    "1d" = 24 * 60 * 60 * 1000,
    "30d" = 30 * 24 * 60 * 60 * 1000,
    "60d" = 60 * 24 * 60 * 60 * 1000,
    "120d" = 120 * 24 * 60 * 60 * 1000,
}