interface CloudinaryModuleOptions {
    cloudName: string
    apiKey: string
    apiSecret: string
}

interface FileDest {
    folder: string
    resource_type: 'image' | 'video'
}

interface IGenOTP {
    totp: string
    totp_expiry: Date
}

type Roles = 'ADMIN' | 'DRIVER' | 'PASSENGER' | 'MODERATOR'
type Status = 'ACTIVE' | 'SUSPENDED'

interface ExpressUser extends Express.User {
    sub: string
    role: Role
    status?: Status
}

interface IRequest extends Request {
    user: ExpressUser
}

interface JwtPayload {
    sub: string
    role: Roles
    status?: Status
}

interface DriverLicenseResponse {
    mobile: string
    last_name: string
    first_name: string
    middle_name: string
}

interface VNINResponse {
    nin: string
    firname: string
    lastname: string
    middlename: string
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