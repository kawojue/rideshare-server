import { Response } from 'express'
import { avatars } from 'utils/avatars'
import { Injectable } from '@nestjs/common'
import { StatusCodes } from 'enums/statusCodes'
import { MiscService } from 'libs/misc.service'
import { titleText } from 'helpers/transformer'
import { PlunkService } from 'libs/plunk.service'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'libs/response.service'
import { EncryptionService } from 'libs/encryption.service'
import { InviteNewModminDTO, LoginDTO } from './dto/auth.dto'
import { Modmin, User } from '@prisma/client'

@Injectable()
export class ModminService {
    private readonly isProd: boolean

    constructor(
        private readonly misc: MiscService,
        private readonly plunk: PlunkService,
        private readonly prisma: PrismaService,
        private readonly response: ResponseService,
        private readonly encryption: EncryptionService,
    ) {
        this.isProd = process.env.NODE_ENV === "production"
    }

    async login(res: Response, { email, password }: LoginDTO) {
        const modmin = await this.prisma.modmin.findUnique({
            where: { email }
        })

        if (!modmin) {
            return this.response.sendError(res, StatusCodes.NotFound, "Moderator or Admin not found")
        }

        if (modmin.status === "SUSPENDED") {
            return this.response.sendError(res, StatusCodes.Forbidden, "Account suspended")
        }

        const isMatch = await this.encryption.compare(password, modmin.password)
        if (!isMatch) {
            return this.response.sendError(res, StatusCodes.Unauthorized, "Warning! Password not match")
        }

        const payload = {
            sub: modmin.id,
            role: modmin.role,
            status: modmin.status
        } as JwtPayload

        const access_token = await this.misc.generateAccessToken(payload)
        const refresh_token = await this.misc.generateRefreshToken(payload)

        await this.prisma.user.update({
            where: { id: modmin.id },
            data: { refresh_token }
        })

        res.cookie('refresh_token', refresh_token, {
            httpOnly: true,
            sameSite: this.isProd ? 'none' : 'lax',
            secure: this.isProd,
            maxAge: 60 * 60 * 24 * 60 * 1000,
        })

        this.response.sendSuccess(res, StatusCodes.OK, {
            access_token,
            data: {
                role: modmin.role,
                email: modmin.email,
                avatar: modmin.avatar,
                fullname: modmin.fullname,
            }
        })
    }

    async updateAvatar(
        res: Response,
        avatarId: string,
        { sub }: ExpressUser,
    ) {
        const avatar = avatars.find(avatar => String(avatar.id) === avatarId)

        const data = await this.prisma.modmin.update({
            where: { id: sub },
            data: { avatar: avatar.url },
            select: { avatar: true }
        })

        this.response.sendSuccess(res, StatusCodes.OK, { data })
    }

    async inviteNewModmin(res: Response, { email, password, role, fullname }: InviteNewModminDTO) {
        try {
            const isExists = await this.prisma.modmin.findUnique({
                where: { email }
            })

            if (isExists) {
                return this.response.sendError(res, StatusCodes.Conflict, `${titleText(isExists.role)} already exists`)
            }

            const hashedPswd = await this.encryption.hash(password, 12)

            const modmin = await this.prisma.modmin.create({
                data: {
                    role,
                    email,
                    fullname,
                    password: hashedPswd,
                    avatar: avatars[Math.floor(Math.random() * avatars.length)].url,
                },
                select: {
                    role: true,
                    avatar: true,
                    email: true,
                    fullname: true,
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: { ...modmin, password } })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async toggleAccountSuspension(
        res: Response,
        accountId: string,
        { sub }: ExpressUser,
    ) {
        if (accountId === sub) {
            return this.response.sendError(res, StatusCodes.Conflict, "You can't suspend yourself")
        }

        let account: User | Modmin | null = await this.prisma.user.findUnique({
            where: { id: accountId }
        })

        if (!account) {
            account = await this.prisma.modmin.findUnique({
                where: { id: accountId }
            })
        }

        if (!account) {
            return this.response.sendError(res, StatusCodes.NotFound, "Account not found")
        }

        const acc = await (this.prisma[`${(account.role === "ADMIN" || account.role === "MODERATOR") ? 'modmin' : 'user'}`] as any).update({
            where: { id: accountId },
            data: { status: account.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED' },
            select: {
                id: true,
                role: true,
                email: true,
                status: true,
            }
        })

        res.on('finish', async () => {
            await this.plunk.sendPlunkEmail({
                to: account.email,
                subject: 'Account Changed',
                body: `${acc.status}`
            })
        })

        this.response.sendSuccess(res, StatusCodes.OK, { data: acc })
    }
}
