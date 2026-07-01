import { Request } from 'express';

type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const levelConfig: Record<LogLevel, { color: string; label: string }> = {
  info:    { color: colors.blue,    label: 'INFO   ' },
  warn:    { color: colors.yellow,  label: 'WARN   ' },
  error:   { color: colors.red,     label: 'ERROR  ' },
  success: { color: colors.green,   label: 'SUCCESS' },
  debug:   { color: colors.magenta, label: 'DEBUG  ' },
};

const formatTimestamp = (): string => {
  return new Date().toISOString().replace('T', ' ').substring(0, 23);
};

const log = (level: LogLevel, message: string, meta?: unknown): void => {
  if (process.env.NODE_ENV === 'test') return;

  const { color, label } = levelConfig[level];
  const timestamp = formatTimestamp();
  const metaStr = meta ? `\n  ${JSON.stringify(meta, null, 2)}` : '';

  console.log(
    `${colors.bright}${color}[${label}]${colors.reset} ${colors.white}${timestamp}${colors.reset} ${message}${metaStr}`
  );
};

export const logger = {
  info:    (msg: string, meta?: unknown) => log('info', msg, meta),
  warn:    (msg: string, meta?: unknown) => log('warn', msg, meta),
  error:   (msg: string, meta?: unknown) => log('error', msg, meta),
  success: (msg: string, meta?: unknown) => log('success', msg, meta),
  debug:   (msg: string, meta?: unknown) => {
    if (process.env.NODE_ENV === 'development') log('debug', msg, meta);
  },
  request: (req: Request, statusCode: number, responseTime: number): void => {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    log(level, `${req.method} ${req.url} ${statusCode} ${responseTime}ms`);
  },
};
