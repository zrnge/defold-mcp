#!/usr/bin/env node
import { loadConfig } from './config.js';
import { startServer } from './server.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  try {
    const config = await loadConfig();
    await startServer(config);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Failed to start server', { error: message });
    process.exit(1);
  }
}

void main();
