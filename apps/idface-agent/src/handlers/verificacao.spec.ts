import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { BiometriaSolicitacao } from '../api-client';
import { handleVerificacao } from './verificacao';

const solicitacao: BiometriaSolicitacao = {
  id: 2,
  tipo: 'VERIFICACAO_ASSINATURA',
  status: 'EM_ATENDIMENTO',
  expiraEm: '2030-01-01T00:00:00.000Z',
  candidatoId: 42,
  candidato: { id: 42, nome: 'Maria Silva', cpf: '123.456.789-09' },
};

const logger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

describe('handleVerificacao', () => {
  it('aprova identificação do CPF esperado acima do limiar', async () => {
    const reported: unknown[][] = [];
    const api = { reportResultado: async (...args: unknown[]) => void reported.push(args) };
    const idface = {
      baseUrl: 'http://192.168.31.72',
      getCurrentTimestamp: async () => 100,
      listAccessLogsSince: async () => [
        { id: 11, time: 1, event: 7, user_id: 12345678909, confidence: 850 },
      ],
    };

    await handleVerificacao(solicitacao, {
      api,
      idfaces: [idface],
      logger,
      minConfidence: 500,
      rejectOnMismatch: true,
      pollIntervalMs: 1,
    });

    assert.deepEqual(reported, [
      [
        2,
        {
          resultado: 'APROVADO',
          cpfRetornado: '12345678909',
          score: 85,
          identificadorExterno: 'idface:http://192.168.31.72:user:12345678909:log:11',
          mensagem: 'Face verificada pelo iDFace.',
        },
      ],
    ]);
  });

  it('reprova a identificação de outro candidato', async () => {
    const reported: unknown[][] = [];
    const api = { reportResultado: async (...args: unknown[]) => void reported.push(args) };
    const idface = {
      baseUrl: 'http://192.168.31.72',
      getCurrentTimestamp: async () => 100,
      listAccessLogsSince: async () => [
        { id: 11, time: 1, event: 7, user_id: 98, confidence: 850 },
      ],
    };

    await handleVerificacao(solicitacao, {
      api,
      idfaces: [idface],
      logger,
      minConfidence: 500,
      rejectOnMismatch: true,
      pollIntervalMs: 1,
    });

    assert.deepEqual(reported, [
      [
        2,
        {
          resultado: 'REPROVADO',
          cpfRetornado: '00000000098',
          score: 85,
          identificadorExterno: 'idface:http://192.168.31.72:user:98:log:11',
          mensagem: 'A pessoa identificada no iDFace não corresponde ao candidato da solicitação.',
        },
      ],
    ]);
  });
});
