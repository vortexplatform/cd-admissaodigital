import { z } from 'zod';

const boolFromEnv = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .transform((value) =>
      value === undefined
        ? defaultValue
        : ['1', 'true', 'yes', 'sim'].includes(value.toLowerCase()),
    );

const envSchema = z.object({
  API_BASE_URL: z.url(),
  SENIOR_API_URL: z.url(),
  IDFACE_MODRLG: z.coerce.number().int().positive().default(17),
  IDFACE_LOGIN: z.string().default('admin'),
  IDFACE_PASSWORD: z.string().default('admin'),
  IDFACE_MIN_CONFIDENCE: z.coerce.number().int().min(0).max(1000).default(500),
  REJECT_ON_MISMATCH: boolFromEnv(true),
  SOLICITACOES_POLL_INTERVAL_MS: z.coerce.number().int().min(1000).default(5000),
  VERIFICACAO_POLL_INTERVAL_MS: z.coerce.number().int().min(500).default(1500),
  HTTP_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type AppConfig = ReturnType<typeof loadConfig>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuração inválida. Verifique o arquivo .env:\n${issues}`);
  }

  const config = parsed.data;
  return {
    apiBaseUrl: config.API_BASE_URL.replace(/\/+$/, ''),
    senior: {
      baseUrl: config.SENIOR_API_URL.replace(/\/+$/, ''),
      modrlg: config.IDFACE_MODRLG,
    },
    idface: {
      login: config.IDFACE_LOGIN,
      password: config.IDFACE_PASSWORD,
      minConfidence: config.IDFACE_MIN_CONFIDENCE,
    },
    rejectOnMismatch: config.REJECT_ON_MISMATCH,
    solicitacoesPollIntervalMs: config.SOLICITACOES_POLL_INTERVAL_MS,
    verificacaoPollIntervalMs: config.VERIFICACAO_POLL_INTERVAL_MS,
    httpTimeoutMs: config.HTTP_TIMEOUT_MS,
    logLevel: config.LOG_LEVEL,
  };
}
