export const titleText = (text: string): string => {
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

export const formatDate = (date: Date | string, format: 'YYYY-MM-DD' | 'DD-MM-YYYY' | 'MM-DD-YYYY'): string => {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')

    switch (format) {
        case 'YYYY-MM-DD':
            return `${year}-${month}-${day}`
        case 'DD-MM-YYYY':
            return `${day}-${month}-${year}`
        case 'MM-DD-YYYY':
            return `${month}-${day}-${year}`
        default:
            throw new Error('Invalid date format')
    }
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