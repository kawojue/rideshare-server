import { Mutex } from 'async-mutex';
import { config } from 'configs/env.config';
import { StatusCodes } from 'enums/statusCodes';
import { StoreService } from 'src/store/store.service';
import { HttpException, Inject, Injectable } from '@nestjs/common';
import axios, { AxiosInstance, AxiosResponse, Method } from 'axios';

@Injectable()
export class QoreidConsumer {
  private readonly expiresIn = 6999;
  public axiosInstance: AxiosInstance;
  private tokenMutex = new Mutex();

  @Inject()
  private store: StoreService;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: config.qoreId.baseUrl,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async getAccessToken() {
    return this.store.get(`QOREID:${config.qoreId.clientId}`);
  }

  private setAuthorizationHeader(accessToken: string) {
    this.axiosInstance.defaults.headers['Authorization'] =
      `Bearer ${accessToken}`;
  }

  private isTokenExpired(token: any): boolean {
    return (
      !token ||
      (token.expires_in &&
        Date.now() >
          new Date(token.updatedAt).getTime() +
            this.expiresIn * 1000 -
            60 * 1000)
    );
  }

  private async refreshAccessToken() {
    const release = await this.tokenMutex.acquire();
    try {
      let token = await this.getAccessToken();
      if (token && !this.isTokenExpired(token)) {
        return token.access_token;
      }

      const response: AxiosResponse<QoreIDResponse> = await axios.post(
        'https://api.qoreid.com/token',
        config.qoreId,
      );

      const { expiresIn, tokenType, accessToken } = response.data;

      this.store.set(
        `QOREID:${config.qoreId.clientId}`,
        {
          type: 'QOREID',
          expires_in: expiresIn,
          token_type: tokenType,
          key: config.qoreId.clientId,
          access_token: accessToken,
          updatedAt: new Date(),
        },
        this.expiresIn * 1000,
      );

      return accessToken;
    } finally {
      release();
    }
  }

  async sendRequest<T>(method: Method, url: string, data?: any): Promise<T> {
    try {
      let token = await this.getAccessToken();
      let accessToken = token?.access_token;

      if (this.isTokenExpired(token)) {
        accessToken = await this.refreshAccessToken();
      }

      this.setAuthorizationHeader(accessToken);

      const response: AxiosResponse<T> = await this.axiosInstance.request({
        method,
        url,
        data,
      });
      return response.data;
    } catch (error) {
      const statusCode = error.response
        ? error.response.status
        : StatusCodes.InternalServerError;
      const errorMessage = error.response
        ? error.response.data
        : 'Internal Server Error';
      throw new HttpException(errorMessage, statusCode);
    }
  }
}
