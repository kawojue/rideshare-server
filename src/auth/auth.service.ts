import {
    OTPDTO,
    PinDTO,
    EmailDTO,
    SigninDTO,
    SignupDTO,
    ResetPasswordDTO,
    UpdatePasswordDTO,
    BiometricLoginDTO,
} from './dto/auth.dto'
import { Response } from 'express'
import { JwtService } from '@nestjs/jwt'
import { validateFile } from 'utils/file'
import { MiscService } from 'libs/misc.service'
import { StatusCodes } from 'enums/statusCodes'
import { PlunkService } from 'libs/plunk.service'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'libs/response.service'
import { EncryptionService } from 'libs/encryption.service'
import { Injectable, NotFoundException } from '@nestjs/common'
import { CloudinaryService } from 'src/cloudinary/cloudinary.service'
import { generateOTP, normalizePhoneNumber } from 'helpers/generators'

@Injectable()
export class AuthService {
    constructor(
        private readonly misc: MiscService,
        private readonly plunk: PlunkService,
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly response: ResponseService,
        private readonly encryption: EncryptionService,
        private readonly cloudinary: CloudinaryService,
    ) { }

    private readonly isProd = process.env.NODE_ENV === "production"

    private async updateLoginState(
        payload: JwtPayload,
        key: 'lastUsedCredentialAt' | 'lastUsedBiometricAt'
    ) {
        const access_token = await this.misc.generateAccessToken(payload)
        const refresh_token = await this.misc.generateRefreshToken(payload)

        await this.prisma.user.update({
            where: { id: payload.sub },
            data: {
                refresh_token,
                [key]: new Date(),
                lastLoggedInAt: new Date(),
            }
        })

        return access_token
    }

    async googleSignin(profile: any) {
        const { email, proverId } = profile.user

        const user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: { equals: email, mode: 'insensitive' } },
                    { provider_id: { equals: proverId, mode: 'insensitive' } },
                ]
            }
        })

        if (!user) {
            throw new NotFoundException("Account not found")
        }

        const payload = {
            sub: user.id,
            role: user.role,
            status: user.status
        } as JwtPayload

        const access_token = await this.updateLoginState(payload, 'lastUsedCredentialAt')

        return {
            access_token,
            data: {
                role: user.role,
                fullname: user.fullname,
                hasCompletedProfileSetup: user.hasCompletedProfileSetup,
            }
        }
    }

    async signin(res: Response, { identifier, password }: SigninDTO) {
        let email = identifier.includes('@') ? identifier : ''
        let phone = email ? '' : normalizePhoneNumber(identifier)

        const user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: { equals: email, mode: 'insensitive' } },
                    { phone: { equals: phone, mode: 'insensitive' } },
                ]
            }
        })

        if (!user) {
            return this.response.sendError(res, StatusCodes.NotFound, "Account not found")
        }

        if (user.provider === "Google") {
            return this.response.sendError(res, StatusCodes.BadRequest, "Login with Google Provider")
        }

        const isMatch = await this.encryption.compare(password, user.password)
        if (!isMatch) {
            return this.response.sendError(res, StatusCodes.Unauthorized, "Incorrect password")
        }

        const payload = {
            sub: user.id,
            role: user.role,
            status: user.status
        } as JwtPayload

        const access_token = await this.updateLoginState(payload, 'lastUsedCredentialAt')

        this.response.sendSuccess(res, StatusCodes.OK, {
            access_token,
            data: {
                role: user.role,
                fullname: user.fullname,
                hasCompletedProfileSetup: user.hasCompletedProfileSetup,
            }
        })
    }

    async biometricSignin(res: Response, { access_token: accessToken }: BiometricLoginDTO) {
        const decoded = await this.jwtService.verifyAsync(accessToken, {
            secret: process.env.JWT_SECRET!,
            ignoreExpiration: true,
        })

        if (!decoded?.sub) {
            return this.response.sendError(res, StatusCodes.Forbidden, "Invalid token")
        }

        const user = await this.prisma.user.findUnique({
            where: { id: decoded.sub }
        })

        if (!user) {
            return this.response.sendError(res, StatusCodes.NotFound, "Account not found")
        }

        const checkings = await this.prisma.biometricCheck(decoded.sub, 'Login')

        if (!checkings.isAbleToUseBiometric) {
            return this.response.sendError(res, StatusCodes.Unauthorized, checkings.reason)
        }

        const payload = {
            sub: user.id,
            role: user.role,
            status: user.status,
        } as JwtPayload

        const access_token = await this.updateLoginState(payload, 'lastUsedBiometricAt')

        this.response.sendSuccess(res, StatusCodes.OK, {
            access_token,
            data: {
                role: user.role,
                fullname: user.fullname,
                hasCompletedProfileSetup: user.hasCompletedProfileSetup,
            }
        })
    }

    async signup(res: Response, {
        as, email, password, phone, gender, fullname
    }: SignupDTO) {
        phone = normalizePhoneNumber(phone)

        const findByEmailOrPhone = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { phone: { equals: phone, mode: 'insensitive' } },
                    { email: { equals: email, mode: 'insensitive' } },
                ]
            }
        })

        if (findByEmailOrPhone) {
            return this.response.sendError(res, StatusCodes.Conflict, "There is an account associated with either the email or phone number")
        }

        password = await this.encryption.hash(password)

        const user = await this.prisma.user.create({
            data: {
                fullname, provider: 'Local',
                profile: { create: { gender } },
                email, phone, role: as, password,
                hasCompletedProfileSetup: as === "PASSENGER" ? true : false,
            }
        })

        res.on('finish', async () => {
            if (user) {
                const { totp, totp_expiry } = generateOTP(6)

                await Promise.all([
                    this.prisma.totp.upsert({
                        where: { userId: user.id },
                        create: {
                            totp, totp_expiry,
                            user: { connect: { id: user.id } },
                        },
                        update: { totp, totp_expiry, }
                    }),
                    this.isProd ? this.plunk.sendPlunkEmail({
                        to: email,
                        subject: 'Verify your email',
                        body: `otp : ${totp}`
                    }) : (() => {
                        console.log(totp)
                    })()
                ])

                // TODO: Email template
            }
        })

        this.response.sendSuccess(res, StatusCodes.Created, {
            message: "Successful. Verify your email"
        })
    }

    async verifyOtp(res: Response, { otp }: OTPDTO) {
        try {
            const totp = await this.prisma.totp.findFirst({
                where: { totp: otp }
            })

            if (!totp || !totp.totp_expiry) {
                return this.response.sendError(res, StatusCodes.Unauthorized, "Incorrect OTP")
            }

            if (new Date() > new Date(totp.totp_expiry)) {
                this.response.sendError(res, StatusCodes.Forbidden, "OTP has expired")
                await this.prisma.totp.deleteMany({
                    where: { userId: totp.userId },
                })

                return
            }

            await this.prisma.$transaction([
                this.prisma.profile.update({
                    where: { userId: totp.userId },
                    data: { email_verified: true }
                }),
                this.prisma.totp.delete({
                    where: { userId: totp.userId }
                })
            ])

            this.response.sendSuccess(res, StatusCodes.OK, {
                verified: true,
                message: "Successful",
            })
        } catch (err) {
            this.misc.handleServerError(res, err, "Something went wrong")
        }
    }

    async requestOtp(res: Response, { email }: EmailDTO) {
        try {
            let mail: boolean = false
            let eligible: boolean = false

            const user = await this.prisma.user.findUnique({
                where: { email }
            })

            if (!user) {
                return this.response.sendError(res, StatusCodes.NotFound, "Account does not exist")
            }

            const totp = await this.prisma.totp.findFirst({
                where: { userId: user.id }
            })

            const otp = generateOTP(6)

            if (totp) {
                if (!totp.totp_expiry) {
                    mail = true
                    eligible = true
                } else {
                    const currentTime = new Date().getTime()
                    const totp_expiry = new Date(totp.totp_expiry).getTime()

                    const OTP_EXPIRY_THRESHOLD = 2 as const
                    const remainingMinutes = ((totp_expiry - currentTime) / 1000) / 60

                    if (remainingMinutes < OTP_EXPIRY_THRESHOLD) {
                        mail = true
                        eligible = true
                    } else {
                        return this.response.sendError(res, StatusCodes.Unauthorized, `Request after ${Math.floor(remainingMinutes)} minutues`)
                    }
                }
            } else {
                mail = true
            }

            res.on('finish', async () => {
                if (mail || eligible) {
                    await Promise.all([
                        this.plunk.sendPlunkEmail({
                            to: user.email,
                            subject: "Verification",
                            body: `Otp: ${otp.totp}`
                        }),
                        this.isProd ? this.prisma.totp.upsert({
                            where: { userId: user.id },
                            create: {
                                totp: otp.totp,
                                totp_expiry: otp.totp_expiry,
                                user: { connect: { id: user.id } }
                            },
                            update: {
                                totp: otp.totp,
                                totp_expiry: otp.totp_expiry,
                            }
                        }) : (() => {
                            console.log(otp.totp)
                        })()
                    ])
                    // TODO: Email template
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "New OTP has been sent to your email"
            })
        } catch (err) {
            this.misc.handleServerError(res, err, "Sorry, there is a problem on our end")
        }
    }

    async updatePassword(
        res: Response,
        { sub: userId }: ExpressUser,
        { oldPassword, password1, password2 }: UpdatePasswordDTO
    ) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId }
            })

            const verifyPassword = await this.encryption.compare(oldPassword, user.password)

            if (!verifyPassword) {
                return this.response.sendError(res, StatusCodes.Unauthorized, "Incorrect password")
            }

            if (password1 !== password2) {
                return this.response.sendError(res, StatusCodes.BadRequest, "Passwords do not match")
            }

            const password = await this.encryption.hash(password1)

            await this.prisma.user.update({
                where: { id: userId },
                data: { password, lastPasswordChanged: new Date() }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "Password has been updated successfully"
            })
        } catch (err) {
            this.misc.handleServerError(res, err, "Error updating password")
        }
    }

    async resetPassword(res: Response, { otp, newPassword, email }: ResetPasswordDTO) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { email },
                include: { totp: true }
            })

            if (!user || user.status === "SUSPENDED") {
                return this.response.sendError(res, StatusCodes.NotFound, "Account suspended")
            }

            const totp = await this.prisma.totp.findFirst({
                where: { totp: otp }
            })

            if ((!totp || !totp.totp_expiry) || (user.totp.totp !== totp.totp)) {
                return this.response.sendError(res, StatusCodes.Unauthorized, 'Invalid OTP')
            }

            const currentTime = new Date()
            const otp_expiry = totp.totp_expiry

            if (currentTime > otp_expiry) {
                this.response.sendError(res, StatusCodes.Forbidden, "OTP has expired")
                await this.prisma.totp.delete({
                    where: { id: totp.id },
                })

                return
            }

            const hashedPassword = await this.encryption.hash(newPassword)

            await this.prisma.$transaction([
                this.prisma.user.update({
                    where: { id: totp.userId },
                    data: {
                        password: hashedPassword,
                        lastPasswordChanged: new Date(),
                    }
                }),
                this.prisma.profile.update({
                    where: { userId: totp.userId },
                    data: { email_verified: true }
                }),
                this.prisma.totp.delete({
                    where: { userId: totp.userId }
                })
            ])

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "Password reseted successfully"
            })
        } catch (err) {
            this.misc.handleServerError(res, err, "Reset password failed")
        }
    }

    async createTxPin(
        res: Response,
        { sub }: ExpressUser,
        { pin1, pin2, otp }: PinDTO,
    ) {
        try {
            const user = await this.prisma.getProfile(sub)

            if (!user.email_verified) {
                return this.response.sendError(res, StatusCodes.Forbidden, "Verify your email before creating a transaction PIN")
            }

            if (pin1 !== pin2) {
                return this.response.sendError(res, StatusCodes.BadRequest, "PINs do not match")
            }

            if (user.pin) {
                const totp = await this.prisma.totp.findFirst({
                    where: { totp: otp },
                    include: { user: { select: { id: true } } }
                })

                if (!totp) {
                    return this.response.sendError(res, StatusCodes.Unauthorized, 'Invalid OTP')
                }

                const otp_expiry = new Date(totp.totp_expiry)
                const expired = new Date() > otp_expiry

                if (expired) {
                    this.response.sendError(res, StatusCodes.Forbidden, 'OTP has expired')
                    await this.prisma.totp.delete({
                        where: { userId: sub }
                    })
                    return
                }
            }

            await this.prisma.profile.update({
                where: { userId: sub },
                data: {
                    pin: await this.encryption.hash(pin1),
                    lastPinChanged: new Date(),
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, {
                message: "Transaction PIN has been created successfully"
            })
        } catch (err) {
            this.misc.handleServerError(res, err, "Sorry, there is a problem on our end")
        }
    }

    async uploadAvatar(
        res: Response,
        file: Express.Multer.File,
        { sub: userId }: ExpressUser,
    ) {
        try {
            if (!file) {
                return this.response.sendError(res, StatusCodes.BadRequest, 'No file was selected')
            }

            const profile = await this.prisma.getProfile(userId)

            const validate = validateFile(file, 5 << 20, 'jpeg', 'jpg', 'png')
            if (validate?.status) {
                return this.response.sendError(res, validate.status, validate.message)
            }

            const response = await this.cloudinary.upload(validate.file, {
                folder: 'RideShare/Profile',
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

            this.response.sendSuccess(res, StatusCodes.OK, { data: payload })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async toggleBiometric(res: Response, { sub }: ExpressUser) {
        const profile = await this.prisma.getProfile(sub)

        const newProfile = await this.prisma.profile.update({
            where: { userId: sub },
            data: { biometric: !profile.biometric },
            select: { biometric: true }
        })

        this.response.sendSuccess(res, StatusCodes.OK, { data: newProfile })
    }
}
