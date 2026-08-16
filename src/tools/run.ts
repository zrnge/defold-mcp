import { z } from 'zod';
import { getProjectInfo } from '../utils/project.js';
import { runGame, stopProcess, listRunningProcesses } from '../defold/process.js';
import type { ProjectConfig, McpResult, RunningProcess } from '../types/index.js';
import { createError, ErrorCodes, defoldNotFoundError } from '../utils/errors.js';

export const RunSchema = z.object({
  configuration: z.enum(['debug', 'release']).default('debug'),
});

export const StopSchema = z.object({
  processId: z.number().int(),
});

export const ListProcessesSchema = z.object({});

export async function defoldRun(
  config: ProjectConfig,
  args: z.infer<typeof RunSchema>,
): Promise<McpResult<{ processId: number; command: string; status: string }>> {
  const info = await getProjectInfo(config.projectRoot, config.defoldPath);
  if (!info.defold?.available || !info.defold.path) {
    return { success: false, error: defoldNotFoundError() };
  }
  const result = runGame(config.projectRoot, info.defold.path, args.configuration);
  return { success: true, data: result, summary: `Started Defold (PID ${result.processId}).` };
}

export function defoldStop(
  _config: ProjectConfig,
  args: z.infer<typeof StopSchema>,
): McpResult<{ stopped: boolean; processId: number }> {
  const result = stopProcess(args.processId);
  if (!result.stopped) {
    return {
      success: false,
      error: createError(
        ErrorCodes.PROCESS_NOT_FOUND,
        `Process ${args.processId} was not started by this MCP.`,
        'Only processes launched via defold_run can be stopped.',
      ),
    };
  }
  return { success: true, data: result, summary: `Stopped process ${args.processId}.` };
}

export function defoldListProcesses(
  _config: ProjectConfig,
): McpResult<{ processes: RunningProcess[] }> {
  return { success: true, data: { processes: listRunningProcesses() } };
}
