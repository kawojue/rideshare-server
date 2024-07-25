import { Response } from 'express'
import { Prisma } from '@prisma/client'
import { validateFile } from 'utils/file'
import { Injectable } from '@nestjs/common'
import { MiscService } from 'libs/misc.service'
import { StatusCodes } from 'enums/statusCodes'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'libs/response.service'
import { normalizePhoneNumber } from 'helpers/generators'
import { QoreidService } from 'libs/Qoreid/qoreid.service'
import { formatDate, toUpperCase } from 'helpers/transformer'
import { UpdateVehicleDTO, VehicleDTO } from './dto/vehicle.dto'
import { CloudinaryService } from 'src/cloudinary/cloudinary.service'
import { DriverLicenseDTO, IDVerificationDTO } from './dto/verification.dto'

@Injectable()
export class DriverService {
    private qoreid: QoreidService

    constructor(
        private readonly misc: MiscService,
        private readonly prisma: PrismaService,
        private readonly response: ResponseService,
        private readonly cloudinary: CloudinaryService,
    ) {
        this.qoreid = new QoreidService()
    }

    async idVerification(
        res: Response,
        { sub }: ExpressUser,
        {
            dob,
            idType,
            idNumber,
        }: IDVerificationDTO,
    ) {
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
            return this.response.sendError(res, StatusCodes.Conflict, "ID has already been verified")
        }

        let data: VotersCardResponse | NINResponse | PassportResponse | null

        if (idType === "NIN") {
            data = await this.qoreid.nin({ idNumber }, {
                email: verification.driver.email,
                phone: verification.driver.phone,
                lastname: verification.driver.lastname,
                firstname: verification.driver.firstname,
                dob: formatDate(new Date(dob), 'YYYY-MM-DD'),
                gender: verification.driver.profile.gender.toLowerCase(),
            })
        }
        if (idType === "VOTER") { }
        if (idType === "PASSPORT") { }
    }

    async driverLicenseVerification(
        res: Response,
        { sub }: ExpressUser,
        { dob, licenseNumber }: DriverLicenseDTO
    ) {

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
                select: {
                    driver: {
                        select: {
                            profile: {
                                select: { email_verified: true }
                            }
                        }
                    }
                }
            })

            if (!verification) {
                return this.response.sendError(res, StatusCodes.Forbidden, "Profile verification is required")
            }

            if (!verification.driver.profile.email_verified) {
                return this.response.sendError(res, StatusCodes.Unauthorized, "Verify your email")
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
                    url: secure_url,
                    type: file.mimetype,
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
        }: UpdateVehicleDTO,
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
                        url: secure_url,
                        type: file.mimetype,
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
