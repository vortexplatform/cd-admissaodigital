import type { BiometriaApiClient, BiometriaSolicitacao } from './api-client';
import type { AppConfig } from './config';
import { IdfaceClient } from './idface-client';
import { handleVerificacao } from './handlers/verificacao';
import type { Logger } from './logger';
import { sleep } from './utils';
import { SeniorIdfaceClient } from './senior-idface-client';

type IdfaceAgentOptions = {
  api: BiometriaApiClient;
  config: AppConfig;
  logger: Logger;
  senior: SeniorIdfaceClient;
};

export class IdfaceAgent {
  private running = false;
  private processing = false;

  constructor(private readonly options: IdfaceAgentOptions) {}

  async start() {
    this.running = true;
    this.options.logger.info('Agente iDFace iniciado.');

    while (this.running) {
      await this.tick();
      await sleep(this.options.config.solicitacoesPollIntervalMs);
    }
  }

  stop() {
    this.running = false;
  }

  private async tick() {
    if (this.processing) return;

    try {
      const pendentes = await this.options.api.listPendentes();
      const solicitacao = pendentes[0];
      if (!solicitacao) return;

      this.processing = true;
      try {
        const assumida = await this.options.api.assumir(solicitacao.id, solicitacao.idfaceIp);
        await this.processar(assumida);
      } finally {
        this.processing = false;
      }
    } catch (error) {
      this.options.logger.warn('Falha ao buscar ou assumir solicitações biométricas.', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async processar(solicitacao: BiometriaSolicitacao) {
    this.options.logger.info('Processando solicitação biométrica.', {
      solicitacaoId: solicitacao.id,
      tipo: solicitacao.tipo,
      candidatoId: solicitacao.candidatoId,
    });

    try {
      if (solicitacao.tipo !== 'VERIFICACAO_ASSINATURA') {
        await this.options.api.reportResultado(solicitacao.id, {
          resultado: 'FALHOU',
          mensagem: 'O agente iDFace aceita somente autenticação facial para assinatura.',
        }, solicitacao.idfaceIp);
        return;
      }

      const devices = await this.options.senior.listDevices();
      const device = devices.find((item) => item.ip === solicitacao.idfaceIp);
      if (!device) {
        await this.options.api.reportResultado(solicitacao.id, {
          resultado: 'FALHOU',
          mensagem: 'iDFace selecionado não está disponível na Senior.',
        }, solicitacao.idfaceIp);
        return;
      }

      await handleVerificacao(solicitacao, {
        api: {
          reportResultado: (solicitacaoId, payload) =>
            this.options.api.reportResultado(
              solicitacaoId,
              { ...payload, enderecoColeta: device.endereco },
              solicitacao.idfaceIp,
            ),
        },
        idfaces: [
          new IdfaceClient({
            ...this.options.config.idface,
            baseUrl: `http://${device.ip}`,
            timeoutMs: this.options.config.httpTimeoutMs,
            logger: this.options.logger,
          }),
        ],
        logger: this.options.logger,
        minConfidence: this.options.config.idface.minConfidence,
        rejectOnMismatch: this.options.config.rejectOnMismatch,
        pollIntervalMs: this.options.config.verificacaoPollIntervalMs,
      });
    } catch (error) {
      this.options.logger.error('Falha no processamento da solicitação biométrica.', {
        solicitacaoId: solicitacao.id,
        error: error instanceof Error ? error.message : String(error),
      });

      try {
        await this.options.api.reportResultado(solicitacao.id, {
          resultado: 'FALHOU',
          mensagem: 'Erro de comunicação com o agente iDFace.',
        }, solicitacao.idfaceIp);
      } catch (reportError) {
        this.options.logger.error('Não foi possível registrar a falha na API.', {
          solicitacaoId: solicitacao.id,
          error: reportError instanceof Error ? reportError.message : String(reportError),
        });
      }
    }
  }
}
