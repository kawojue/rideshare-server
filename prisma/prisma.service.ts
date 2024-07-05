
import {
    Injectable, OnModuleInit,
    OnModuleDestroy, NotFoundException
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    async onModuleInit() {
        await this.$connect()
    }

    async onModuleDestroy() {
        await this.$disconnect()
    }

    async biometricCheck(decoded: any, type: 'Login' | 'Tx') {
        const userId = decoded.sub

        const user = await this.user.findUnique({
            where: { id: userId },
            select: {
                lastLoggedInAt: true,
                lastUsedBiometricAt: true,
                lastPasswordChanged: true,
                lastUsedCredentialAt: true,
            }
        })

        if (Date.now() > decoded.iat) {
            return {
                isAbleToUseBiometric: false,
                reason: "Invalid Token"
            }
        }

        const profile = await this.getProfile(userId)

        if (!user || !profile) {
            throw new NotFoundException('Profile not found')
        }

        if (!profile.biometric) {
            return {
                isAbleToUseBiometric: false,
                reason: "Biometric is not activated"
            }
        }

        const { lastUsedCredentialAt, lastPasswordChanged, lastUsedBiometricAt } = user

        if (!lastUsedBiometricAt) {
            return { isAbleToUseBiometric: true }
        }

        if (type === 'Login') {
            if (lastPasswordChanged > lastUsedBiometricAt && lastUsedCredentialAt <= lastUsedBiometricAt) {
                return {
                    isAbleToUseBiometric: false,
                    reason: 'Password required due to recent password change.'
                }
            }

            if (lastUsedCredentialAt > lastUsedBiometricAt) {
                return { isAbleToUseBiometric: true }
            }
        }

        else if (type === 'Tx') {
            const { lastPinChanged } = profile

            if (lastPinChanged > lastUsedBiometricAt) {
                return {
                    isAbleToUseBiometric: false,
                    reason: 'PIN required due to recent PIN change.'
                }
            }
        }

        return { isAbleToUseBiometric: true }
    }

    async getProfile(userId: string) {
        return await this.profile.findUnique({
            where: { userId }
        })
    }

    // async getTotalRating(userId: string) {
    //     const ratings = await this.rating.findMany({
    //         where: { targetUserId: userId },
    //         select: { point: true }
    //     })

    //     if (ratings.length === 0) return 0

    //     const totalRating = ratings.reduce((sum, rating) => sum + rating.point, 0)
    //     const averageRating = totalRating / ratings.length

    //     const scaledRating = (averageRating / 5) * 4 + 1

    //     return scaledRating
    // }
}
