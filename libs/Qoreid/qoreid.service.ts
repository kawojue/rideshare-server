import { Injectable } from "@nestjs/common"
import { QoreidConsumer } from "./consumer.service"

@Injectable()
export class QoreidService {
    private consumer: QoreidConsumer

    constructor() {
        this.consumer = new QoreidConsumer('https://api.qoreid.com/v1/ng/identities')
    }

    votersCard({ idNumber }: IDParam, data: VotersCardBody) {
        return this.consumer.sendRequest<VotersCardResponse>('POST', `/vin/${idNumber}`, data)
    }

    nin({ idNumber }: IDParam, data: NINBody) {
        return this.consumer.sendRequest<NINResponse>('POST', `/nin/${idNumber}`, data)
    }

    passport({ idNumber }: IDParam, data: PassportBody) {
        return this.consumer.sendRequest<PassportResponse>('POST', `/passport/${idNumber}`, data)
    }

    plateNumber({ idNumber }: IDParam, data: PlateNumberBody) {
        return this.consumer.sendRequest<PlateNumberResponse>('POST', `/license-plate-basic/${idNumber}`, data)
    }

    driversLicense({ idNumber }: IDParam, data: DriversLicenseBody) {
        return this.consumer.sendRequest<DriversLicenseResponse>('POST', `/drivers-license/${idNumber}`, data)
    }
}