import { Mutex } from 'async-mutex'
import { PrismaService } from 'prisma/prisma.service'
import axios, { AxiosInstance, AxiosResponse, Method } from 'axios'
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'

@Injectable()
export class QoreidConsumer {
    private prisma: PrismaService
    private expires_in = 7199
    public axiosInstance: AxiosInstance
    private readonly tokenMutex = new Mutex()

    constructor(baseURL: string) {
        this.prisma = new PrismaService()
        this.axiosInstance = axios.create({
            baseURL,
            headers: {
                'Content-Type': 'application/json',
            },
        })
    }

    private async getAccessToken() {
        return await this.prisma.cache.findFirst({
            where: {
                type: 'QOREID',
                key: process.env.QOREID_CLIENT_ID
            }
        })
    }

    private setAuthorizationHeader(access_token: string) {
        this.axiosInstance.defaults.headers['Authorization'] = `Bearer ${access_token}`
    }

    private async refreshAccessToken() {
        const release = await this.tokenMutex.acquire()
        try {
            let token = await this.getAccessToken()
            if (token && Date.now() < (new Date(token.updatedAt).getTime() + this.expires_in * 1000)) {
                return token.access_token
            }

            const response: AxiosResponse<QoreIDResponse> = await axios.post(
                'https://api.qoreid.com/token',
                {
                    clientId: process.env.QOREID_CLIENT_ID,
                    secret: process.env.QOREID_CLIENT_SECRET
                }
            )

            const { expiresIn, accessToken: newAccessToken, tokenType } = response.data

            await this.prisma.cache.upsert({
                where: { type: 'QOREID', key: process.env.QOREID_CLIENT_ID },
                create: {
                    type: 'QOREID',
                    expires_in: expiresIn,
                    token_type: tokenType,
                    access_token: newAccessToken,
                    key: process.env.QOREID_CLIENT_ID,
                },
                update: {
                    token_type: tokenType,
                    expires_in: expiresIn,
                    access_token: newAccessToken,
                }
            })

            return newAccessToken
        } finally {
            release()
        }
    }

    async sendRequest<T>(method: Method, url: string, data?: any): Promise<T> {
        try {
            let token = await this.getAccessToken()
            let access_token = token?.access_token

            const tokenExpired = !access_token || (token?.expires_in && Date.now() > (new Date(token.updatedAt).getTime() + this.expires_in * 1000 - 60 * 1000))

            if (tokenExpired) {
                access_token = await this.refreshAccessToken()
            }

            this.setAuthorizationHeader(access_token)

            const response: AxiosResponse<T> = await this.axiosInstance.request({ method, url, data })
            return response.data
        } catch (error) {
            if (error.response) {
                throw new HttpException(error.response.data, error.response.status)
            } else {
                throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR)
            }
        }
    }
}