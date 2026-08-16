import type { LogLevel } from '../types/index.js';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let configuredLevel: LogLevel = 'info';

export function configureLogger(level: LogLevel): void {
  configuredLevel = level;
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (LEVELS[level] < LEVELS[configuredLevel]) {
    return;
  }
  const entry: Record<string, unknown> = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };
  if (meta) {
    entry.meta = meta;
  }
  // Always write to stderr to avoid corrupting stdio MCP protocol.
  process.stderr.write(JSON.stringify(entry) + '\n');
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
};
