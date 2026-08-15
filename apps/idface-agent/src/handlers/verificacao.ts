import type { BiometriaSolicitacao, ResultadoBiometriaPayload } from '../api-client';
import { IDFACE_EVENT_ACESSO_CONCEDIDO, type IdfaceClient } from '../idface-client';
import type { Logger } from '../logger';
import { onlyDigits, sleep } from '../utils';

type IdfaceForVerification = Pick<
  IdfaceClient,
  'baseUrl' | 'getCurrentTimestamp' | 'getUserById' | 'listAccessLogsSince'
>;

type VerificacaoDependencies = {
  api: { reportResultado: (solicitacaoId: number, payload: ResultadoBiometriaPayload) => Promise<unknown> };
  idfaces: IdfaceForVerification[];
  logger: Logger;
  minConfidence: number;
  rejectOnMismatch: boolean;
  pollIntervalMs: number;
  sleepFn?: (ms: number) => Promise<void>;
};

/** Espera a identificação facial em qualquer iDFace retornado pela Senior. */
export async function handleVerificacao(
  solicitacao: BiometriaSolicitacao,
  {
    api,
    idfaces,
    logger,
    minConfidence,
    rejectOnMismatch,
    pollIntervalMs,
    sleepFn = sleep,
  }: VerificacaoDependencies,
) {
  const isResponsavel = solicitacao.envelope?.tipoSignatario === 'RESPONSAVEL';
  const cpfBruto = isResponsavel
    ? solicitacao.candidato.responsavelCpf
    : solicitacao.candidato.cpf;

  if (!cpfBruto) {
    await api.reportResultado(solicitacao.id, {
      resultado: 'FALHOU',
      mensagem: isResponsavel
        ? 'CPF do responsável legal não cadastrado no sistema.'
        : 'CPF do candidato não cadastrado no sistema.',
    });
    return;
  }

  const cpfEsperado = onlyDigits(cpfBruto);
  const expiraEm = new Date(solicitacao.expiraEm).getTime();
  const candidatoCadastrado = await findRegisteredCandidate(idfaces, Number(cpfEsperado));
  if (!candidatoCadastrado) {
    await api.reportResultado(solicitacao.id, {
      resultado: 'FALHOU',
      mensagem: isResponsavel
        ? 'Responsável legal não está cadastrado no iDFace selecionado.'
        : 'Colaborador não está cadastrado no iDFace selecionado.',
    });
    return;
  }
  const cursors = await createCursors(idfaces, logger);
  if (cursors.size === 0) throw new Error('Nenhum iDFace disponível para autenticação.');

  logger.info('Aguardando identificação facial nos iDFaces.', {
    solicitacaoId: solicitacao.id,
    candidatoId: solicitacao.candidatoId,
    dispositivosDisponiveis: cursors.size,
    expiraEm: solicitacao.expiraEm,
  });

  while (Date.now() < expiraEm) {
    const identificacao = await findIdentification(cursors, logger);
    if (identificacao) {
      const { idface, log } = identificacao;
      if (log.event !== IDFACE_EVENT_ACESSO_CONCEDIDO || !log.user_id) {
        await api.reportResultado(solicitacao.id, {
          resultado: 'FALHOU',
          identificadorExterno: `idface:${idface.baseUrl}:log:${log.id}`,
          mensagem: 'O iDFace não identificou um colaborador cadastrado durante a coleta facial.',
        });
        return;
      }
      const cpfIdentificado = cpfFromIdfaceUserId(log.user_id);
      const confidence = log.confidence ?? 0;
      const identificadorExterno = `idface:${idface.baseUrl}:user:${log.user_id}:log:${log.id}`;

      if (sameCpf(cpfIdentificado, cpfEsperado)) {
        await api.reportResultado(solicitacao.id, {
          resultado: confidence >= minConfidence ? 'APROVADO' : 'REPROVADO',
          cpfRetornado: cpfIdentificado,
          score: Math.round(confidence / 10),
          identificadorExterno,
          mensagem:
            confidence >= minConfidence
              ? 'Face verificada pelo iDFace.'
              : `Confiança do iDFace abaixo do limiar configurado (${confidence}/1000).`,
        });
        return;
      }

      if (rejectOnMismatch) {
        await api.reportResultado(solicitacao.id, {
          resultado: 'REPROVADO',
          cpfRetornado: cpfIdentificado || undefined,
          score: Math.round(confidence / 10),
          identificadorExterno,
          mensagem: isResponsavel
            ? 'A pessoa identificada no iDFace não corresponde ao responsável legal da solicitação.'
            : 'A pessoa identificada no iDFace não corresponde ao candidato da solicitação.',
        });
        return;
      }

      logger.info('Identificação de outra pessoa ignorada.', {
        solicitacaoId: solicitacao.id,
        userId: log.user_id,
        baseUrl: idface.baseUrl,
      });
    }

    await sleepFn(pollIntervalMs);
  }

  await api.reportResultado(solicitacao.id, {
    resultado: 'FALHOU',
    mensagem: 'Tempo esgotado sem identificação facial no iDFace.',
  });
}

async function findRegisteredCandidate(idfaces: IdfaceForVerification[], userId: number) {
  const users = await Promise.allSettled(idfaces.map((idface) => idface.getUserById(userId)));
  return users.some((result) => result.status === 'fulfilled' && result.value !== undefined);
}

/** O iDFace armazena o CPF como id numérico e pode remover o zero à esquerda. */
const cpfFromIdfaceUserId = (userId: number) => String(userId).padStart(11, '0');

const sameCpf = (left: string, right: string) => onlyDigits(left) === onlyDigits(right);

type DeviceCursor = { timestamp: number; lastLogId: number };

async function createCursors(idfaces: IdfaceForVerification[], logger: Logger) {
  const cursors = new Map<IdfaceForVerification, DeviceCursor>();
  const results = await Promise.allSettled(idfaces.map((idface) => idface.getCurrentTimestamp()));

  results.forEach((result, index) => {
    const idface = idfaces[index];
    if (!idface) return;
    if (result.status === 'fulfilled') {
      cursors.set(idface, { timestamp: result.value, lastLogId: 0 });
      return;
    }
    logger.warn('iDFace indisponível para autenticação.', {
      baseUrl: idface.baseUrl,
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    });
  });

  return cursors;
}

async function findIdentification(
  cursors: Map<IdfaceForVerification, DeviceCursor>,
  logger: Logger,
) {
  const devices = Array.from(cursors.entries());
  const results = await Promise.allSettled(
    devices.map(async ([idface, cursor]) => ({
      idface,
      cursor,
      logs: await idface.listAccessLogsSince(cursor.timestamp),
    })),
  );

  for (const result of results) {
    if (result.status !== 'fulfilled') {
      logger.warn('Falha ao consultar logs de um iDFace.', {
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
      continue;
    }

    const { idface, cursor, logs } = result.value;
    for (const log of logs) {
      if (log.id <= cursor.lastLogId) continue;
      cursor.lastLogId = log.id;
      return { idface, log };
    }
  }
}
