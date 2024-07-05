import { randomBytes } from 'crypto'
import { StatusCodes } from 'enums/StatusCodes'

export const getFileExtension = (file: Express.Multer.File | string) => {
    let mimetype: string

    if (typeof file === "object" && file.mimetype) {
        mimetype = file.mimetype
    } else if (typeof file === "string") {
        mimetype = file
    }

    let extension: string

    switch (mimetype) {
        case 'video/mp4':
            extension = 'mp4'
            break
        case 'video/webm':
            extension = 'webm'
            break
        case 'video/avi':
            extension = 'avi'
            break
        case 'image/png':
            extension = 'png'
            break
        case 'image/jpeg':
        case 'image/jpg':
            extension = 'jpg'
            break
        case 'audio/mp3':
            extension = 'mp3'
            break
        case 'audio/wav':
            extension = 'wav'
            break
        case 'audio/aac':
            extension = 'aac'
            break
        case 'audio/ogg':
            extension = 'ogg'
            break
        case 'application/pdf':
            extension = 'pdf'
            break
        case 'application/msword':
            extension = 'doc'
            break
        default:
            break
    }

    return extension
}

export const validateFile = (
    file: Express.Multer.File,
    maxSize: number, ...extensions: string[]
) => {
    if (maxSize < file.size) {
        return {
            status: StatusCodes.PayloadTooLarge,
            message: `${file.originalname} is too large`
        }
    }

    if (!extensions.includes(getFileExtension(file))) {
        return {
            status: StatusCodes.UnsupportedMediaType,
            message: `${file.originalname} extension is not allowed`,
        }
    }

    return { file }
}

export const genFileName = () => {
    return `rideshare_${randomBytes(2)
        .toString('hex')}_${new Date()
            .toDateString()
            .split(" ")
            .join('-')}_${Math.floor(new Date().getTime() / 1000)}`
}