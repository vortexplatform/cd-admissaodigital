import type { Logger } from './logger';

export type IdfaceUser = {
  id: number;
  registration: string;
  name: string;
};

export type IdfaceAccessLog = {
  id: number;
  time: number;
  event: number;
  user_id: number;
  confidence?: number;
};

export class IdfaceError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'IdfaceError';
  }
}

type IdfaceClientOptions = {
  baseUrl: string;
  login: string;
  password: string;
  timeoutMs: number;
  logger: Logger;
};

/** Evento de log de acesso do Control iD: identificação concedida. */
export const IDFACE_EVENT_ACESSO_CONCEDIDO = 7;

export class IdfaceClient {
  private session?: string;

  constructor(private readonly options: IdfaceClientOptions) {}

  get baseUrl() {
    return this.options.baseUrl;
  }

  /** Faz login no iDFace. Usado também como health check no boot. */
  async login(): Promise<void> {
    const response = await fetch(`${this.options.baseUrl}/login.fcgi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: this.options.login, password: this.options.password }),
      signal: AbortSignal.timeout(this.options.timeoutMs),
    });
    const body = (await response.json().catch(() => null)) as { session?: string } | null;
    if (!response.ok || !body?.session) {
      throw new IdfaceError(`Falha no login do iDFace (HTTP ${response.status}).`, response.status);
    }
    this.session = body.session;
    this.options.logger.debug('Sessão do iDFace estabelecida.');
  }

  async getUserById(id: number): Promise<IdfaceUser | undefined> {
    const users = await this.loadObjects<IdfaceUser>('users', {
      fields: ['id', 'registration', 'name'],
      where: [{ field: 'id', operator: '=', value: id }],
      limit: 1,
    });
    return users[0];
  }

  /** Horário do próprio iDFace, usado como marco para ignorar logs anteriores à solicitação. */
  async getCurrentTimestamp(): Promise<number> {
    const response = await this.authenticatedGet('/system_information.fcgi');
    const body = (await response.json().catch(() => null)) as {
      time?: unknown;
      error?: unknown;
    } | null;
    if (!body || typeof body.time !== 'number') {
      throw new IdfaceError('Resposta inválida do iDFace ao obter horário.', response.status);
    }
    return body.time;
  }

  /** Logs de acesso emitidos a partir de um horário do próprio iDFace. */
  async listAccessLogsSince(timestamp: number): Promise<IdfaceAccessLog[]> {
    return this.loadObjects<IdfaceAccessLog>('access_logs', {
      fields: ['id', 'time', 'event', 'user_id', 'confidence'],
      where: [{ field: 'time', operator: '>=', value: timestamp }],
      limit: 100,
    });
  }

  private async loadObjects<T>(
    object: string,
    query: Record<string, unknown> & { object?: string },
  ): Promise<T[]> {
    const response = await this.authenticatedFetch('/load_objects.fcgi', { object, ...query });
    const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new IdfaceError(`Resposta inválida do iDFace em ${object}.`, response.status);
    if (typeof body.error === 'string') {
      throw new IdfaceError(`iDFace: ${body.error}`, response.status);
    }
    const items = body[object];
    return Array.isArray(items) ? (items as T[]) : [];
  }

  private async authenticatedFetch(
    path: string,
    payload: unknown,
    allowRelogin = true,
  ): Promise<Response> {
    if (!this.session) await this.login();

    const response = await fetch(
      `${this.options.baseUrl}${path}?session=${encodeURIComponent(this.session ?? '')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.options.timeoutMs),
      },
    );

    if ((response.status === 401 || response.status === 403) && allowRelogin) {
      this.options.logger.debug('Sessão do iDFace expirada; autenticando novamente.');
      this.session = undefined;
      await this.login();
      return this.authenticatedFetch(path, payload, false);
    }

    if (!response.ok) {
      throw new IdfaceError(
        `iDFace respondeu HTTP ${response.status} em ${path}.`,
        response.status,
      );
    }
    return response;
  }

  private async authenticatedGet(path: string, allowRelogin = true): Promise<Response> {
    if (!this.session) await this.login();

    const response = await fetch(
      `${this.options.baseUrl}${path}?session=${encodeURIComponent(this.session ?? '')}`,
      { signal: AbortSignal.timeout(this.options.timeoutMs) },
    );
    if ((response.status === 401 || response.status === 403) && allowRelogin) {
      this.session = undefined;
      await this.login();
      return this.authenticatedGet(path, false);
    }
    if (!response.ok) {
      throw new IdfaceError(
        `iDFace respondeu HTTP ${response.status} em ${path}.`,
        response.status,
      );
    }
    return response;
  }
}
