import axios, { AxiosInstance, AxiosResponse, Method } from 'axios'
import { Injectable, HttpException, HttpStatus } from '@nestjs/common'

@Injectable()
export class PaystackConsumer {
    readonly axiosInstance: AxiosInstance

    constructor(baseURL: string, token: string) {
        this.axiosInstance = axios.create({
            baseURL: baseURL,
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json',
            },
        })
    }

    async sendRequest<T>(method: Method, url: string, data?: any): Promise<T> {
        try {
            const response: AxiosResponse<T> = await this.axiosInstance.request({ method, url, data })
            return response.data
        } catch (err) {
            console.error(err)
            if (err.response) {
                throw new HttpException(err.response.data, err.response.status)
            } else {
                throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR)
            }
        }
    }
}