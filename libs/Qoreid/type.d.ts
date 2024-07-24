interface QoreIDResponse {
    expiresIn: string
    accessToken: string
    tokenType: string
}

interface IDParam {
    idNumber: string
}

interface NINBody {
    firstname: string
    lastname: string
    dob?: string
    phone?: string
    email?: string
    gender?: string
}

interface NINResponse {
    id: number
    applicant: {
        firstname: string
        lastname: string
    }
    summary: {
        nin_check: {
            status: string
            fieldMatches: {
                firstname?: boolean
                lastname?: boolean
                gender?: boolean
                emailAddress?: boolean
                phoneNumber?: boolean
                dob?: boolean
            }
        }
    }
    status: {
        state: string
        status: string
    }
    nin: {
        nin?: string
        firstname?: string
        lastname?: string
        middlename?: string
        phone?: string
        gender?: string
        birthdate?: string
        photo?: string
        address?: string
    }
}

interface VotersCardBody {
    firstname: string
    lastname: string
    dob: string
}

interface VotersCardResponse {
    id: number
    applicant: {
        firstname: string
        lastname: string
        dob?: string
    }
    summary: {
        voters_card_check: {
            status: string
            fieldMatches: {
                firstname?: boolean
                lastname?: boolean
                dob?: boolean
            }
        }
    }
    status: {
        state: string
        status: string
    }
    voters_card: {
        fullname?: string
        vin?: string
        gender?: string
        occupation?: string
        pollingUnitCode?: string
        firstName?: string
        lastName?: string
    }
}

interface PassportBody {
    firstname: string
    lastname: string
    dob?: string
    gender?: string
}

interface PassportResponse {
    id: number
    applicant: {
        firstname: string
        lastname: string
    }
    summary: {
        passport_check: {
            status: string
            fieldMatches: {
                firstname: boolean
                lastname: boolean
            }
        }
    }
    status: {
        state: string
        status: string
    }
    passport: {
        firstname: string
        lastname: string
        middlename: string
        birthdate: string
        photo: string
        gender: string
        issuedAt: string
        issuedDate: string
        expiryDate: string
        passportNo: string
    }
}

interface PlateNumberBody {
    firstname: string
    lastname: string
}

interface PlateNumberResponse {
    id: number
    applicant: {
        firstname: string
        lastname: string
    }
    summary: {
        license_plate_check: {
            status: string
            fieldMatches: {
                firstname: boolean
                lastname: boolean
            }
        }
    }
    status: {
        state: string
        status: string
    }
    license_plate: {
        plateNumber: string
        chassisNumber: string
        vehicleMake: string
        vehicleModel: string
        vehicleCategory: string
        firstname: string
        middlename?: string
        lastname: string
    }
}

interface DriversLicenseBody extends NINBody { }

interface DriversLicenseResponse {
    id: number
    applicant: {
        firstname: string
        lastname: string
    }
    summary: {
        drivers_license_check: {
            status: string
            fieldMatches: {
                firstname: boolean
                lastname: boolean
            }
        }
    }
    status: {
        state: string
        status: string
    }
    drivers_license: {
        driversLicense: string
        firstname: string
        lastname: string
        birthdate: string
        photo: string
        issued_date: string
        expiry_date: string
        state_of_issue: string
        gender: string
        message: string
    }
}
