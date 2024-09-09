type Status = 'ACTIVE' | 'SUSPENDED'
type Roles = 'ADMIN' | 'DRIVER' | 'PASSENGER' | 'MODERATOR'

interface CloudinaryModuleOptions {
    cloudName: string
    apiKey: string
    apiSecret: string
}

interface FileDest {
    folder: string
    resource_type: 'image' | 'video' | 'auto' | 'raw'
}

interface IGenOTP {
    max?: number
    count?: number
    otp?: string
    otp_expiry?: Date
}

interface JwtPayload {
    sub: string
    role?: Roles
    status?: Status
    deviceId?: string
}

interface JwtDecoded extends JwtPayload {
    iat: number
    exp: number
}

interface Attachment {
    size: number,
    type: string,
    url: string,
    public_id: string,
}

interface Fee {
    totalFee: number
    paystackFee: number
    processingFee: number
}

interface Avatar {
    id: number
    url: string
}

interface PushNotification {
    title: string
    body: string
    userId?: string
}

interface EmailAttachment {
    content: string
    mimeType: string
    name: string
}

interface AfricasTalkingResponse {
    Message: string
    Recipients: {
        statusCode: number
        number: string
        status: string
        cost: string
        messageId: string
    }[]
}