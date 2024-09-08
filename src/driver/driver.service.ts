import {
    Injectable,
    HttpException,
    ConflictException,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    UnauthorizedException,
} from '@nestjs/common'
import { Utils } from 'helpers/utils'
import { Prisma } from '@prisma/client'
import { validateFile } from 'utils/file'
import { PrismaService } from 'prisma/prisma.service'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { QoreidService } from 'libs/Qoreid/qoreid.service'
import { UpdateVehicleDTO, VehicleDTO } from './dto/vehicle.dto'
import { CloudinaryService } from 'src/cloudinary/cloudinary.service'
import { DriverLicenseDTO, IDVerificationDTO } from './dto/verification.dto'
import { CreateEmailNotificationEvent } from 'src/notification/notification.event'

@Injectable()
export class DriverService {
    private qoreid: QoreidService

    constructor(
        private readonly event: EventEmitter2,
        private readonly prisma: PrismaService,
        private readonly cloudinary: CloudinaryService,
    ) {
        this.qoreid = new QoreidService()
    }

    private async verifyVehicleOwner(plateNumber: string, firstname: string, lastname: string) {
        const res = await this.qoreid.plateNumber(
            { idNumber: plateNumber },
            { firstname, lastname }
        )

        let data = { verified: false, metadata: res.license_plate }

        if (res && res.summary.license_plate_check.status === "EXACT_MATCH") {
            data.verified = true
        }

        return data
    }

    async idVerification({ sub }: JwtDecoded, { dob, idType, idNumber }: IDVerificationDTO) {
        const verification = await this.prisma.verification.findUnique({
            where: { driverId: sub },
            include: {
                driver: {
                    select: {
                        firstname: true,
                        lastname: true,
                        email: true,
                        phone: true,
                        profile: {
                            select: {
                                gender: true,
                            }
                        }
                    }
                }
            }
        })

        if (verification.idVerified) {
            throw new ConflictException("ID has already been verified")
        }

        let check: string
        let tailoredData: any
        let data: VotersCardResponse | NINResponse | PassportResponse | null = null

        if (idType === "NIN") {
            data = await this.qoreid.nin({ idNumber }, {
                email: verification.driver.email,
                phone: verification.driver.phone,
                lastname: verification.driver.lastname,
                firstname: verification.driver.firstname,
                dob: Utils.formatDate(new Date(dob), 'YYYY-MM-DD'),
                gender: verification.driver.profile.gender.toLowerCase(),
            })

            check = 'nin_check'

            tailoredData = {
                id: data.id,
                firstname: data.nin?.firstname,
                lastname: data.nin?.lastname,
                address: data.nin?.address,
            }
        } else if (idType === "VOTER") {
            data = await this.qoreid.votersCard({ idNumber }, {
                lastname: verification.driver.lastname,
                firstname: verification.driver.firstname,
                dob: Utils.formatDate(new Date(dob), 'YYYY-MM-DD'),
            })

            check = 'voters_card_check'

            tailoredData = {
                id: data.id,
                firstname: data.voters_card?.firstName,
                lastname: data.voters_card?.lastName,
                occupation: data.voters_card?.occupation,
                pollingUnitCode: data.voters_card.pollingUnitCode,
            }
        } else if (idType === "PASSPORT") {
            data = await this.qoreid.passport({ idNumber }, {
                lastname: verification.driver.lastname,
                firstname: verification.driver.firstname,
                dob: Utils.formatDate(new Date(dob), 'YYYY-MM-DD'),
                gender: verification.driver.profile.gender.toLowerCase(),
            })

            check = 'passport_check'

            tailoredData = {
                id: data.id,
                firstname: data.passport?.firstname,
                lastname: data.passport?.lastname,
                middlename: data.passport?.middlename,
                issuedAt: data.passport?.issuedAt,
                issuedDate: data.passport?.issuedDate,
                expiryDate: data.passport?.expiryDate,
                passportNo: data.passport?.passportNo,
            }
        } else {
            throw new BadRequestException("Invalid ID type")
        }

        if (data && data.summary[check].status === "EXACT_MATCH") {
            throw new ForbiddenException("ID verification failed")
        }

        return await this.prisma.verification.update({
            where: { driverId: sub },
            data: {
                idType,
                idNumber,
                idVerified: true,
                idVerifiedAt: new Date(),
                idVerificationData: tailoredData,
            },
            select: {
                idType: true,
                driverId: true,
                idNumber: true,
                idVerified: true,
                idVerifiedAt: true,
                idVerificationData: true,
            }
        })
    }

    async driverLicenseVerification({ sub }: JwtDecoded, { dob, licenseNumber }: DriverLicenseDTO) {
        const verification = await this.prisma.verification.findUnique({
            where: { driverId: sub },
            include: {
                driver: {
                    select: {
                        firstname: true,
                        lastname: true,
                        email: true,
                        phone: true,
                        profile: {
                            select: {
                                gender: true,
                            }
                        }
                    }
                }
            }
        })

        if (verification.driverLicenseVerified) {
            throw new ConflictException("Driver's License has already been verified")
        }

        const data = await this.qoreid.driversLicense({ idNumber: licenseNumber }, {
            email: verification.driver.email,
            phone: verification.driver.phone,
            lastname: verification.driver.lastname,
            firstname: verification.driver.firstname,
            dob: Utils.formatDate(new Date(dob), 'YYYY-MM-DD'),
            gender: verification.driver.profile.gender.toLowerCase(),
        })

        const expiry_date = data.drivers_license?.expiry_date
        if (expiry_date) {
            const [day, month, year] = expiry_date.split("-")
            const expiryDate = new Date(`${year}-${month}-${day}`)

            if (new Date() > expiryDate) {
                throw new ForbiddenException("Driver's License has expired")
            }
        }

        const tailoredData = {
            firstname: data.drivers_license.firstname,
            lastname: data.drivers_license.lastname,
            state_of_issue: data.drivers_license.state_of_issue,
            issued_date: data.drivers_license.issued_date,
            expiry_date: data.drivers_license.expiry_date
        }

        if (data && data.summary.drivers_license_check.status !== "EXACT_MATCH") {
            throw new ForbiddenException("ID not match")
        }

        return await this.prisma.verification.update({
            where: { driverId: sub },
            data: {
                driverLicense: licenseNumber,
                driverLicenseVerified: true,
                driverLicenseData: tailoredData,
            },
            select: {
                id: true,
                driverId: true,
                driverLicense: true,
                driverLicenseData: true,
                driverLicenseVerified: true,
            }
        })
    }

    async uploadProofOfAddress({ sub }: JwtDecoded, file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException("File not found")
        }

        const fileValidation = validateFile(file, 10 << 20, 'jpg', 'jpeg', 'png')
        if (fileValidation?.status) {
            throw new HttpException(fileValidation.message, fileValidation.status)
        }

        const { public_id, secure_url } = await this.cloudinary.upload(fileValidation.file, {
            folder: 'RideShare/Verification',
            resource_type: 'image'
        })

        const data = {
            size: file.size,
            url: secure_url,
            type: file.mimetype,
            public_id: public_id,
        }

        return await this.prisma.verification.update({
            where: { driverId: sub },
            data: {
                proofOfAddress: data,
                addressVerified: true,
            },
            select: {
                driverId: true,
                proofOfAddress: true,
                addressVerified: true,
            }
        })
    }

    async addVehicle(
        { sub }: JwtDecoded,
        {
            description,
            year,
            color,
            seatNumber,
            plateNumber,
            isOwner,
            ownerName,
            ownerPhoneNo,
            wifi,
            music,
            phoneCharger,
            temperatureControl,
        }: VehicleDTO,
        file: Express.Multer.File,
    ) {
        if (!isOwner && !file) {
            throw new BadRequestException("Agreement document is required")
        }

        const vehicleExist = await this.prisma.vehicle.findFirst({
            where: { plateNumber }
        })

        if (vehicleExist) {
            throw new ConflictException("Existing vehicle")
        }

        const verification = await this.prisma.verification.findUnique({
            where: { driverId: sub },
            include: {
                driver: {
                    select: {
                        lastname: true,
                        firstname: true,
                    }
                }
            }
        })

        if (!verification) {
            throw new BadRequestException("Verification is required")
        }

        if (!verification.driverLicenseVerified) {
            throw new UnauthorizedException("Verify your Driver's License")
        }

        const { verified, metadata } = await this.verifyVehicleOwner(plateNumber, verification.driver.firstname, verification.driver.lastname)

        if (isOwner && !verified) {
            throw new UnauthorizedException("Invalid credentials")
        }

        let isNotOwnerdata = {} as {
            agreement: Attachment
            phoneNoData: {
                regionCode: string
                countryCode: string
                significant: string
            }
        }

        if (!isOwner) {
            const phoneNoData = Utils.normalizePhoneNumber(ownerPhoneNo)

            const fileValidation = validateFile(file, 10 << 20, 'jpg', 'jpeg', 'png')
            if (fileValidation?.status) {
                throw new HttpException(fileValidation.message, fileValidation.status)
            }

            const { public_id, secure_url } = await this.cloudinary.upload(fileValidation.file, {
                folder: 'RideShare/Vehicle',
                resource_type: 'image'
            })

            isNotOwnerdata = {
                agreement: {
                    size: file.size,
                    url: secure_url,
                    type: file.mimetype,
                    public_id: public_id,
                },
                phoneNoData,
            }
        }

        return await this.prisma.vehicle.create({
            data: {
                year,
                color,
                isOwner,
                metadata,
                ownerName,
                seatNumber,
                plateNumber,
                description,
                ownerPhoneNo,
                make: metadata.vehicleMake,
                model: metadata.vehicleModel,
                verified: isOwner ? true : false,
                category: metadata.vehicleCategory,
                ownerPhoneNoProperty: isNotOwnerdata?.phoneNoData,
                agreementDocument: isNotOwnerdata?.agreement as unknown as Prisma.JsonValue,
                amenity: {
                    create: {
                        wifi, music,
                        phoneCharger,
                        temperatureControl,
                    }
                },
                driver: { connect: { id: sub } }
            },
            include: { amenity: true }
        })
    }

    async updateVehicle(
        { sub }: JwtDecoded,
        vehicleId: string,
        {
            year,
            color,
            wifi,
            music,
            seatNumber,
            description,
            phoneCharger,
            temperatureControl,
        }: UpdateVehicleDTO,
    ) {
        const vehicle = await this.prisma.vehicle.findUnique({
            where: { id: vehicleId, driverId: sub },
            include: {
                amenity: true,
                driver: {
                    select: {
                        lastname: true,
                        firstname: true,
                    }
                }
            }
        })

        if (!vehicle) {
            throw new NotFoundException("Vehicle not found")
        }

        return await this.prisma.vehicle.update({
            where: { id: vehicleId },
            data: {
                year,
                color,
                seatNumber,
                description,
                amenity: {
                    update: {
                        wifi,
                        music,
                        phoneCharger,
                        temperatureControl,
                    }
                },
            },
            include: { amenity: true }
        })
    }

    async deleteVehicle({ sub, role }: JwtDecoded, vehicleId: string) {
        const vehicle = await this.prisma.vehicle.findUnique({
            where: role === "DRIVER" ? {
                id: vehicleId,
                driverId: sub
            } : { id: vehicleId },
            include: {
                amenity: true,
                driver: {
                    select: { email: true }
                }
            }
        })

        if (!vehicle) {
            throw new NotFoundException("Vehicle not found")
        }

        await this.prisma.$transaction([
            this.prisma.vehicle.delete({
                where: { id: vehicleId },
            }),
            this.prisma.amenity.delete({
                where: { vehicleId }
            })
        ])

        if (!vehicle.isOwner && vehicle.agreementDocument) {
            // @ts-ignore
            await this.cloudinary.delete(vehicle.agreementDocument.public_id)
        }

        if (role !== "DRIVER") {
            this.event.emit(
                'notification.email',
                new CreateEmailNotificationEvent({
                    emails: vehicle.driver.email,
                    template: 'VehicleRemoved',
                    subject: 'Vehicle Removed',
                    data: {

                    }
                })
            )
        }
    }
}
