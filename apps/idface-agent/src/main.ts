import * as dotenv from 'dotenv';
import { resolve } from 'node:path';
import { BiometriaApiClient } from './api-client';
import { IdfaceAgent } from './agent';
import { loadConfig } from './config';
import { createLogger } from './logger';
import { SeniorIdfaceClient } from './senior-idface-client';

// O agente é iniciado pelo Turborepo dentro de apps/idface-agent. Carrega o
// ambiente local do agente e, se ele não existir, o .env.development da raiz.
dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), '../../.env.development') });

async function bootstrap() {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  logger.info('Descoberta de iDFaces configurada.', {
    seniorApiUrl: config.senior.baseUrl,
    modrlg: config.senior.modrlg,
  });
  const api = new BiometriaApiClient({
    baseUrl: config.apiBaseUrl,
    timeoutMs: config.httpTimeoutMs,
  });
  const senior = new SeniorIdfaceClient({ ...config.senior, timeoutMs: config.httpTimeoutMs, logger });
  const agent = new IdfaceAgent({ api, config, logger, senior });

  if (config.idface.login === 'admin' && config.idface.password === 'admin') {
    logger.warn(
      'O iDFace está usando as credenciais padrão admin/admin. Altere-as antes de produção.',
    );
  }

  try {
    const devices = await senior.listDevices();
    logger.info('iDFaces disponíveis para o agente.', { quantidade: devices.length });
  } catch (error) {
    logger.warn('Não foi possível conectar ao iDFace no boot; o agente continuará tentando.', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const shutdown = (signal: string) => {
    logger.info(`Recebido ${signal}; finalizando o agente.`);
    agent.stop();
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

  await agent.start();
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
