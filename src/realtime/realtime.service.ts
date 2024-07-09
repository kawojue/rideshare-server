import { Server } from 'socket.io'
import { Injectable } from '@nestjs/common'
import { StatusCodes } from 'enums/statusCodes'
import { PrismaService } from 'prisma/prisma.service'
import { CloudinaryService } from 'src/cloudinary/cloudinary.service'

@Injectable()
export class RealtimeService {
  private server: Server

  setServer(server: Server) {
    this.server = server
  }

  getServer(): Server {
    return this.server
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) { }

  validateFile(file: string) {
    const maxSize = 3 << 20
    const allowedTypes = ['video/mp4', 'image/png', 'image/jpeg', 'image/jpg']
    const { fileSize, fileType } = this.getFileType(file)

    if (fileSize > maxSize) {
      return { status: StatusCodes.BadRequest, message: 'File size exceeds limit' }
    }

    if (!allowedTypes.includes(fileType)) {
      return { status: StatusCodes.UnsupportedMediaType, message: 'Unsupported file type' }
    }

    return { file }
  }

  getFileType(file: string) {
    const match = file.match(/^data:(.*?);base64,/)
    const fileSize = Buffer.byteLength(file, 'base64')
    return { fileType: match ? match[1] : '', fileSize }
  }

  async saveFile(file: string) {
    const base64Data = file.replace(/^data:.*;base64,/, '')
    const { fileType, fileSize } = this.getFileType(file)

    const { secure_url, public_id } = await this.cloudinary.upload(Buffer.from(base64Data, 'base64'), {
      folder: 'RideShare/Chat',
      resource_type: 'auto'
    })

    return {
      size: fileSize,
      type: fileType,
      secure_url, public_id,
    }
  }
}