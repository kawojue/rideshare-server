import {
  CallerDTO,
  MessageDTO,
  ReceiverDTO,
  OnlineStatusDTO,
  FetchMessagesDTO,
} from './dto/index.dto'
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
import { Utils } from 'helpers/utils'
import { JwtService } from '@nestjs/jwt'
import { Server, Socket } from 'socket.io'
import { StatusCodes } from 'enums/statusCodes'
import { RealtimeService } from './realtime.service'
import { PrismaService } from 'prisma/prisma.service'
import { PaginationBaseDTO } from 'src/app/dto/pagination.dto'

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

  private clients: Map<Socket, JwtPayload> = new Map()
  private onlineUsers: Map<string, string> = new Map()

  afterInit() {
    this.realtimeService.setServer(this.server)
  }

  async handleConnection(client: Socket) {
    const token = client.handshake.headers['authorization']?.split('Bearer ')[1]
    if (!token) {
      client.emit('error', {
        status: StatusCodes.Unauthorized,
        message: 'Token does not exist'
      })
      return
    }

    try {
      const { sub, role, status } = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
        ignoreExpiration: false,
      }) as JwtPayload

      if (status === "SUSPENDED") {
        client.emit('error', {
          status: StatusCodes.Forbidden,
          message: 'Account has been suspended'
        })
        return
      }

      this.clients.set(client, { sub, role, status })
      this.onlineUsers.set(sub, client.id)

      client.emit('connected', { message: 'Connected' })
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
    try {
      const sender = this.clients.get(client)

      if (!sender) {
        client.emit('error', {
          status: StatusCodes.Unauthorized,
          message: 'Unauthorized',
        })
        client.disconnect()
        return
      }

      if (!content && !file) {
        client.emit('error', {
          status: StatusCodes.BadRequest,
          message: 'Blank message is not allowed',
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

      if (!this.realtimeService.isChatAllowed(sender.role, receiver.role)) {
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
          client.emit('error', {
            status: validationResult.status,
            message: validationResult.message,
          })
          return
        }
        serializedFile = await this.realtimeService.saveFile(validationResult.file)
      }

      const userSenderId = sender?.role === Role.ADMIN || sender?.role === Role.MODERATOR ? undefined : sender?.sub ?? undefined
      const modminSenderId = sender?.role === Role.ADMIN || sender?.role === Role.MODERATOR ? sender?.sub ?? null : null
      const userReceiverId = receiver?.role === Role.ADMIN || receiver?.role === Role.MODERATOR ? null : receiver?.id ?? null
      const modminReceiverId = receiver?.role === Role.ADMIN || receiver?.role === Role.MODERATOR ? receiver?.id ?? null : null

      const message = await this.prisma.message.create({
        data: {
          content,
          file: serializedFile,
          userSenderId,
          modminSenderId,
          userReceiverId,
          modminReceiverId,
          inboxId: inbox.id,
        },
      })

      const alignedMessage = {
        ...message,
        alignment: 'right',
      }

      client.emit('message_sent', alignedMessage)
      this.server.to(this.onlineUsers.get(receiver.id)).emit('new_message', { ...message, alignment: 'left' })
    } catch (err) {
      client.emit('error', {
        status: StatusCodes.InternalServerError,
        message: err.message
      })
    }
  }

  @SubscribeMessage('check_online_status')
  async handleCheckOnlineStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() { targetUserId }: OnlineStatusDTO
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

  @SubscribeMessage('get_modmins')
  async handleGetModmins(@ConnectedSocket() client: Socket) {
    try {
      const user = this.clients.get(client)

      if (!user) {
        client.emit('error', {
          status: StatusCodes.Unauthorized,
          message: 'Unauthorized',
        })
        return
      }

      const modmins = await this.prisma.modmin.findMany()

      const sortedModmins = modmins.sort((a, b) => {
        const aOnline = this.onlineUsers.has(a.id)
        const bOnline = this.onlineUsers.has(b.id)
        return Number(bOnline) - Number(aOnline)
      })

      client.emit('modmins', sortedModmins)
    } catch (err) {
      client.emit('error', {
        status: StatusCodes.InternalServerError,
        message: err.message
      })
    }
  }

  @SubscribeMessage('fetch_inboxes')
  async handleFetchInboxes(
    @ConnectedSocket() client: Socket,
    { page = 1, limit = 10 }: PaginationBaseDTO
  ) {
    try {
      const sender = this.clients.get(client)

      if (!sender) {
        client.emit('error', {
          status: StatusCodes.Unauthorized,
          message: 'Unauthorized',
        })
        client.disconnect()
        return
      }

      page = Number(page)
      limit = Number(limit)

      const offset = (page - 1) * limit

      const inboxes = await this.prisma.inbox.findMany({
        where: {
          OR: [
            { userId: sender.sub },
            { modminId: sender.sub },
          ],
        },
        include: {
          messages: { take: 1, orderBy: { updatedAt: 'asc' } },
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
        orderBy: { updatedAt: 'desc' },
        skip: offset,
        take: limit
      })

      const inboxesWithUnreadCounts = await Promise.all(inboxes.map(async (inbox) => {
        const unreadCount = await this.prisma.message.count({
          where: { inboxId: inbox.id, read: false }
        })
        return {
          ...inbox,
          unreadCount
        }
      }))

      client.emit('inboxes', inboxesWithUnreadCounts)
    } catch (err) {
      client.emit('error', {
        status: StatusCodes.InternalServerError,
        message: err.message
      })
    }
  }

  @SubscribeMessage('get_inbox')
  async handleGetInbox(
    @ConnectedSocket() client: Socket,
    @MessageBody() { receiverId }: ReceiverDTO,
  ) {
    try {
      const sender = this.clients.get(client)

      if (!sender) {
        client.emit('error', {
          status: StatusCodes.Unauthorized,
          message: 'Unauthorized',
        })
        client.disconnect()
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

      if (!this.realtimeService.isChatAllowed(sender.role, receiver.role)) {
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
          user: {
            select: {
              id: true,
              role: true,
              profile: {
                select: {
                  avatar: true
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

      if (!inbox) {
        client.emit('error', {
          status: StatusCodes.NotFound,
          message: 'Inbox not found',
        })
        return
      }

      client.emit('inbox', inbox)
    } catch (err) {
      client.emit('error', {
        status: StatusCodes.InternalServerError,
        message: err.message
      })
    }
  }

  @SubscribeMessage('fetch_messages')
  async handleFetchMessages(
    @ConnectedSocket() client: Socket,
    @MessageBody() { inboxId, page = 1, limit = 30 }: FetchMessagesDTO
  ) {
    try {
      const sender = this.clients.get(client)

      if (!sender) {
        client.emit('error', {
          status: StatusCodes.Unauthorized,
          message: 'Unauthorized',
        })
        client.disconnect()
        return
      }

      page = Number(page)
      limit = Number(limit)

      const offset = (page - 1) * limit

      const inbox = await this.realtimeService.getInbox(inboxId)

      if (!inbox) {
        client.emit('error', {
          status: StatusCodes.NotFound,
          message: 'Inbox not found',
        })
        return
      }

      const isAdminOrMod = sender.role === Role.ADMIN || sender.role === Role.MODERATOR
      const isDriverOrPassenger = sender.role === Role.DRIVER || sender.role === Role.PASSENGER

      const isNotAllowedAdminMod = isAdminOrMod && inbox.modminId !== sender.sub
      const isNotAllowedDriverPassenger = isDriverOrPassenger && inbox.userId !== sender.sub

      if (isNotAllowedAdminMod || isNotAllowedDriverPassenger) {
        client.emit('error', {
          status: StatusCodes.Forbidden,
          message: 'You are not allowed to access this inbox',
        })
        return
      }

      const messages = await this.prisma.message.findMany({
        where: { inboxId: inbox.id },
        take: limit,
        skip: offset,
      })

      const messagesWithAlignment = messages.map(message => ({
        ...message,
        alignment: message.userSenderId === sender.sub || message.modminSenderId === sender.sub ? 'right' : 'left'
      }))

      client.emit('messages', { inbox, messages: messagesWithAlignment })

      await this.prisma.message.updateMany({
        where: { inboxId: inbox.id, read: false },
        data: { read: true },
      })
    } catch (err) {
      client.emit('error', {
        status: StatusCodes.InternalServerError,
        message: err.message
      })
    }
  }

  @SubscribeMessage('make_call')
  async handleMakeCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() { receiverId }: ReceiverDTO,
  ) {
    try {
      const caller = this.clients.get(client)

      if (!caller) {
        client.emit('error', {
          status: StatusCodes.Unauthorized,
          message: 'Unauthorized',
        })
        client.disconnect()
        return
      }

      const receiver = await this.prisma.user.findUnique({
        where: { id: receiverId },
      })

      if (!receiver) {
        client.emit('error', {
          status: StatusCodes.NotFound,
          message: 'Receiver not found',
        })
        return
      }

      if (!this.realtimeService.isCallAllowed(caller.role, receiver.role)) {
        client.emit('error', {
          status: StatusCodes.Forbidden,
          message: 'You are not allowed to call this user',
        })
        return
      }

      const log = await this.realtimeService.logCall({
        callerId: caller.sub,
        receiverId: receiverId,
        callStatus: 'INITIATED',
      })

      if (!this.onlineUsers.has(receiverId)) {
        client.emit('error', {
          status: StatusCodes.UnprocessableEntity,
          message: 'Receiver is not online',
        })
        await this.realtimeService.updateCallStatus(log.id, 'MISSED')
        return
      }

      this.server.to(this.onlineUsers.get(receiverId)).emit('incoming_call', { log })
      client.emit('call_made', { message: 'Call initiated', log })
    } catch (err) {
      client.emit('error', {
        status: StatusCodes.InternalServerError,
        message: err.message
      })
    }
  }

  @SubscribeMessage('answer_call')
  async handleAnswerCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() { callerId }: CallerDTO,
  ) {
    try {
      const receiver = this.clients.get(client)

      if (!receiver) {
        client.emit('error', {
          status: StatusCodes.Unauthorized,
          message: 'Unauthorized',
        })
        client.disconnect()
        return
      }

      const log = await this.prisma.callLog.findFirst({
        where: {
          callerId,
          receiverId: receiver.sub,
          callStatus: 'INITIATED',
        },
        orderBy: { createdAt: 'desc' },
      })

      if (!log) {
        client.emit('error', {
          status: StatusCodes.NotFound,
          message: 'Call log not found',
        })
        return
      }

      if (!this.onlineUsers.has(callerId)) {
        client.emit('error', {
          status: StatusCodes.NotFound,
          message: 'Caller is not online',
        })
        return
      }

      this.server.to(this.onlineUsers.get(callerId)).emit('call_answered', { log })
      await Promise.all([
        this.realtimeService.updateCallStatus(log.id, 'ANSWERED'),
        this.realtimeService.setStartTime(log.id),
      ])
      client.emit('call_answered', { message: 'Call answered', log })
    } catch (err) {
      client.emit('error', {
        status: StatusCodes.InternalServerError,
        message: err.message
      })
    }
  }

  @SubscribeMessage('reject_call')
  async handleRejectCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() { callerId }: CallerDTO,
  ) {
    try {
      const receiver = this.clients.get(client)

      if (!receiver) {
        client.emit('error', {
          status: StatusCodes.Unauthorized,
          message: 'Unauthorized',
        })
        client.disconnect()
        return
      }

      const log = await this.prisma.callLog.findFirst({
        where: {
          callerId,
          receiverId: receiver.sub,
          callStatus: 'INITIATED',
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      if (!log) {
        client.emit('error', {
          status: StatusCodes.NotFound,
          message: 'Call log not found',
        })
        return
      }

      if (!this.onlineUsers.has(callerId)) {
        client.emit('error', {
          status: StatusCodes.NotFound,
          message: 'Caller is not online',
        })
        return
      }

      this.server.to(this.onlineUsers.get(callerId)).emit('call_rejected', { log })
      await this.realtimeService.updateCallStatus(log.id, 'REJECTED')
      client.emit('call_rejected', { message: 'Call rejected', log })
    } catch (err) {
      client.emit('error', {
        status: StatusCodes.InternalServerError,
        message: err.message
      })
    }
  }

  @SubscribeMessage('end_call')
  async handleEndCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() { receiverId }: { receiverId: string },
  ) {
    try {
      const caller = this.clients.get(client)

      if (!caller) {
        client.emit('error', {
          status: StatusCodes.Unauthorized,
          message: 'Unauthorized',
        })
        client.disconnect()
        return
      }

      const log = await this.prisma.callLog.findFirst({
        where: {
          callerId: caller.sub,
          receiverId,
          callStatus: 'ANSWERED',
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      if (!log) {
        client.emit('error', {
          status: StatusCodes.NotFound,
          message: 'Call log not found',
        })
        return
      }

      await Promise.all([
        this.realtimeService.updateCallStatus(log.id, 'ENDED'),
        this.realtimeService.setEndTime(log.id)
      ])

      if (!this.onlineUsers.has(receiverId)) {
        client.emit('error', {
          status: StatusCodes.NotFound,
          message: 'Receiver is not online',
        })
        return
      }

      this.server.to(this.onlineUsers.get(receiverId)).emit('call_ended', { log })
      client.emit('call_ended', { message: 'Call ended', log })
    } catch (err) {
      client.emit('error', {
        status: StatusCodes.InternalServerError,
        message: err.message
      })
    }
  }

  @SubscribeMessage('fetch_call_logs')
  async handleFetchCallLogs(@ConnectedSocket() client: Socket) {
    try {
      const user = this.clients.get(client)

      if (!user) {
        client.emit('error', {
          status: StatusCodes.Unauthorized,
          message: 'Unauthorized',
        })
        return
      }

      const currentDate = new Date()
      const sevenDaysAgo = new Date(currentDate)
      sevenDaysAgo.setDate(currentDate.getDate() - 7)

      const logs = await this.prisma.callLog.findMany({
        where: {
          OR: [
            { callerId: user.sub },
            { receiverId: user.sub },
          ],
          updatedAt: {
            gte: sevenDaysAgo,
            lte: currentDate,
          },
        },
        include: {
          caller: {
            select: {
              id: true,
              role: true,
              profile: {
                select: {
                  avatar: true,
                }
              },
              phone: true,
              email: true,
              lastname: true,
              firstname: true,
            }
          },
          receiver: {
            select: {
              id: true,
              role: true,
              profile: {
                select: {
                  avatar: true,
                }
              },
              phone: true,
              email: true,
              lastname: true,
              firstname: true,
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      })

      const logsWithDuration = logs.map(log => {
        const durationInSeconds = log.startTime && log.endTime ? (log.endTime.getTime() - log.startTime.getTime()) / 1000 : null

        const formattedDuration = Utils.formatDuration(durationInSeconds)

        return { ...log, duration: formattedDuration }
      })

      client.emit('call_logs', { logs: logsWithDuration })
    } catch (err) {
      client.emit('error', {
        status: StatusCodes.InternalServerError,
        message: err.message
      })
    }
  }

  // TODO: fetch users (driver-passenger)
}
