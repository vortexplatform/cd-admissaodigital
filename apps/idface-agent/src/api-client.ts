export type CandidatoRef = {
  id: number;
  nome: string;
  cpf: string;
};

export type BiometriaSolicitacao = {
  id: number;
  tipo: 'CADASTRO' | 'VERIFICACAO_ASSINATURA';
  status: string;
  expiraEm: string;
  candidatoId: number;
  candidaturaId?: number | null;
  envelopeId?: number | null;
  candidato: CandidatoRef;
};

export type ResultadoBiometriaPayload = {
  resultado: 'APROVADO' | 'REPROVADO' | 'FALHOU';
  cpfRetornado?: string;
  score?: number;
  identificadorExterno?: string;
  mensagem?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ApiClientOptions = {
  baseUrl: string;
  deviceToken: string;
  timeoutMs: number;
};

/** Cliente da API de biometria (endpoints públicos de dispositivo, autenticados por token). */
export class BiometriaApiClient {
  constructor(private readonly options: ApiClientOptions) {}

  listPendentes(): Promise<BiometriaSolicitacao[]> {
    return this.request('GET', '/biometria/dispositivo/solicitacoes/pendentes');
  }

  assumir(solicitacaoId: number): Promise<BiometriaSolicitacao> {
    return this.request('POST', `/biometria/dispositivo/solicitacoes/${solicitacaoId}/assumir`);
  }

  reportResultado(solicitacaoId: number, payload: ResultadoBiometriaPayload): Promise<unknown> {
    return this.request(
      'POST',
      `/biometria/dispositivo/solicitacoes/${solicitacaoId}/resultado`,
      payload,
    );
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.options.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-device-token': this.options.deviceToken,
        'User-Agent': 'idface-agent/0.1',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(this.options.timeoutMs),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new ApiError(
        `API respondeu HTTP ${response.status} em ${method} ${path}: ${text.slice(0, 300)}`,
        response.status,
      );
    }
    return (await response.json().catch(() => ({}))) as T;
  }
}
