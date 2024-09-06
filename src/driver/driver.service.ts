import { Response } from 'express'
import { validateFile } from 'utils/file'
import { Injectable } from '@nestjs/common'
import { MiscService } from 'libs/misc.service'
import { $Enums, Prisma } from '@prisma/client'
import { StatusCodes } from 'enums/statusCodes'
import { PrismaService } from 'prisma/prisma.service'
import { ResponseService } from 'libs/response.service'
import { QoreidService } from 'libs/Qoreid/qoreid.service'
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

    // private async verifyVehicleOwner(plateNumber: string, firstname: string, lastname: string) {
    //     const data = await this.qoreid.plateNumber({
    //         idNumber: plateNumber
    //     }, {
    //         firstname,
    //         lastname
    //     })

    //     if (data && data.summary.license_plate_check.status === "EXACT_MATCH") {
    //         return { verified: true }
    //     } else {
    //         return { verified: false }
    //     }
    // }

    // async idVerification(
    //     res: Response,
    //     { sub }: ExpressUser,
    //     { dob, idType, idNumber }: IDVerificationDTO,
    // ) {
    //     const verification = await this.prisma.verification.findUnique({
    //         where: { driverId: sub },
    //         include: {
    //             driver: {
    //                 select: {
    //                     firstname: true,
    //                     lastname: true,
    //                     email: true,
    //                     phone: true,
    //                     profile: {
    //                         select: {
    //                             gender: true,
    //                         }
    //                     }
    //                 }
    //             }
    //         }
    //     })

    //     if (verification.idVerified) {
    //         return this.response.sendError(res, StatusCodes.Conflict, "ID has already been verified")
    //     }

    //     let check: string
    //     let tailoredData: any
    //     let data: VotersCardResponse | NINResponse | PassportResponse | null = null

    //     if (idType === "NIN") {
    //         data = await this.qoreid.nin({ idNumber }, {
    //             email: verification.driver.email,
    //             phone: verification.driver.phone,
    //             lastname: verification.driver.lastname,
    //             firstname: verification.driver.firstname,
    //             dob: formatDate(new Date(dob), 'YYYY-MM-DD'),
    //             gender: verification.driver.profile.gender.toLowerCase(),
    //         })

    //         check = 'nin_check'

    //         tailoredData = {
    //             id: data.id,
    //             firstname: data.nin?.firstname,
    //             lastname: data.nin?.lastname,
    //             address: data.nin?.address,
    //         }
    //     } else if (idType === "VOTER") {
    //         data = await this.qoreid.votersCard({ idNumber }, {
    //             lastname: verification.driver.lastname,
    //             firstname: verification.driver.firstname,
    //             dob: formatDate(new Date(dob), 'YYYY-MM-DD'),
    //         })

    //         check = 'voters_card_check'

    //         tailoredData = {
    //             id: data.id,
    //             firstname: data.voters_card?.firstName,
    //             lastname: data.voters_card?.lastName,
    //             occupation: data.voters_card?.occupation,
    //             pollingUnitCode: data.voters_card.pollingUnitCode,
    //         }
    //     } else if (idType === "PASSPORT") {
    //         data = await this.qoreid.passport({ idNumber }, {
    //             lastname: verification.driver.lastname,
    //             firstname: verification.driver.firstname,
    //             dob: formatDate(new Date(dob), 'YYYY-MM-DD'),
    //             gender: verification.driver.profile.gender.toLowerCase(),
    //         })

    //         check = 'passport_check'

    //         tailoredData = {
    //             id: data.id,
    //             firstname: data.passport?.firstname,
    //             lastname: data.passport?.lastname,
    //             middlename: data.passport?.middlename,
    //             issuedAt: data.passport?.issuedAt,
    //             issuedDate: data.passport?.issuedDate,
    //             expiryDate: data.passport?.expiryDate,
    //             passportNo: data.passport?.passportNo,
    //         }
    //     } else {
    //         return this.response.sendError(res, StatusCodes.BadRequest, "Invalid ID type")
    //     }

    //     let newVerification: {
    //         idNumber: string
    //         idType: $Enums.IDType
    //         idVerified: boolean
    //         idVerifiedAt: Date
    //         idVerificationData: Prisma.JsonValue
    //         driverId: string
    //     }

    //     if (data && data.summary[check].status === "EXACT_MATCH") {
    //         newVerification = await this.prisma.verification.update({
    //             where: { driverId: sub },
    //             data: {
    //                 idType,
    //                 idNumber,
    //                 idVerified: true,
    //                 idVerifiedAt: new Date(),
    //                 idVerificationData: tailoredData,
    //             },
    //             select: {
    //                 driverId: true,
    //                 idType: true,
    //                 idNumber: true,
    //                 idVerified: true,
    //                 idVerifiedAt: true,
    //                 idVerificationData: true,
    //             }
    //         })

    //         this.response.sendSuccess(res, StatusCodes.OK, { newVerification })
    //     } else {
    //         return this.response.sendError(res, StatusCodes.BadRequest, "ID verification failed")
    //     }
    // }

    // async driverLicenseVerification(
    //     res: Response,
    //     { sub }: ExpressUser,
    //     { dob, licenseNumber }: DriverLicenseDTO
    // ) {
    //     const verification = await this.prisma.verification.findUnique({
    //         where: { driverId: sub },
    //         include: {
    //             driver: {
    //                 select: {
    //                     firstname: true,
    //                     lastname: true,
    //                     email: true,
    //                     phone: true,
    //                     profile: {
    //                         select: {
    //                             gender: true,
    //                         }
    //                     }
    //                 }
    //             }
    //         }
    //     })

    //     if (verification.driverLicenseVerified) {
    //         return this.response.sendError(res, StatusCodes.Conflict, "Driver's License has already been verified")
    //     }

    //     const data = await this.qoreid.driversLicense({ idNumber: licenseNumber }, {
    //         email: verification.driver.email,
    //         phone: verification.driver.phone,
    //         lastname: verification.driver.lastname,
    //         firstname: verification.driver.firstname,
    //         dob: formatDate(new Date(dob), 'YYYY-MM-DD'),
    //         gender: verification.driver.profile.gender.toLowerCase(),
    //     })

    //     const expiry_date = data.drivers_license.expiry_date
    //     const [day, month, year] = expiry_date.split("-")
    //     const expiryDate = new Date(`${year}-${month}-${day}`)

    //     if (new Date() > expiryDate) {
    //         return this.response.sendError(res, StatusCodes.Forbidden, "Driver's License has expired")
    //     }

    //     const tailoredData = {
    //         firstname: data.drivers_license.firstname,
    //         lastname: data.drivers_license.lastname,
    //         state_of_issue: data.drivers_license.state_of_issue,
    //         issued_date: data.drivers_license.issued_date,
    //         expiry_date: data.drivers_license.expiry_date
    //     }

    //     let newVerification: {
    //         id: string
    //         driverLicense: string
    //         driverLicenseData: Prisma.JsonValue
    //         driverLicenseVerified: boolean
    //         driverId: string
    //     }

    //     if (data && data.summary.drivers_license_check.status === "EXACT_MATCH") {
    //         newVerification = await this.prisma.verification.update({
    //             where: { driverId: sub },
    //             data: {
    //                 driverLicense: licenseNumber,
    //                 driverLicenseVerified: true,
    //                 driverLicenseData: tailoredData,
    //             },
    //             select: {
    //                 id: true,
    //                 driverId: true,
    //                 driverLicense: true,
    //                 driverLicenseData: true,
    //                 driverLicenseVerified: true,
    //             }
    //         })
    //     } else {
    //         return this.response.sendError(res, StatusCodes.BadRequest, "Invalid ID type")
    //     }

    //     this.response.sendSuccess(res, StatusCodes.OK, { data: newVerification })
    // }

    // async uploadProofOfAddress(
    //     res: Response,
    //     { sub }: ExpressUser,
    //     file: Express.Multer.File,
    // ) {
    //     if (!file) {
    //         return this.response.sendError(res, StatusCodes.BadRequest, "File not found")
    //     }

    //     const fileValidation = validateFile(file, 10 << 20, 'jpg', 'jpeg', 'png')
    //     if (fileValidation?.status) {
    //         return this.response.sendError(res, fileValidation.status, fileValidation.message)
    //     }

    //     const { public_id, secure_url } = await this.cloudinary.upload(fileValidation.file, {
    //         folder: 'RideShare/Verification',
    //         resource_type: 'image'
    //     })

    //     const data = {
    //         size: file.size,
    //         url: secure_url,
    //         type: file.mimetype,
    //         public_id: public_id,
    //     }

    //     const verification = await this.prisma.verification.update({
    //         where: { driverId: sub },
    //         data: {
    //             proofOfAddress: data,
    //             addressVerified: true,
    //         },
    //         select: {
    //             driverId: true,
    //             proofOfAddress: true,
    //             addressVerified: true,
    //         }
    //     })

    //     this.response.sendSuccess(res, StatusCodes.OK, { data: verification })
    // }

    // async addVehicle(
    //     res: Response,
    //     { sub }: ExpressUser,
    //     {
    //         brand,
    //         model,
    //         classification,
    //         year,
    //         color,
    //         seatNumber,
    //         vin,
    //         plateNumber,
    //         isOwner,
    //         ownerName,
    //         ownerPhoneNumber,
    //         wifi,
    //         music,
    //         phoneCharger,
    //         temperatureControl,
    //     }: VehicleDTO,
    //     file: Express.Multer.File,
    // ) {
    //     if (!isOwner && !file) {
    //         return this.response.sendError(res, StatusCodes.BadRequest, "Agreement document is required")
    //     }

    //     const vehicleExist = await this.prisma.vehicle.findFirst({
    //         where: {
    //             OR: [
    //                 { vin: { equals: vin } },
    //                 { plateNumber: { equals: plateNumber } },
    //             ]
    //         }
    //     })

    //     if (vehicleExist) {
    //         return this.response.sendError(res, StatusCodes.Conflict, "Existing vehicle")
    //     }

    //     const verification = await this.prisma.verification.findUnique({
    //         where: { driverId: sub },
    //         include: {
    //             driver: {
    //                 select: {
    //                     firstname: true,
    //                     lastname: true,
    //                     profile: {
    //                         select: { email_verified: true }
    //                     }
    //                 }
    //             }
    //         }
    //     })

    //     if (!verification) {
    //         return this.response.sendError(res, StatusCodes.Forbidden, "Profile verification is required")
    //     }

    //     if (!verification.driver.profile.email_verified) {
    //         return this.response.sendError(res, StatusCodes.Unauthorized, "Verify your email")
    //     }

    //     if (!verification.driverLicenseVerified) {
    //         return this.response.sendError(res, StatusCodes.Unauthorized, "Verify your Driver's License")
    //     }

    //     if (isOwner) {
    //         const { verified } = await this.verifyVehicleOwner(plateNumber, verification.driver.firstname, verification.driver.lastname)

    //         if (!verified) {
    //             return this.response.sendError(res, StatusCodes.Unauthorized, "Invalid credentials")
    //         }
    //     }

    //     let agreement: Attachment

    //     if (!isOwner) {
    //         ownerPhoneNumber = normalizePhoneNumber(ownerPhoneNumber)

    //         const fileValidation = validateFile(file, 10 << 20, 'jpg', 'jpeg', 'png')
    //         if (fileValidation?.status) {
    //             return this.response.sendError(res, fileValidation.status, fileValidation.message)
    //         }

    //         const { public_id, secure_url } = await this.cloudinary.upload(fileValidation.file, {
    //             folder: 'RideShare/Vehicle',
    //             resource_type: 'image'
    //         })

    //         agreement = {
    //             size: file.size,
    //             url: secure_url,
    //             type: file.mimetype,
    //             public_id: public_id,
    //         }
    //     }

    //     const vehicle = await this.prisma.vehicle.create({
    //         data: {
    //             brand,
    //             model,
    //             classification,
    //             year,
    //             color,
    //             seatNumber,
    //             vin,
    //             plateNumber,
    //             isOwner,
    //             ownerName,
    //             ownerPhoneNumber,
    //             verified: isOwner ? true : false,
    //             agreementDocument: agreement as unknown as Prisma.JsonValue,
    //             amenity: {
    //                 create: {
    //                     wifi,
    //                     music,
    //                     phoneCharger,
    //                     temperatureControl,
    //                 }
    //             },
    //             driver: { connect: { id: sub } }
    //         }
    //     })

    //     this.response.sendSuccess(res, StatusCodes.OK, { data: vehicle })
    // }

    // async updateVehicle(
    //     res: Response,
    //     { sub }: ExpressUser,
    //     vehicleId: string,
    //     {
    //         brand,
    //         model,
    //         classification,
    //         year,
    //         color,
    //         seatNumber,
    //         vin,
    //         plateNumber,
    //         isOwner,
    //         ownerName,
    //         ownerPhoneNumber,
    //         wifi,
    //         music,
    //         phoneCharger,
    //         temperatureControl,
    //     }: UpdateVehicleDTO,
    //     file?: Express.Multer.File,
    // ) {
    //     const vehicle = await this.prisma.vehicle.findUnique({
    //         where: { id: vehicleId, driverId: sub },
    //         include: {
    //             amenity: true,
    //             driver: {
    //                 select: {
    //                     lastname: true,
    //                     firstname: true,
    //                 }
    //             }
    //         }
    //     })

    //     if (!vehicle) {
    //         return this.response.sendError(res, StatusCodes.NotFound, "Vehicle not found")
    //     }

    //     if ((vehicle.isOwner || isOwner) && plateNumber) {
    //         const { verified } = await this.verifyVehicleOwner(plateNumber, vehicle.driver.firstname, vehicle.driver.lastname)

    //         if (!verified) {
    //             return this.response.sendError(res, StatusCodes.Unauthorized, "Invalid credentials")
    //         }
    //     }

    //     let agreement: Attachment

    //     if (!isOwner) {
    //         if (!file && !vehicle.agreementDocument) {
    //             return this.response.sendError(res, StatusCodes.BadRequest, "Agreement document is required")
    //         }

    //         if (file) {
    //             ownerPhoneNumber = normalizePhoneNumber(ownerPhoneNumber)

    //             const fileValidation = validateFile(file, 10 << 20, 'jpg', 'jpeg', 'png')
    //             if (fileValidation?.status) {
    //                 return this.response.sendError(res, fileValidation.status, fileValidation.message)
    //             }

    //             if (vehicle.agreementDocument) {
    //                 // @ts-ignore
    //                 await this.cloudinary.delete(vehicle.agreementDocument.public_id)
    //             }

    //             const { public_id, secure_url } = await this.cloudinary.upload(fileValidation.file, {
    //                 folder: 'RideShare/Vehicle',
    //                 resource_type: 'image'
    //             })

    //             agreement = {
    //                 size: file.size,
    //                 url: secure_url,
    //                 type: file.mimetype,
    //                 public_id: public_id,
    //             }
    //         }
    //     }

    //     const updatedVehicle = await this.prisma.vehicle.update({
    //         where: { id: vehicleId },
    //         data: {
    //             brand,
    //             model,
    //             classification,
    //             year,
    //             color,
    //             seatNumber,
    //             vin,
    //             plateNumber,
    //             isOwner,
    //             ownerName,
    //             ownerPhoneNumber,
    //             agreementDocument: agreement ? (agreement as unknown as Prisma.JsonValue) : vehicle.agreementDocument,
    //             amenity: {
    //                 update: {
    //                     wifi,
    //                     music,
    //                     phoneCharger,
    //                     temperatureControl,
    //                 }
    //             },
    //         }
    //     })

    //     this.response.sendSuccess(res, StatusCodes.OK, { data: updatedVehicle })
    // }

    // async deleteVehicle(
    //     res: Response,
    //     { sub, role }: ExpressUser,
    //     vehicleId: string,
    // ) {
    //     try {
    //         const vehicle = await this.prisma.vehicle.findUnique({
    //             where: role === "DRIVER" ? {
    //                 id: vehicleId,
    //                 driverId: sub
    //             } : { id: vehicleId },
    //             include: { amenity: true }
    //         })

    //         if (!vehicle) {
    //             return this.response.sendError(res, StatusCodes.NotFound, "Vehicle not found")
    //         }

    //         if (!vehicle.isOwner && vehicle.agreementDocument) {
    //             // @ts-ignore
    //             await this.cloudinary.delete(vehicle.agreementDocument.public_id)
    //         }

    //         const [deletedVehicle, amenity] = await this.prisma.$transaction([
    //             this.prisma.vehicle.delete({
    //                 where: { id: vehicleId },
    //             }),
    //             this.prisma.amenity.delete({
    //                 where: { vehicleId }
    //             })
    //         ])

    //         this.response.sendSuccess(res, StatusCodes.OK, {
    //             data: { ...deletedVehicle, amenity },
    //             message: "Vehicle deleted successfully",
    //         })
    //     } catch (err) {
    //         this.misc.handleServerError(res, err)
    //     }
    // }
}
