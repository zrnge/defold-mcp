import { spawn } from 'node:child_process';
import type { RunningProcess } from '../types/index.js';
import { logger } from '../utils/logger.js';

const runningProcesses = new Map<number, RunningProcess>();
const MAX_CAPTURED_OUTPUT = 256 * 1024; // 256 KiB

export function runGame(
  projectRoot: string,
  defoldPath: string,
  _configuration: string,
): { processId: number; command: string; status: string } {
  const command = defoldPath;
  const args: string[] = [projectRoot];
  const child = spawn(command, args, { cwd: projectRoot, shell: false, detached: true });

  const processId = child.pid ?? 0;
  if (processId === 0) {
    throw new Error('Failed to launch Defold process.');
  }

  let output = '';
  child.stdout?.on('data', (data: Buffer) => {
    output = appendOutput(output, data.toString('utf-8'));
  });
  child.stderr?.on('data', (data: Buffer) => {
    output = appendOutput(output, data.toString('utf-8'));
  });
  child.on('close', (code) => {
    const proc = runningProcesses.get(processId);
    if (proc) {
      proc.output = appendOutput(proc.output ?? '', `\n[process exited with code ${code ?? 'unknown'}]\n`);
    }
  });

  runningProcesses.set(processId, {
    processId,
    command,
    startTime: new Date(),
    output,
  });

  logger.info('Started Defold process', { processId, command });
  return { processId, command, status: 'started' };
}

function appendOutput(existing: string, chunk: string): string {
  if (existing.length + chunk.length > MAX_CAPTURED_OUTPUT) {
    return (existing + chunk).slice(-MAX_CAPTURED_OUTPUT);
  }
  return existing + chunk;
}

export function getProcessOutput(processId: number): { processId: number; output: string } | undefined {
  const proc = runningProcesses.get(processId);
  if (!proc) {
    return undefined;
  }
  return { processId, output: proc.output ?? '' };
}

export function stopProcess(processId: number): { stopped: boolean; processId: number } {
  const proc = runningProcesses.get(processId);
  if (!proc) {
    return { stopped: false, processId };
  }

  try {
    process.kill(processId);
    runningProcesses.delete(processId);
    logger.info('Stopped Defold process', { processId });
    return { stopped: true, processId };
  } catch (err) {
    logger.error('Failed to stop process', { processId, error: String(err) });
    return { stopped: false, processId };
  }
}

export function listRunningProcesses(): RunningProcess[] {
  return Array.from(runningProcesses.values());
}
