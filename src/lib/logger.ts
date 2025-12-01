import { env } from './env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m', // Green
  warn: '\x1b[33m', // Yellow
  error: '\x1b[31m' // Red
};

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';

function formatTimestamp(): string {
  return new Date().toISOString();
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[env.LOG_LEVEL];
}

function formatMessage(
  level: LogLevel,
  context: string | undefined,
  message: string,
  meta?: Record<string, unknown>
): string {
  const timestamp = `${DIM}${formatTimestamp()}${RESET}`;
  const levelStr = `${LOG_COLORS[level]}${level.toUpperCase().padEnd(5)}${RESET}`;
  const contextStr = context ? `${DIM}[${context}]${RESET} ` : '';
  const metaStr = meta ? ` ${DIM}${JSON.stringify(meta)}${RESET}` : '';
  return `${timestamp} ${levelStr} ${contextStr}${message}${metaStr}`;
}

class Logger {
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!shouldLog(level)) return;

    const formatted = formatMessage(level, this.context, message, meta);

    switch (level) {
      case 'error':
        console.error(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  error(message: string, error?: unknown, meta?: Record<string, unknown>): void {
    const errorMeta: Record<string, unknown> = { ...meta };

    if (error instanceof Error) {
      errorMeta['error'] = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    } else if (error !== undefined) {
      errorMeta['error'] = error;
    }

    this.log('error', message, Object.keys(errorMeta).length > 0 ? errorMeta : undefined);
  }

  child(context: string): Logger {
    const prefix = this.context ? `${this.context}:${context}` : context;
    return new Logger(prefix);
  }
}

export const logger = new Logger();

export function createLogger(context: string): Logger {
  return new Logger(context);
}
