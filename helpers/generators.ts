export const normalizePhoneNumber = (phoneNumber: string) => {
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
    let totp: string = ''
    const digits: string = '0123456789'
    for (let i = 0; i < length; i++) {
        totp += digits[Math.floor(Math.random() * length)]
    }

    const now: Date = new Date()
    const totp_expiry: Date = new Date(
        now.setMinutes(now.getMinutes() + 10)
    )

    return { totp, totp_expiry }
}