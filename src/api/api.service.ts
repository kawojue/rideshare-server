import { lastValueFrom, map } from 'rxjs'
import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'

@Injectable()
export class ApiService {
    constructor(private readonly httpService: HttpService) { }

    async GET<T>(url: string, headers?: Record<string, string>): Promise<T> {
        const observable = this.httpService.get<T>(url, { headers }).pipe(
            map(response => response.data)
        )
        return lastValueFrom(observable)
    }

    async POST<T>(url: string, data: any, headers?: Record<string, string>): Promise<T> {
        const observable = this.httpService.post<T>(url, data, { headers }).pipe(
            map(response => response.data)
        )
        return lastValueFrom(observable)
    }

    async PATCH<T>(url: string, data: any, headers?: Record<string, string>): Promise<T> {
        const observable = this.httpService.patch<T>(url, data, { headers }).pipe(
            map(response => response.data)
        )
        return lastValueFrom(observable)
    }

    async DELETE<T>(url: string, headers?: Record<string, string>): Promise<T> {
        const observable = this.httpService.delete<T>(url, { headers }).pipe(
            map(response => response.data)
        )
        return lastValueFrom(observable)
    }
}
