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

export enum TimeToMilli {
    OneHour = 60 * 60 * 1000,
    TenMinutes = 10 * 60 * 1000,
    OneDay = 24 * 60 * 60 * 1000,
    ThirtyDays = 30 * 24 * 60 * 60 * 1000,
    SixtyDays = 60 * 24 * 60 * 60 * 1000,
    OneHundredTwentyDays = 120 * 24 * 60 * 60 * 1000,
    TwoWeeks = 14 * 24 * 60 * 60 * 1000
}