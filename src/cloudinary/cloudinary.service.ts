import {
    v2 as cloudinary,
    UploadApiResponse,
    UploadApiErrorResponse,
} from 'cloudinary'
import {
    Injectable,
    InternalServerErrorException
} from '@nestjs/common'
import { genFileName } from 'utils/file'
import toStream = require('buffer-to-stream')
import { ConfigService } from '@nestjs/config'

@Injectable()
export class CloudinaryService {
    constructor(private readonly configService: ConfigService) {
        cloudinary.config({
            api_key: this.configService.get<string>('cloudinary.apiKey'),
            cloud_name: this.configService.get<string>('cloudinary.cloudName'),
            api_secret: this.configService.get<string>('cloudinary.apiSecret'),
        })
    }

    async upload(
        file: Express.Multer.File | Buffer, header: FileDest,
    ): Promise<UploadApiResponse | UploadApiErrorResponse> {
        try {
            return new Promise((resolve, reject) => {
                const upload = cloudinary.uploader.upload_stream({
                    ...header,
                    public_id: `${genFileName()}`
                }, (error, result) => {
                    if (error) return reject(error)
                    resolve(result)
                })

                if (Buffer.isBuffer(file)) {
                    toStream(file).pipe(upload)
                } else {
                    toStream(file.buffer).pipe(upload)
                }
            })
        } catch (err) {
            console.error(err)
            throw new InternalServerErrorException("Error uploading file")
        }
    }

    async delete(public_id: string) {
        return await cloudinary.uploader.destroy(public_id)
    }
}