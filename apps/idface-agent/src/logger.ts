type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export type Logger = {
  debug: (message: string, meta?: unknown) => void;
  info: (message: string, meta?: unknown) => void;
  warn: (message: string, meta?: unknown) => void;
  error: (message: string, meta?: unknown) => void;
};

export function createLogger(minLevel: LogLevel): Logger {
  const log = (level: LogLevel, message: string, meta?: unknown) => {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[minLevel]) return;
    const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;
    const consoleFn =
      level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    if (meta === undefined) consoleFn(line);
    else consoleFn(line, typeof meta === 'object' ? JSON.stringify(meta) : meta);
  };

  return {
    debug: (message, meta) => log('debug', message, meta),
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', message, meta),
  };
}
