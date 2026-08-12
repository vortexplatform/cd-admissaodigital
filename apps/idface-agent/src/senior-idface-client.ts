import type { Logger } from './logger';

export type IdfaceDevice = {
  codplt: number;
  codrlg: number;
  desrlg: string;
  coddsp: number;
  ip: string;
};

type SeniorIdfaceClientOptions = {
  baseUrl: string;
  modrlg: number;
  timeoutMs: number;
  logger: Logger;
};

/** Descobre os iDFaces disponíveis na regional informada pela API Senior. */
export class SeniorIdfaceClient {
  constructor(private readonly options: SeniorIdfaceClientOptions) {}

  async listDevices(): Promise<IdfaceDevice[]> {
    const url = new URL('/controlid-idface/dispositivos', this.options.baseUrl);
    url.searchParams.set('modrlg', String(this.options.modrlg));

    const response = await fetch(url, { signal: AbortSignal.timeout(this.options.timeoutMs) });
    if (!response.ok) {
      throw new Error(`Senior respondeu HTTP ${response.status} ao listar iDFaces.`);
    }

    const body = (await response.json()) as unknown;
    if (!Array.isArray(body)) throw new Error('Resposta inválida da Senior ao listar iDFaces.');

    const devices = body.filter(isIdfaceDevice);
    if (devices.length === 0) {
      this.options.logger.warn('A Senior não retornou nenhum iDFace.', {
        modrlg: this.options.modrlg,
      });
    }
    return devices;
  }
}

const isIdfaceDevice = (value: unknown): value is IdfaceDevice => {
  if (!value || typeof value !== 'object') return false;
  const device = value as Record<string, unknown>;
  return (
    typeof device.codplt === 'number' &&
    typeof device.codrlg === 'number' &&
    typeof device.desrlg === 'string' &&
    typeof device.coddsp === 'number' &&
    typeof device.ip === 'string'
  );
};
