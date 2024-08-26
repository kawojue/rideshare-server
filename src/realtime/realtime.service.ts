import { Server } from 'socket.io'
import { Injectable } from '@nestjs/common'
import { StatusCodes } from 'enums/statusCodes'
import { CallStatus, Role } from '@prisma/client'
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

  isChatAllowed(senderRole: Role, receiverRole: Role): boolean {
    if (
      (senderRole === Role.DRIVER && receiverRole === Role.DRIVER) ||
      (senderRole === Role.PASSENGER && receiverRole === Role.PASSENGER) ||
      (senderRole === Role.ADMIN && receiverRole === Role.ADMIN) ||
      (senderRole === Role.MODERATOR && receiverRole === Role.MODERATOR)
    ) {
      return false
    }
    return true
  }

  isCallAllowed(senderRole: Role, receiverRole: Role): boolean {
    if (
      (senderRole === Role.DRIVER && receiverRole === Role.DRIVER) ||
      (senderRole === Role.PASSENGER && receiverRole === Role.PASSENGER) ||
      (senderRole === Role.ADMIN && receiverRole === Role.ADMIN) ||
      (senderRole === Role.MODERATOR && receiverRole === Role.MODERATOR) ||
      (senderRole === Role.DRIVER && receiverRole === Role.ADMIN) ||
      (senderRole === Role.DRIVER && receiverRole === Role.MODERATOR) ||
      (senderRole === Role.PASSENGER && receiverRole === Role.ADMIN) ||
      (senderRole === Role.PASSENGER && receiverRole === Role.MODERATOR) ||
      (senderRole === Role.ADMIN && receiverRole === Role.DRIVER) ||
      (senderRole === Role.ADMIN && receiverRole === Role.PASSENGER) ||
      (senderRole === Role.MODERATOR && receiverRole === Role.DRIVER) ||
      (senderRole === Role.MODERATOR && receiverRole === Role.PASSENGER)
    ) {
      return false
    }
    return true
  }

  validateFile(file: string) {
    const maxSize = 3 << 20
    const allowedTypes = ['video/mp4', 'image/png', 'image/jpeg', 'image/jpg']
    const { fileSize, fileType } = this.getFileMetadata(file)

    if (fileSize > maxSize) {
      return { status: StatusCodes.BadRequest, message: 'File size exceeds limit' }
    }

    if (!allowedTypes.includes(fileType)) {
      return { status: StatusCodes.UnsupportedMediaType, message: 'Unsupported file type' }
    }

    return { file }
  }

  getFileMetadata(file: string) {
    const match = file.match(/^data:(.*?);base64,/)
    const fileSize = Buffer.byteLength(file, 'base64')
    return { fileType: match ? match[1] : '', fileSize }
  }

  async saveFile(file: string) {
    const base64Data = file.replace(/^data:.*;base64,/, '')
    const { fileType, fileSize } = this.getFileMetadata(file)

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

  async getInbox(inboxId: string) {
    return await this.prisma.inbox.findUnique({
      where: { id: inboxId },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            profile: {
              select: {
                avatar: true,

              }
            },
            lastname: true,
            firstname: true,
          }
        },
        modmin: {
          select: {
            id: true,
            role: true,
            fullname: true,
          }
        },
      },
    })
  }

  async logCall(data: {
    callerId: string
    receiverId: string
    callStatus: CallStatus
  }) {
    return await this.prisma.callLog.create({
      data: {
        callStatus: data.callStatus,
        caller: { connect: { id: data.callerId } },
        receiver: { connect: { id: data.receiverId } },
      },
    })
  }

  async updateCallStatus(callId: string, status: CallStatus) {
    return await this.prisma.callLog.update({
      where: { id: callId },
      data: { callStatus: status },
    })
  }

  async setStartTime(callId: string) {
    return await this.prisma.callLog.update({
      where: { id: callId },
      data: { startTime: new Date() },
    })
  }

  async setEndTime(callId: string) {
    return await this.prisma.callLog.update({
      where: { id: callId },
      data: { endTime: new Date() },
    })
  }
}