export const titleText = (text: string) => {
    return text.trim()
        .split(" ")
        .map(txt => txt[0].toUpperCase() + txt.slice(1).toLowerCase())
        .join(" ")
}

export const toLowerCase = (text: string) => text.toLowerCase().trim()

export const toUpperCase = (text: string) => text.toUpperCase().trim()

export const removeNullFields = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(removeNullFields)
    } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
        return Object.keys(obj).reduce((acc, key) => {
            const value = obj[key]
            if (value !== null) {
                acc[key] = removeNullFields(value)
            }
            return acc
        }, {} as { [key: string]: any })
    } else {
        return obj
    }
}

export const formatDate = (date: Date | string): string => {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

export const formatDuration = (seconds: number | null): string => {
    if (seconds === null) return null

    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)

    const hStr = h > 0 ? `${h}h` : ''
    const mStr = m > 0 ? `${m}m` : ''
    const sStr = s > 0 ? `${s}s` : ''

    return `${hStr} ${mStr} ${sStr}`.trim()
}

export const extractFirstAndLastName = (fullName: string): { firstName: string, lastName: string } => {
    fullName = fullName.trim()

    const nameParts = fullName.split(/\s+/)

    let firstName: string
    let lastName: string

    if (nameParts.length === 1) {
        firstName = nameParts[0]
        lastName = ''
    } else {
        firstName = nameParts[0]
        lastName = nameParts[nameParts.length - 1]
    }

    return { firstName, lastName }
}