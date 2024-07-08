import axios from 'axios'
import {
    extractFirstAndLastName,
    formatDate, toUpperCase,
} from 'helpers/transformer'
import { Response } from 'express'
import { Prisma } from '@prisma/client'
import { validateFile } from 'utils/file'
import { Injectable } from '@nestjs/common'
import { VehicleDTO } from './dto/vehicle.dto'
import { MiscService } from 'libs/misc.service'
import { StatusCodes } from 'enums/statusCodes'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'libs/response.service'
import { VerificationDTO } from './dto/verification.dto'
import { normalizePhoneNumber } from 'helpers/generators'
import { CloudinaryService } from 'src/cloudinary/cloudinary.service'

@Injectable()
export class DriverService {
    constructor(
        private readonly misc: MiscService,
        private readonly prisma: PrismaService,
        private readonly response: ResponseService,
        private readonly cloudinary: CloudinaryService,
    ) { }

    async verification(
        res: Response,
        { sub }: ExpressUser,
        file: Express.Multer.File,
        {
            nationalId, vnin,
            dob, driverLicenseId,
        }: VerificationDTO
    ) {
        try {
            const isDriverLicenseExist = await this.prisma.verification.findFirst({
                where: { approved: true, driverLicense: { equals: driverLicenseId, mode: 'insensitive' } }
            })

            if (isDriverLicenseExist) {
                return this.response.sendError(res, StatusCodes.Conflict, "Rider with the same driver's license already exist")
            }

            const isNINExist = await this.prisma.verification.findUnique({
                where: { approved: true, nationalId: nationalId.trim() }
            })

            if (isNINExist) {
                return this.response.sendError(res, StatusCodes.Conflict, "Rider with the same ID number already exist")
            }

            const user = await this.prisma.user.findUnique({
                where: { id: sub },
            })

            const formattedDob = formatDate(dob)
            const full_name: string[] = toUpperCase(user.fullname).split(/[\s,]+/).filter(Boolean)
            const { firstName, lastName } = extractFirstAndLastName(user.fullname)

            await axios.post(
                "https://api.verified.africa/sfx-verify/v3/id-service",
                {
                    countryCode: 'NG',
                    dob: formattedDob,
                    firstName, lastName,
                    searchParameter: driverLicenseId,
                    verificationType: "DRIVER-LICENSE-FULL-DETAIL-VERIFICATION",
                },
                {
                    headers: {
                        userId: process.env.SEAMFIX_USERID,
                        apiKey: process.env.SEAMFIX_API_KEY,
                    },
                }
            ).then((response) => {
                const data = response.data.response as DriverLicenseResponse
                let matchingNamesCount = 0

                const license_full_name = toUpperCase(`${data?.first_name ?? ''} ${data?.middle_name ?? ''} ${data?.last_name ?? ''}`).split(/[\s,]+/).filter(Boolean)
                const full_name: string[] = toUpperCase(user.fullname).split(/[\s,]+/).filter(Boolean)

                for (const license_name of license_full_name) {
                    if (full_name.includes(license_name)) {
                        matchingNamesCount += 1
                    }
                }

                let percentage = matchingNamesCount * 25
                if (percentage < 50) {
                    return this.response.sendError(res, StatusCodes.Unauthorized, "Profiles not matched")
                }

                if (data?.mobile) {
                    for (const tel of data.mobile) {
                        const normalizedTel = normalizePhoneNumber(tel)
                        for (const profileTel of user.phone) {
                            const normalizedProfileTel = normalizePhoneNumber(profileTel)
                            if (normalizedTel.endsWith(normalizedProfileTel) || normalizedProfileTel.endsWith(normalizedTel)) {
                                percentage += 5
                                break
                            }
                        }
                    }

                    const verified = percentage >= 80
                    if (!verified) {
                        return this.response.sendError(res, StatusCodes.Unauthorized, "Profiles not matched")
                    }
                }
            }).catch((err) => { throw err })

            await axios.post(
                "https://api.verified.africa/sfx-verify/v3/id-service",
                {
                    countryCode: 'NG',
                    searchParameter: vnin,
                    verificationType: "V-NIN",
                },
                {
                    headers: {
                        userId: process.env.SEAMFIX_USERID,
                        apiKey: process.env.SEAMFIX_API_KEY,
                    },
                }
            ).then((response) => {
                const data = response.data.response as VNINResponse
                let matchingNamesCount = 0

                const vnin_full_name = toUpperCase(`${data?.firname ?? ''} ${data?.middlename ?? ''} ${data?.lastname ?? ''}`).split(/[\s,]+/).filter(Boolean)

                for (const license_name of vnin_full_name) {
                    if (full_name.includes(license_name)) {
                        matchingNamesCount += 1
                    }
                }

                let percentage = matchingNamesCount * 25
                if (percentage < 50) {
                    return this.response.sendError(res, StatusCodes.Unauthorized, "Profiles do not matched")
                }
            }).catch((err) => { throw err })


            const fileValidation = validateFile(file, 10 << 20, 'jpg', 'jpeg', 'png')
            if (fileValidation?.status) {
                return this.response.sendError(res, fileValidation.status, fileValidation.message)
            }

            const { public_id, secure_url } = await this.cloudinary.upload(fileValidation.file, {
                folder: 'RideShare/Verification',
                resource_type: 'image'
            })

            const proofOfAddress = {
                size: file.size,
                type: file.mimetype,
                url: secure_url,
                public_id: public_id,
            }

            const verification = await this.prisma.verification.upsert({
                where: { driverId: sub },
                create: {
                    driverLicense: driverLicenseId,
                    dob, proofOfAddress, nationalId,
                    driver: { connect: { id: sub } }
                },
                update: {
                    driverLicense: driverLicenseId,
                    dob, proofOfAddress, nationalId,
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: verification })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async addVehicle(
        res: Response,
        { sub }: ExpressUser,
        {
            brand,
            model,
            classification,
            year,
            color,
            seatNumber,
            vin,
            plateNumber,
            isOwner,
            ownerName,
            ownerPhoneNumber,
            wifi,
            music,
            phoneCharger,
            temperatureControl,
        }: VehicleDTO,
        file: Express.Multer.File,
    ) {
        try {
            if (!isOwner && !file) {
                return this.response.sendError(res, StatusCodes.BadRequest, "Agreement document is required")
            }

            const verification = await this.prisma.verification.findUnique({
                where: { driverId: sub },
                select: { approved: true }
            })

            if (!verification) {
                return this.response.sendError(res, StatusCodes.Forbidden, "Profile verification is required")
            }

            if (!verification?.approved) {
                return this.response.sendError(res, StatusCodes.Unauthorized, "Verification in progress")
            }

            const vehicleExist = await this.prisma.vehicle.findFirst({
                where: {
                    OR: [
                        { vin: { equals: vin } },
                        { plateNumber: { equals: plateNumber } },
                    ]
                }
            })

            if (vehicleExist) {
                return this.response.sendError(res, StatusCodes.Conflict, "Existing vehicle")
            }

            let agreement: Attachment

            if (!isOwner) {
                ownerPhoneNumber = normalizePhoneNumber(ownerPhoneNumber)

                const fileValidation = validateFile(file, 10 << 20, 'jpg', 'jpeg', 'png')
                if (fileValidation?.status) {
                    return this.response.sendError(res, fileValidation.status, fileValidation.message)
                }

                const { public_id, secure_url } = await this.cloudinary.upload(fileValidation.file, {
                    folder: 'RideShare/Vehicle',
                    resource_type: 'image'
                })

                agreement = {
                    size: file.size,
                    type: file.mimetype,
                    url: secure_url,
                    public_id: public_id,
                }
            }

            const vehicle = await this.prisma.vehicle.create({
                data: {
                    brand,
                    model,
                    classification,
                    year,
                    color,
                    seatNumber,
                    vin,
                    plateNumber,
                    isOwner,
                    ownerName,
                    ownerPhoneNumber,
                    agreementDocument: agreement as unknown as Prisma.JsonValue,
                    amenity: {
                        create: {
                            wifi,
                            music,
                            phoneCharger,
                            temperatureControl,
                        }
                    },
                    driver: { connect: { id: sub } }
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: vehicle })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async updateVehicle(
        res: Response,
        { sub }: ExpressUser,
        vehicleId: string,
        {
            brand,
            model,
            classification,
            year,
            color,
            seatNumber,
            vin,
            plateNumber,
            isOwner,
            ownerName,
            ownerPhoneNumber,
            wifi,
            music,
            phoneCharger,
            temperatureControl,
        }: VehicleDTO,
        file?: Express.Multer.File,
    ) {
        try {
            const vehicle = await this.prisma.vehicle.findUnique({
                where: { id: vehicleId, driverId: sub },
                include: { amenity: true }
            })

            if (!vehicle) {
                return this.response.sendError(res, StatusCodes.NotFound, "Vehicle not found")
            }

            let agreement: Attachment

            if (!isOwner) {
                if (!file && !vehicle.agreementDocument) {
                    return this.response.sendError(res, StatusCodes.BadRequest, "Agreement document is required")
                }

                if (file) {
                    ownerPhoneNumber = normalizePhoneNumber(ownerPhoneNumber)

                    const fileValidation = validateFile(file, 10 << 20, 'jpg', 'jpeg', 'png')
                    if (fileValidation?.status) {
                        return this.response.sendError(res, fileValidation.status, fileValidation.message)
                    }

                    if (vehicle.agreementDocument) {
                        // @ts-ignore
                        await this.cloudinary.delete(vehicle.agreementDocument.public_id)
                    }

                    const { public_id, secure_url } = await this.cloudinary.upload(fileValidation.file, {
                        folder: 'RideShare/Vehicle',
                        resource_type: 'image'
                    })

                    agreement = {
                        size: file.size,
                        type: file.mimetype,
                        url: secure_url,
                        public_id: public_id,
                    }
                }
            }

            const updatedVehicle = await this.prisma.vehicle.update({
                where: { id: vehicleId },
                data: {
                    brand,
                    model,
                    classification,
                    year,
                    color,
                    seatNumber,
                    vin,
                    plateNumber,
                    isOwner,
                    ownerName,
                    ownerPhoneNumber,
                    agreementDocument: agreement ? (agreement as unknown as Prisma.JsonValue) : vehicle.agreementDocument,
                    amenity: {
                        update: {
                            wifi,
                            music,
                            phoneCharger,
                            temperatureControl,
                        }
                    },
                }
            })

            this.response.sendSuccess(res, StatusCodes.OK, { data: updatedVehicle })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }

    async deleteVehicle(
        res: Response,
        { sub, role }: ExpressUser,
        vehicleId: string,
    ) {
        try {
            const vehicle = await this.prisma.vehicle.findUnique({
                where: role === "DRIVER" ? {
                    id: vehicleId,
                    driverId: sub
                } : { id: vehicleId },
                include: { amenity: true }
            })

            if (!vehicle) {
                return this.response.sendError(res, StatusCodes.NotFound, "Vehicle not found")
            }

            if (!vehicle.isOwner && vehicle.agreementDocument) {
                // @ts-ignore
                await this.cloudinary.delete(vehicle.agreementDocument.public_id)
            }

            const [deletedVehicle, amenity] = await this.prisma.$transaction([
                this.prisma.vehicle.delete({
                    where: { id: vehicleId },
                }),
                this.prisma.amenity.delete({
                    where: { vehicleId }
                })
            ])

            this.response.sendSuccess(res, StatusCodes.OK, {
                data: { ...deletedVehicle, amenity },
                message: "Vehicle deleted successfully",
            })
        } catch (err) {
            this.misc.handleServerError(res, err)
        }
    }
}
