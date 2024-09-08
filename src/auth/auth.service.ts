import {
    SigninDTO,
    OnboardingDTO,
    VerifySigninDTO,
    GoogleSigninDTO,
    BiometricLoginDTO,
    EmergencyContactDTO,
} from './dto/auth.dto'
import {
    Injectable,
    HttpException,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    UnauthorizedException
} from '@nestjs/common'
import { Queue } from 'bullmq'
import { Utils } from 'helpers/utils'
import { UAParser } from 'ua-parser-js'
import { JwtService } from '@nestjs/jwt'
import { TimeToMilli } from 'enums/base'
import { validateFile } from 'utils/file'
import { Request, Response } from 'express'
import { config } from 'configs/env.config'
import {
    CreateSmsNotificationEvent,
    CreateEmailNotificationEvent,
} from 'src/notification/notification.event'
import { InjectQueue } from '@nestjs/bullmq'
import { MiscService } from 'libs/misc.service'
import { OAuth2Client } from 'google-auth-library'
import { PrismaService } from 'prisma/prisma.service'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { StoreService } from 'src/store/store.service'
import { CloudinaryService } from 'src/cloudinary/cloudinary.service'

const isEmail = require('is-email')

@Injectable()
export class AuthService {
    private client: OAuth2Client

    constructor(
        private readonly misc: MiscService,
        private readonly store: StoreService,
        private readonly event: EventEmitter2,
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly cloudinary: CloudinaryService,
        @InjectQueue('create-customer-queue') private createCustomer: Queue,
    ) {
        this.client = new OAuth2Client()
    }

    private async mobileDevice(req: Request, userId: string, deviceId: string, notificationToken?: string) {
        const parser = new UAParser(req.headers['user-agent']).getResult()

        const os = parser.os.name
        const type = parser.device.type
        const model = parser.device.model
        const vendor = parser.device.vendor

        return this.prisma.mobileDevice.upsert({
            where: {
                userId_deviceId: { userId, deviceId },
            },
            create: {
                os, model, type, vendor,
                lastLoggedInAt: new Date(),
                notificationToken, deviceId,
                user: { connect: { id: userId } },
            },
            update: {
                os, model, type, vendor,
                lastLoggedInAt: new Date(),
                notificationToken, deviceId,
            }
        })
    }

    async setCookie(res: Response, data: Record<string, any>) {
        res.cookie('access_token', data.access_token, {
            sameSite: config.isProd ? 'none' : 'lax',
            secure: config.isProd,
            maxAge: TimeToMilli.OneDay
        })

        res.cookie('refresh_token', data.refresh_token, {
            httpOnly: true,
            sameSite: config.isProd ? 'none' : 'lax',
            secure: config.isProd,
            maxAge: TimeToMilli.OneHundredTwentyDays
        })
    }

    async verifyGoogleSignin(req: Request, { idToken, ...device }: GoogleSigninDTO) {
        const parser = new UAParser(req.headers['user-agent']).getResult()
        const os = parser.os.name.toLowerCase()

        try {
            const tk = await this.client.verifyIdToken({
                idToken,
                audience: os === "android" ? config.google.clientId.android : os === "ios" ? config.google.clientId.ios : ''
            })
            const payload = tk.getPayload()

            const user = await this.prisma.user.findFirst({
                where: {
                    OR: [
                        { email: payload.email },
                        { providerId: payload.sub }
                    ]
                },
                select: {
                    id: true,
                    role: true,
                    email: true,
                    phone: true,
                    status: true,
                    profile: {
                        select: {
                            avatar: true,
                            biometric: true,
                        }
                    },
                    wallet: {
                        select: { balance: true }
                    }
                }
            })

            if (!user) {
                throw new NotFoundException("Account with this email does not exist")
            }

            if (user && user.status === "SUSPENDED") {
                throw new ForbiddenException("Account suspended. Contact Support!")
            }

            const mobileDevice = await this.mobileDevice(req, user.id, device.deviceId, device?.notificationToken)

            const jwtPayload = {
                sub: user.id,
                role: user.role,
                status: user.status,
                deviceId: mobileDevice.deviceId
            }

            const [access_token, refresh_token] = await Promise.all([
                this.misc.generateAccessToken(jwtPayload),
                this.misc.generateRefreshToken(jwtPayload)
            ])

            await this.store.set(`token_${user.id}`, refresh_token)

            const setup = await this.prisma.profileSetup(user.id)

            return {
                user,
                setup,
                access_token,
                refresh_token,
                nextAction: 'DASHBOARD',
            }
        } catch (error) {
            throw new UnauthorizedException('Invalid Google ID token')
        }
    }

    async sendOtp({ identifier }: SigninDTO) {
        const isPhone = !isEmail(identifier)
        const totp = Utils.generateOTP(4)

        if (isPhone) {
            Utils.normalizePhoneNumber(identifier)
        }

        let user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { phone: identifier },
                ]
            }
        })

        if (user && user.status === 'SUSPENDED') {
            throw new ForbiddenException("Account suspended. Contact Support!")
        }

        let emitted: boolean

        if (config.env === 'live') {
            if (isPhone) {
                emitted = this.event.emit(
                    'notification.sms',
                    new CreateSmsNotificationEvent({
                        phone: identifier,
                        message: `OTP Code <${totp.otp}>. Rideshare`
                    })
                )
            }

            if (!isPhone) {
                emitted = this.event.emit(
                    'notification.email',
                    new CreateEmailNotificationEvent({
                        emails: identifier,
                        subject: user ? 'Login Verification' : 'Verify your Email',
                        template: user ? 'SigninVerification' : 'EmailVerification'
                    })
                )
            }
        } else {
            emitted = true
        }

        if (emitted) {
            await this.store.set<IGenOTP>(
                `totp_${identifier}`,
                totp,
                TimeToMilli.TenMinutes
            )
        }

        return {
            identifier,
            nextAction: 'OTP-VERIFICATION',
            type: isPhone ? 'PHONE' : 'EMAIl'
        }
    }

    async verifySignin(req: Request, { otp, identifier, ...device }: VerifySigninDTO) {
        const isPhone = !isEmail(identifier)

        let nextAction = 'DASHBOARD'

        let phoneData: any

        if (isPhone) {
            const { countryCode, regionCode, significant } = Utils.normalizePhoneNumber(identifier)

            phoneData = { countryCode, regionCode, significant }
        }

        const totp = await this.store.get<IGenOTP>(`totp_${identifier}`)

        if (!totp) {
            throw new UnauthorizedException("Invalid OTP")
        }

        if (new Date() > totp.otp_expiry) {
            await this.store.delete(`totp_${identifier}`)
            throw new ForbiddenException("Code has expired")
        }

        if (otp !== totp.otp) {
            const newCount = (totp.count || 0) + 1

            if (newCount >= totp.max) {
                await this.store.delete(`totp_${identifier}`)
                throw new UnauthorizedException("Incorrect OTP. Max retries reached.")
            }

            await this.store.set<IGenOTP>(`totp_${identifier}`, {
                ...totp,
                count: newCount
            })

            throw new UnauthorizedException("Incorrect OTP")
        }

        let user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { phone: identifier },
                ]
            }
        })

        if (!user) {
            nextAction = 'ONBOARDING'
            user = await this.prisma.user.create({
                data: isPhone ? {
                    ...phoneData,
                    phone: `${phoneData.countryCode}${phoneData.significant}`,
                } : { email: identifier },
            })
        }

        if (user) {
            const mobileDevice = await this.mobileDevice(req, user.id, device.deviceId, device?.notificationToken)

            const payload = {
                sub: user.id,
                role: user.role,
                status: user.status,
                deviceId: mobileDevice.deviceId
            }

            const [access_token, refresh_token] = await Promise.all([
                this.misc.generateAccessToken(payload),
                this.misc.generateRefreshToken(payload)
            ])

            await this.store.set(`token_${user.id}`, refresh_token)

            return { access_token, refresh_token, nextAction }
        }
    }

    async onboarding(
        { sub }: JwtDecoded,
        {
            gender, lastname, middlename,
            address, as, email, firstname,
        }: OnboardingDTO
    ) {
        const user = await this.prisma.user.update({
            where: { id: sub },
            data: {
                firstname, lastname,
                role: as, email, middlename,
                wallet: { create: { balance: 0 } },
                profile: { create: { gender, address } },
            },
            include: {
                wallet: {
                    select: { balance: true }
                },
                profile: {
                    select: {
                        avatar: true,
                        biometric: true,
                    }
                }
            }
        })

        if (user) {
            await this.createCustomer.add(
                'create-customer-queue',
                {
                    email, phone: user.phone,
                    last_name: user.lastname,
                    first_name: user.firstname,
                },
                {
                    lifo: true,
                    attempts: 3,
                }
            )
        }

        const mobileDevice = await this.prisma.mobileDevice.findFirst({
            where: { userId: sub },
            orderBy: { lastLoggedInAt: 'desc' }
        })

        const payload = {
            status: user.status,
            sub, role: user.role,
            deviceId: mobileDevice.deviceId
        }

        const [access_token, refresh_token] = await Promise.all([
            this.misc.generateAccessToken(payload),
            this.misc.generateRefreshToken(payload)
        ])

        await this.store.set(`token_${user.id}`, refresh_token)

        return {
            user,
            access_token,
            refresh_token,
            nextAction: 'DASHBOARD',
        }
    }

    async biometricSignin({ access_token: accessToken }: BiometricLoginDTO) {
        let decoded: JwtDecoded
        try {
            decoded = await this.jwtService.verifyAsync(accessToken, {
                secret: config.jwt.secret,
                ignoreExpiration: true,
            })
        } catch (err) {
            throw new UnauthorizedException("Invalid token")
        }

        Utils.sanitizeData<JwtDecoded>(decoded, ['exp', 'iat'])

        const check = await this.prisma.biometricCheck(decoded)

        if (!check.isAbleToUseBiometric) {
            throw new UnauthorizedException("Verification is required")
        }

        const user = await this.prisma.user.findUnique({
            where: { id: decoded.sub },
            include: {
                wallet: {
                    select: { balance: true }
                },
                profile: {
                    select: {
                        avatar: true,
                        biometric: true,
                    }
                }
            }
        })

        if (!user) {
            throw new NotFoundException("Account not found")
        }

        if (user && user.status === "SUSPENDED") {
            throw new ForbiddenException("Account suspended. Contact Support!")
        }

        const access_token = await this.misc.generateAccessToken(decoded)

        Utils.sanitizeData<typeof user>(user, ['providerId', 'lastUsedBiometricAt'])

        return { access_token, user }
    }

    async refreshAccessToken(req: Request) {
        const refreshToken = req.cookies.refresh_token

        if (!refreshToken) {
            throw new ForbiddenException()
        }

        const newAccessToken = await this.misc.generateNewAccessToken(refreshToken)

        return { access_token: newAccessToken }
    }

    async uploadAvatar(file: Express.Multer.File, { sub: userId }: JwtDecoded) {
        if (!file) {
            throw new BadRequestException('No file was selected')
        }

        const profile = await this.prisma.getProfile(userId)

        const validate = validateFile(file, 5 << 20, 'jpeg', 'jpg', 'png')
        if (validate?.status) {
            throw new HttpException(validate.message, validate.status)
        }

        const response = await this.cloudinary.upload(validate.file, {
            folder: 'Rideshare/Profile',
            resource_type: 'image'
        })

        const payload = {
            size: file.size,
            type: file.mimetype,
            url: response.secure_url,
            public_id: response.public_id,
        }

        await this.prisma.profile.update({
            where: { id: profile.id },
            data: { avatar: payload }
        })

        const avatar = profile.avatar as any
        if (avatar?.public_id) {
            await this.cloudinary.delete(avatar.public_id)
        }

        return payload
    }

    async toggleBiometric({ sub }: JwtDecoded) {
        const profile = await this.prisma.getProfile(sub)

        const newProfile = await this.prisma.profile.update({
            where: { userId: sub },
            data: { biometric: !profile.biometric },
        })

        return { profile: newProfile }
    }

    async emergencyContact({ sub }: JwtDecoded, { fullname, phone, address, email }: EmergencyContactDTO) {
        if (!phone && !email) {
            throw new BadRequestException("Phone number or email is required")
        }

        if (phone) {
            Utils.normalizePhoneNumber(phone)
        }

        const { id } = await this.prisma.getProfile(sub)

        const contact = await this.prisma.emergencyContact.upsert({
            where: { profileId: id },
            create: {
                profile: { connect: { id } },
                fullname, phone, address, email,
            },
            update: { fullname, phone, address, email }
        })

        return contact
    }
}
