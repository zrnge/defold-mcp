import { z } from 'zod';
import { buildProject, parseBuildOutput } from '../defold/build.js';
import { getProjectInfo } from '../utils/project.js';
import type { ProjectConfig, McpResult, BuildResult, Diagnostic } from '../types/index.js';

export const BuildSchema = z.object({
  platform: z.string().default('desktop'),
  configuration: z.enum(['debug', 'release', 'headless']).default('debug'),
});

export const GetBuildErrorsSchema = z.object({
  output: z.string().optional(),
});

export async function defoldBuild(
  config: ProjectConfig,
  args: z.infer<typeof BuildSchema>,
): Promise<McpResult<BuildResult>> {
  const _unused = config;
  const info = await getProjectInfo(_unused.projectRoot, _unused.defoldPath);
  const result = await buildProject(_unused.projectRoot, info.defold, {
    platform: args.platform,
    configuration: args.configuration,
  });
  return {
    success: result.exitCode === 0,
    data: result,
    summary:
      result.exitCode === 0
        ? `Build completed in ${result.durationMs}ms.`
        : `Build failed with exit code ${result.exitCode}.`,
    diagnostics: result.diagnostics,
  };
}

export function defoldGetBuildErrors(
  _config: ProjectConfig,
  args: z.infer<typeof GetBuildErrorsSchema>,
): McpResult<{ diagnostics: Diagnostic[] }> {
  const output = args.output ?? '';
  const diagnostics = parseBuildOutput(output);
  return { success: true, data: { diagnostics } };
}
