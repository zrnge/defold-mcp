import { spawn } from 'node:child_process';
import type { RunningProcess } from '../types/index.js';
import { logger } from '../utils/logger.js';

const runningProcesses = new Map<number, RunningProcess>();

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

  runningProcesses.set(processId, {
    processId,
    command,
    startTime: new Date(),
  });

  logger.info('Started Defold process', { processId, command });
  return { processId, command, status: 'started' };
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
