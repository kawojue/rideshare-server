export const normalizePhoneNumber = (phoneNumber: string): string => {
    let normalized = phoneNumber.replace(/\D/g, '')

    if (normalized.startsWith('0')) {
        normalized = normalized.slice(1)
    }

    if (normalized.startsWith('00')) {
        normalized = normalized.slice(2)
    } else if (normalized.startsWith('+')) {
        normalized = normalized.slice(1)
    }

    return normalized
}

export const generateOTP = (length: number = 6): IGenOTP => {
    let totp: string = generateRandomDigits(length)

    const now: Date = new Date()
    const totp_expiry: Date = new Date(
        now.setMinutes(now.getMinutes() + 10)
    )

    return { totp, totp_expiry }
}

export const generateRandomDigits = (length: number): string => {
    let num: string = ''
    const digits: string = '0123456789'
    for (let i = 0; i < length; i++) {
        num += digits[Math.floor(Math.random() * length)]
    }

    return num
}