import { describe, it, expect } from 'vitest';
import { defoldStop, defoldListProcesses } from '../../src/tools/run.js';

const config = { projectRoot: process.cwd(), logLevel: 'error' as const };

describe('process tools', () => {
  it('refuses to stop a process not started by this MCP', () => {
    const result = defoldStop(config, { processId: 99999 });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('PROCESS_NOT_FOUND');
  });

  it('lists running processes', () => {
    const result = defoldListProcesses(config);
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data?.processes)).toBe(true);
  });
});
