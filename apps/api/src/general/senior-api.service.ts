import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, isAxiosError } from 'axios';

interface AuthResponse {
  token: string;
  refreshToken: string;
}

@Injectable()
export class SeniorApiService implements OnModuleInit {
  private readonly logger = new Logger(SeniorApiService.name);
  private readonly http: AxiosInstance;
  private token: string | null = null;
  private tokenExpiry = 0;

  constructor(private readonly config: ConfigService) {
    const baseURL = this.config.getOrThrow<string>('SENIOR_API_URL');
    this.http = axios.create({ baseURL });
  }

  async onModuleInit() {
    try {
      await this.refreshToken();
      this.logger.log('Autenticação na API Senior OK');
    } catch (err) {
      const msg = isAxiosError(err)
        ? `${err.response?.status} ${JSON.stringify(err.response?.data)}`
        : String(err);
      this.logger.error(`Falha ao autenticar na API Senior: ${msg}`);
    }
  }

  private async refreshToken(): Promise<void> {
    const cpf = this.config.getOrThrow<string>('SENIOR_API_CPF');
    const password = this.config.getOrThrow<string>('SENIOR_API_PASSWORD');

    const { data } = await this.http.post<AuthResponse>('/auth/signin', { cpf, password });

    this.token = data.token;

    // Extrai o exp do payload JWT (sem lib externa)
    const payload = JSON.parse(
      Buffer.from(data.token.split('.')[1], 'base64url').toString('utf8'),
    ) as { exp: number };
    // Expira 5 minutos antes do exp real
    this.tokenExpiry = payload.exp * 1000 - 5 * 60 * 1000;
  }

  async get<T>(path: string): Promise<T> {
    if (!this.token || Date.now() >= this.tokenExpiry) {
      await this.refreshToken();
    }

    try {
      const { data } = await this.http.get<T>(path, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      return data;
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        // Token expirou: renova e tenta uma vez mais
        await this.refreshToken();
        const { data } = await this.http.get<T>(path, {
          headers: { Authorization: `Bearer ${this.token}` },
        });
        return data;
      }
      throw err;
    }
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    if (!this.token || Date.now() >= this.tokenExpiry) {
      await this.refreshToken();
    }

    try {
      const { data } = await this.http.post<T>(path, body, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      return data;
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        await this.refreshToken();
        const { data } = await this.http.post<T>(path, body, {
          headers: { Authorization: `Bearer ${this.token}` },
        });
        return data;
      }
      throw err;
    }
  }
}
