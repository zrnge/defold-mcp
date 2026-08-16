import { z } from 'zod';
import { getProjectInfo, listProjectFiles } from '../utils/project.js';
import { readTextFile } from '../utils/files.js';
import { analyzeLuaScript } from '../defold/lua.js';
import { validateLuaSyntaxLightweight } from '../utils/patch.js';
import { getDependencies } from '../defold/dependencies.js';
import { getInputBindings } from '../defold/input.js';
import { readCollection } from '../defold/parser.js';
import type { ProjectConfig, McpResult, Diagnostic, LuaAnalysis } from '../types/index.js';

export const AnalyzeLuaSchema = z.object({
  path: z.string(),
});

export const ValidateSchema = z.object({
  path: z.string().optional(),
});

export const DependenciesSchema = z.object({
  path: z.string(),
});

export const ProjectContextSchema = z.object({});

export const AnalyzeProjectSchema = z.object({});

export async function defoldAnalyzeLua(
  config: ProjectConfig,
  args: z.infer<typeof AnalyzeLuaSchema>,
): Promise<McpResult<LuaAnalysis>> {
  const readResult = await readTextFile(config.projectRoot, args.path);
  if (!readResult.success || readResult.data === undefined) return readResult as McpResult<never>;
  const analysis = analyzeLuaScript(readResult.data.contents);
  return { success: true, data: analysis };
}

export async function defoldValidate(
  config: ProjectConfig,
  args: z.infer<typeof ValidateSchema>,
): Promise<McpResult<{ diagnostics: Diagnostic[] }>> {
  const diagnostics: Diagnostic[] = [];
  const files = args.path
    ? undefined
    : await listProjectFiles(config.projectRoot, { recursive: true, extensions: ['.script', '.gui_script', '.lua'] });

  const targetFiles = args.path ? [args.path] : files?.map((f) => f.relativePath) ?? [];

  for (const relativePath of targetFiles) {
    const readResult = await readTextFile(config.projectRoot, relativePath);
    if (!readResult.success || readResult.data === undefined) {
      diagnostics.push({
        file: relativePath,
        severity: 'error',
        message: readResult.error?.message ?? 'Could not read file.',
      });
      continue;
    }
    const luaIssues = validateLuaSyntaxLightweight(readResult.data.contents);
    for (const issue of luaIssues) {
      diagnostics.push({ ...issue, file: relativePath });
    }
  }

  // Validate referenced resources in .go/.collection files.
  const resourceFiles = args.path
    ? undefined
    : await listProjectFiles(config.projectRoot, {
        recursive: true,
        extensions: ['.go', '.collection', '.gui', '.factory', '.collectionfactory'],
      });
  for (const entry of resourceFiles ?? []) {
    const deps = await getDependencies(config.projectRoot, entry.relativePath);
    for (const dep of deps.direct) {
      const depPath = dep.includes('.') ? dep : dep + '.script';
      const { pathExists } = await import('../security/paths.js');
      const absolute = config.projectRoot + '/' + depPath;
      if (!(await pathExists(absolute))) {
        diagnostics.push({
          file: entry.relativePath,
          severity: 'warning',
          message: `Missing dependency: ${dep}`,
        });
      }
    }
  }

  return { success: true, data: { diagnostics } };
}

export async function defoldDependencies(
  config: ProjectConfig,
  args: z.infer<typeof DependenciesSchema>,
): Promise<McpResult<{ direct: string[]; reverse: string[] }>> {
  const graph = await getDependencies(config.projectRoot, args.path);
  return { success: true, data: graph };
}

export async function defoldProjectContext(
  config: ProjectConfig,
): Promise<McpResult<Record<string, unknown>>> {
  const info = await getProjectInfo(config.projectRoot, config.defoldPath);
  const allFiles = await listProjectFiles(config.projectRoot, { recursive: true });
  const collections = allFiles
    .filter((f) => f.type === 'file' && f.relativePath.endsWith('.collection'))
    .map((f) => f.relativePath);
  const scripts = allFiles
    .filter((f) => f.type === 'file' && (f.relativePath.endsWith('.script') || f.relativePath.endsWith('.gui_script')))
    .map((f) => f.relativePath);
  const gameObjects = allFiles
    .filter((f) => f.type === 'file' && f.relativePath.endsWith('.go'))
    .map((f) => f.relativePath);
  const guis = allFiles
    .filter((f) => f.type === 'file' && f.relativePath.endsWith('.gui'))
    .map((f) => f.relativePath);
  const assets = allFiles
    .filter((f) => f.type === 'file' && !f.relativePath.endsWith('.project') && !f.relativePath.endsWith('.collection'))
    .map((f) => f.relativePath)
    .slice(0, 200);

  const inputBindings = await getInputBindings(config.projectRoot);

  return {
    success: true,
    data: {
      projectName: info.name,
      projectPath: info.path,
      version: info.version,
      bootstrapCollection: info.bootstrapCollection,
      collections,
      scripts,
      gameObjects,
      guis,
      assets,
      inputBindings,
      dependencies: info.dependencies,
      defoldAvailable: info.defold?.available ?? false,
    },
  };
}

export async function defoldAnalyzeProject(
  config: ProjectConfig,
): Promise<McpResult<Record<string, unknown>>> {
  const context = await defoldProjectContext(config);
  const data = context.data ?? {};
  const duplicateIds: Record<string, string[]> = {};
  const missingResources: { file: string; resource: string }[] = [];

  const allFiles = await listProjectFiles(config.projectRoot, { recursive: true });
  for (const entry of allFiles) {
    if (entry.type !== 'file') continue;
    if (entry.relativePath.endsWith('.collection')) {
      const collection = await readCollection(config.projectRoot, entry.relativePath);
      if (collection) {
        const ids = collection.gameObjects.map((go) => go.id);
        const seen = new Set<string>();
        for (const id of ids) {
          if (seen.has(id)) {
            duplicateIds[entry.relativePath] = duplicateIds[entry.relativePath] ?? [];
            if (!duplicateIds[entry.relativePath].includes(id)) {
              duplicateIds[entry.relativePath].push(id);
            }
          }
          seen.add(id);
        }
      }
    }
  }

  return {
    success: true,
    data: {
      ...data,
      duplicateIds,
      missingResources,
    },
  };
}
