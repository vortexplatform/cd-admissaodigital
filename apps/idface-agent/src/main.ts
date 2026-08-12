import * as dotenv from 'dotenv';
import { resolve } from 'node:path';
import { BiometriaApiClient } from './api-client';
import { IdfaceAgent } from './agent';
import { loadConfig } from './config';
import { IdfaceClient } from './idface-client';
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
  const senior = new SeniorIdfaceClient({
    ...config.senior,
    timeoutMs: config.httpTimeoutMs,
    logger,
  });
  const api = new BiometriaApiClient({
    baseUrl: config.apiBaseUrl,
    deviceToken: config.biometriaDeviceToken,
    timeoutMs: config.httpTimeoutMs,
  });
  const agent = new IdfaceAgent({ api, config, senior, logger });

  if (config.idface.login === 'admin' && config.idface.password === 'admin') {
    logger.warn(
      'O iDFace está usando as credenciais padrão admin/admin. Altere-as antes de produção.',
    );
  }

  try {
    const devices = await senior.listDevices();
    if (devices.length === 0)
      throw new Error('A Senior não retornou nenhum iDFace para modrlg=17.');
    const firstDevice = devices[0];
    if (!firstDevice) throw new Error('Nenhum iDFace disponível para validação inicial.');
    const idface = new IdfaceClient({
      ...config.idface,
      baseUrl: `http://${firstDevice.ip}`,
      timeoutMs: config.httpTimeoutMs,
      logger,
    });
    await idface.login();
    logger.info('iDFaces descobertos pela Senior.', {
      dispositivos: devices.length,
      ips: devices.map((device) => device.ip),
    });
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
