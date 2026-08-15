export type CandidatoRef = {
  id: number;
  nome: string;
  cpf: string;
  responsavelCpf?: string | null;
  responsavelNome?: string | null;
};

export type BiometriaSolicitacao = {
  id: number;
  tipo: 'CADASTRO' | 'VERIFICACAO_ASSINATURA';
  status: string;
  expiraEm: string;
  candidatoId: number;
  candidaturaId?: number | null;
  envelopeId?: number | null;
  idfaceIp: string;
  candidato: CandidatoRef;
  envelope?: { tipoSignatario: 'CANDIDATO' | 'RESPONSAVEL' } | null;
};

export type ResultadoBiometriaPayload = {
  resultado: 'APROVADO' | 'REPROVADO' | 'FALHOU';
  cpfRetornado?: string;
  score?: number;
  identificadorExterno?: string;
  mensagem?: string;
  enderecoColeta?: string;
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
  timeoutMs: number;
};

/** Cliente da API de biometria, direcionado ao iDFace configurado. */
export class BiometriaApiClient {
  constructor(private readonly options: ApiClientOptions) {}

  listPendentes(): Promise<BiometriaSolicitacao[]> {
    return this.request('GET', '/biometria/dispositivo/solicitacoes/pendentes');
  }

  assumir(solicitacaoId: number, idfaceIp: string): Promise<BiometriaSolicitacao> {
    return this.request('POST', `/biometria/dispositivo/solicitacoes/${solicitacaoId}/assumir`, undefined, idfaceIp);
  }

  reportResultado(solicitacaoId: number, payload: ResultadoBiometriaPayload, idfaceIp: string): Promise<unknown> {
    return this.request(
      'POST',
      `/biometria/dispositivo/solicitacoes/${solicitacaoId}/resultado`,
      payload,
      idfaceIp,
    );
  }

  private async request<T>(method: string, path: string, body?: unknown, idfaceIp?: string): Promise<T> {
    const url = new URL(path, this.options.baseUrl);
    if (idfaceIp) url.searchParams.set('idfaceIp', idfaceIp);
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
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
