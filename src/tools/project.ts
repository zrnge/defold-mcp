import { z } from 'zod';
import { getProjectInfo } from '../utils/project.js';
import type { ProjectConfig, McpResult, DefoldProjectInfo } from '../types/index.js';

export const GetProjectSchema = z.object({});

export async function defoldGetProject(config: ProjectConfig): Promise<McpResult<DefoldProjectInfo>> {
  const info = await getProjectInfo(config.projectRoot, config.defoldPath);
  return { success: true, data: info };
}
