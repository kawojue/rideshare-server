import {
    Injectable,
    OnModuleInit,
    OnModuleDestroy,
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

    async biometricCheck(decoded: any) {
        const userId = decoded.sub
        const deviceId = decoded.deviceId

        const profile = await this.getProfile(userId)

        if (profile && !profile.biometric) {
            return {
                isAbleToUseBiometric: false,
                reason: 'Biometric is not turned on'
            }
        }

        const device = await this.mobileDevice.findFirst({
            where: { userId: userId }
        })

        if (device.deviceId !== deviceId) {
            return {
                isAbleToUseBiometric: false,
                reason: 'Verification is required'
            }
        }

        return { isAbleToUseBiometric: true }
    }

    async getProfile(userId: string) {
        return await this.profile.findUnique({
            where: { userId },
            include: {
                user: {
                    select: {
                        role: true,
                        email: true,
                        phone: true,
                        lastname: true,
                        firstname: true,
                    }
                }
            }
        })
    }

    async getUserWallet(userId: string) {
        return await this.wallet.findUnique({
            where: { userId }
        })
    }

    async profileSetup(userId: string) {
        const profile = await this.getProfile(userId)
        const [user, emergencyContact, verification] = await Promise.all([
            this.user.findUnique({
                where: { id: userId },
                select: { role: true }
            }),
            this.emergencyContact.findUnique({
                where: { profileId: profile.id }
            }),
            this.verification.findUnique({
                where: { driverId: userId },
                select: {
                    idType: true,
                    idVerified: true,
                    addressVerified: true,
                    driverLicenseVerified: true,
                }
            })
        ])

        return {
            hasAddedEmergencyContact: emergencyContact !== null,
            ...(user.role === "DRIVER" && { ...verification })
        }
    }
}
