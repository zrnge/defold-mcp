import { z } from 'zod';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ProjectConfig, McpResult } from '../types/index.js';
import { logger } from '../utils/logger.js';

const execFileAsync = promisify(execFile);

export const GitStatusSchema = z.object({});

export async function defoldGitStatus(
  config: ProjectConfig,
): Promise<McpResult<{ branch: string; modified: string[]; staged: string[]; untracked: string[] }>> {
  try {
    const { stdout: branchOut } = await execFileAsync(
      'git',
      ['rev-parse', '--abbrev-ref', 'HEAD'],
      { cwd: config.projectRoot },
    );
    const branch = branchOut.trim();

    const { stdout: statusOut } = await execFileAsync(
      'git',
      ['status', '--porcelain=v1'],
      { cwd: config.projectRoot },
    );

    const modified: string[] = [];
    const staged: string[] = [];
    const untracked: string[] = [];

    for (const line of statusOut.split(/\r?\n/)) {
      if (!line) continue;
      const status = line.slice(0, 2);
      const file = line.slice(3).trim();
      if (status[0] !== ' ' && status[0] !== '?') staged.push(file);
      if (status[1] === 'M' || status[1] === 'D') modified.push(file);
      if (status === '??') untracked.push(file);
    }

    return { success: true, data: { branch, modified, staged, untracked } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('Git status failed', { error: message });
    return {
      success: true,
      data: { branch: '', modified: [], staged: [], untracked: [] },
      summary: 'Git is not available or this is not a Git repository.',
    };
  }
}
