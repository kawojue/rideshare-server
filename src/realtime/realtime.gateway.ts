import {
  MessageBody,
  OnGatewayInit,
  ConnectedSocket,
  WebSocketServer,
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Role } from '@prisma/client'
import { JwtService } from '@nestjs/jwt'
import { Server, Socket } from 'socket.io'
import { MessageDTO } from './dto/index.dto'
import { StatusCodes } from 'enums/statusCodes'
import { RealtimeService } from './realtime.service'
import { PrismaService } from 'prisma/prisma.service'

@WebSocketGateway({
  transports: ['polling', 'websocket'],
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'https://rideshare-server.onrender.com',
    ],
  }
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer() server: Server

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly realtimeService: RealtimeService,
  ) { }

  private clients: Map<Socket, { sub: string, role: Role }> = new Map()
  private onlineUsers: Map<string, string> = new Map()

  afterInit() {
    this.realtimeService.setServer(this.server)
  }

  async handleConnection(client: Socket) {
    const token = client.handshake.headers['authorization']?.split('Bearer ')[1]
    if (!token) {
      client.emit('unauthorized', {
        status: StatusCodes.Unauthorized,
        message: 'Token does not exist'
      })
      return
    }

    try {
      const { sub, role } = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
        ignoreExpiration: false,
      })

      this.clients.set(client, { sub, role })
      this.onlineUsers.set(sub, client.id)

      client.emit('connected', { status: StatusCodes.OK, message: 'Connected' })
    } catch (err) {
      client.emit('error', {
        status: StatusCodes.InternalServerError,
        message: err.message
      })
      client.disconnect()
    }
  }

  handleDisconnect(client: Socket) {
    const user = this.clients.get(client)
    if (user) {
      this.onlineUsers.delete(user.sub)
    }
    this.clients.delete(client)
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() { content, receiverId, file }: MessageDTO
  ) {
    const sender = this.clients.get(client)

    if (!sender) {
      client.emit('error', {
        status: StatusCodes.Unauthorized,
        message: 'Unauthorized',
      })
      return
    }

    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
    }) || await this.prisma.modmin.findUnique({
      where: { id: receiverId },
    })

    if (!receiver) {
      client.emit('error', {
        status: StatusCodes.NotFound,
        message: 'Receiver not found',
      })
      return
    }

    if (!this.isCommunicationAllowed(sender.role, receiver.role)) {
      client.emit('error', {
        status: StatusCodes.Forbidden,
        message: 'You are not allowed to communicate with this user',
      })
      return
    }

    let inbox = await this.prisma.inbox.findFirst({
      where: {
        OR: [
          {
            userId: sender.role === Role.ADMIN || sender.role === Role.MODERATOR ? null : sender.sub,
            modminId: receiver.role === Role.ADMIN || receiver.role === Role.MODERATOR ? receiver.id : null,
          },
          {
            userId: receiver.role === Role.ADMIN || receiver.role === Role.MODERATOR ? null : receiver.id,
            modminId: sender.role === Role.ADMIN || sender.role === Role.MODERATOR ? sender.sub : null,
          }
        ]
      }
    })

    if (!inbox) {
      inbox = await this.prisma.inbox.create({
        data: {
          user: sender.role === Role.ADMIN || sender.role === Role.MODERATOR ? null : { connect: { id: sender.sub } },
          modmin: sender.role === Role.ADMIN || sender.role === Role.MODERATOR ? { connect: { id: sender.sub } } : null,
        }
      })
    }

    let serializedFile = null
    if (file) {
      const validationResult = this.realtimeService.validateFile(file)
      if (validationResult?.status) {
        client.emit('validation_error', {
          status: validationResult.status,
          message: validationResult.message,
        })
        return
      }
      serializedFile = await this.realtimeService.saveFile(validationResult.file)
    }

    const message = await this.prisma.message.create({
      data: {
        content: content, file: serializedFile,
        userSender: sender.role === Role.ADMIN || sender.role === Role.MODERATOR ? null : { connect: { id: sender.sub } },
        modminSender: sender.role === Role.ADMIN || sender.role === Role.MODERATOR ? { connect: { id: sender.sub } } : null,
        userReceiver: receiver.role === Role.ADMIN || receiver.role === Role.MODERATOR ? null : { connect: { id: receiver.id } },
        modminReceiver: receiver.role === Role.ADMIN || receiver.role === Role.MODERATOR ? { connect: { id: receiver.id } } : null,
        inbox: { connect: { id: inbox.id } },
      },
    })

    client.emit('message_sent', message)
    this.server.to(receiver.id).emit('new_message', message)
  }

  @SubscribeMessage('check_online_status')
  async handleCheckOnlineStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() { targetUserId }: { targetUserId: string }
  ) {
    const user = this.clients.get(client)

    if (!user) {
      client.emit('error', {
        status: StatusCodes.Unauthorized,
        message: 'Unauthorized',
      })
      return
    }

    const isOnline = this.onlineUsers.has(targetUserId)
    client.emit('online_status', { targetUserId, isOnline })
  }

  @SubscribeMessage('get_admins_and_moderators')
  async handleGetAdminsAndModerators(@ConnectedSocket() client: Socket) {
    const user = this.clients.get(client)

    if (!user) {
      client.emit('error', {
        status: StatusCodes.Unauthorized,
        message: 'Unauthorized',
      })
      return
    }

    const adminsAndModerators = await this.prisma.user.findMany({
      where: {
        OR: [
          { role: Role.ADMIN },
          { role: Role.MODERATOR },
        ],
      },
    })

    const sortedAdminsAndModerators = adminsAndModerators.sort((a, b) => {
      const aOnline = this.onlineUsers.has(a.id)
      const bOnline = this.onlineUsers.has(b.id)
      return Number(bOnline) - Number(aOnline)
    })

    client.emit('admins_and_moderators', sortedAdminsAndModerators)
  }

  @SubscribeMessage('fetch_inboxes')
  async handleFetchInboxes(@ConnectedSocket() client: Socket) {
    const sender = this.clients.get(client)

    if (!sender) {
      client.emit('error', {
        status: StatusCodes.Unauthorized,
        message: 'Unauthorized',
      })
      return
    }

    const inboxes = await this.prisma.inbox.findMany({
      where: {
        OR: [
          { userId: sender.sub },
          { modminId: sender.sub },
        ],
      },
      include: {
        messages: {
          select: {
            read: true
          }
        },
        user: {
          select: {
            id: true,
            role: true,
            profile: {
              select: {
                avatar: true,
              }
            },
            fullname: true,
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

    const inboxesWithUnreadCounts = inboxes.map(inbox => {
      const unreadCount = inbox.messages.filter(message => !message.read).length
      return {
        ...inbox,
        unreadCount
      }
    })

    client.emit('inboxes', inboxesWithUnreadCounts)
  }

  @SubscribeMessage('get_inbox')
  async handleGetInbox(
    @ConnectedSocket() client: Socket,
    @MessageBody() { receiverId }: { receiverId: string }
  ) {
    const sender = this.clients.get(client)

    if (!sender) {
      client.emit('error', {
        status: StatusCodes.Unauthorized,
        message: 'Unauthorized',
      })
      return
    }

    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
    }) || await this.prisma.modmin.findUnique({
      where: { id: receiverId },
    })

    if (!receiver) {
      client.emit('error', {
        status: StatusCodes.NotFound,
        message: 'Receiver not found',
      })
      return
    }

    if (!this.isCommunicationAllowed(sender.role, receiver.role)) {
      client.emit('error', {
        status: StatusCodes.Forbidden,
        message: 'You are not allowed to communicate with this user',
      })
      return
    }

    const inbox = await this.prisma.inbox.findFirst({
      where: {
        OR: [
          {
            userId: sender.role === Role.ADMIN || sender.role === Role.MODERATOR ? null : sender.sub,
            modminId: receiver.role === Role.ADMIN || receiver.role === Role.MODERATOR ? receiver.id : null,
          },
          {
            userId: receiver.role === Role.ADMIN || receiver.role === Role.MODERATOR ? null : receiver.id,
            modminId: sender.role === Role.ADMIN || sender.role === Role.MODERATOR ? sender.sub : null,
          }
        ]
      },
      include: {
        messages: true,
        user: {
          select: {
            id: true,
            role: true,
            profile: {
              select: {
                avatar: true,

              }
            },
            fullname: true,
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

    if (!inbox) {
      client.emit('error', {
        status: StatusCodes.NotFound,
        message: 'Inbox not found',
      })
      return
    }

    client.emit('inbox', inbox)
  }

  @SubscribeMessage('fetch_messages')
  async handleFetchMessages(
    @ConnectedSocket() client: Socket,
    @MessageBody() { inboxId }: { inboxId: string }
  ) {
    const sender = this.clients.get(client)

    if (!sender) {
      client.emit('error', {
        status: StatusCodes.Unauthorized,
        message: 'Unauthorized',
      })
      return
    }

    const inbox = await this.prisma.inbox.findUnique({
      where: { id: inboxId },
      include: {
        messages: true,
      },
    })

    if (!inbox) {
      client.emit('error', {
        status: StatusCodes.NotFound,
        message: 'Inbox not found',
      })
      return
    }

    if (
      (sender.role === Role.ADMIN || sender.role === Role.MODERATOR) &&
      inbox.modminId !== sender.sub
    ) {
      client.emit('error', {
        status: StatusCodes.Forbidden,
        message: 'You are not allowed to access this inbox',
      })
      return
    } else if (
      (sender.role === Role.DRIVER || sender.role === Role.PASSENGER) &&
      inbox.userId !== sender.sub
    ) {
      client.emit('error', {
        status: StatusCodes.Forbidden,
        message: 'You are not allowed to access this inbox',
      })
      return
    }

    await this.prisma.message.updateMany({
      where: { inboxId: inbox.id, read: false },
      data: { read: true },
    })

    const updatedInbox = await this.prisma.inbox.findUnique({
      where: { id: inboxId },
      include: {
        messages: true,
        user: {
          select: {
            id: true,
            role: true,
            profile: {
              select: {
                avatar: true,
              },
            },
            fullname: true,
          },
        },
        modmin: {
          select: {
            id: true,
            role: true,
            fullname: true,
          },
        },
      },
    })

    client.emit('messages', updatedInbox)
  }

  private isCommunicationAllowed(senderRole: Role, receiverRole: Role): boolean {
    if (
      (senderRole === Role.DRIVER && receiverRole === Role.DRIVER) ||
      (senderRole === Role.PASSENGER && receiverRole === Role.PASSENGER) ||
      (senderRole === Role.ADMIN && receiverRole === Role.ADMIN) ||
      (senderRole === Role.MODERATOR && receiverRole === Role.MODERATOR) ||
      (senderRole === Role.DRIVER && receiverRole === Role.PASSENGER) ||
      (senderRole === Role.PASSENGER && receiverRole === Role.DRIVER)
    ) {
      return false
    }
    return true
  }

  // TODO: fetch users (driver-passenger)
}
