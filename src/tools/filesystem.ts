import { z } from 'zod';
import { listProjectFiles, isDefoldProject } from '../utils/project.js';
import { readTextFile, writeTextFile, deleteFile } from '../utils/files.js';
import { searchProject, findFilesByName } from '../utils/search.js';
import { applyPatch } from '../utils/patch.js';
import type { ProjectConfig, McpResult, FileEntry, SearchMatch } from '../types/index.js';
import { createError, ErrorCodes } from '../utils/errors.js';

export const ListFilesSchema = z.object({
  path: z.string().default('.'),
  recursive: z.boolean().default(true),
  includeHidden: z.boolean().default(false),
  extensions: z.array(z.string()).optional(),
});

export const ReadFileSchema = z.object({
  path: z.string(),
});

export const WriteFileSchema = z.object({
  path: z.string(),
  content: z.string(),
  backup: z.boolean().default(true),
});

export const CreateFileSchema = z.object({
  path: z.string(),
  content: z.string().default(''),
  backup: z.boolean().default(false),
});

export const DeleteFileSchema = z.object({
  path: z.string(),
  confirm: z.boolean().default(false),
});

export const SearchSchema = z.object({
  query: z.string(),
  path: z.string().default('.'),
  recursive: z.boolean().default(true),
  extensions: z.array(z.string()).optional(),
  maxResults: z.number().int().min(1).max(1000).default(100),
  caseSensitive: z.boolean().default(false),
});

export const ApplyPatchSchema = z.object({
  path: z.string(),
  operation: z.enum(['replace', 'insert_after', 'insert_before', 'replace_lines', 'delete_lines']),
  oldText: z.string().optional(),
  newText: z.string().optional(),
  startLine: z.number().int().optional(),
  endLine: z.number().int().optional(),
});

export async function defoldListFiles(
  config: ProjectConfig,
  args: z.infer<typeof ListFilesSchema>,
): Promise<McpResult<{ entries: FileEntry[] }>> {
  if (!(await isDefoldProject(config.projectRoot))) {
    return {
      success: false,
      error: createError(
        ErrorCodes.NOT_A_PROJECT,
        'Project root does not contain a game.project file.',
        'Point --project at a valid Defold project.',
      ),
    };
  }
  const entries = await listProjectFiles(config.projectRoot, args);
  return { success: true, data: { entries } };
}

export async function defoldReadFile(
  config: ProjectConfig,
  args: z.infer<typeof ReadFileSchema>,
): Promise<McpResult<{ path: string; contents: string; size: number; lineCount: number }>> {
  const result = await readTextFile(config.projectRoot, args.path);
  if (!result.success || result.data === undefined) return result as McpResult<never>;
  return { success: true, data: { path: args.path, ...result.data } };
}

export async function defoldWriteFile(
  config: ProjectConfig,
  args: z.infer<typeof WriteFileSchema>,
): Promise<McpResult<{ path: string; size: number }>> {
  const result = await writeTextFile(config.projectRoot, args.path, args.content, {
    backup: args.backup,
    ensureDir: true,
  });
  if (!result.success || result.data === undefined) return result as McpResult<never>;
  return {
    success: true,
    data: { path: args.path, size: result.data.size },
    summary: `Wrote ${args.path} (${result.data.size} bytes).`,
    changed: true,
  };
}

export async function defoldCreateFile(
  config: ProjectConfig,
  args: z.infer<typeof CreateFileSchema>,
): Promise<McpResult<{ path: string; size: number }>> {
  const result = await writeTextFile(config.projectRoot, args.path, args.content, {
    backup: args.backup,
    ensureDir: true,
  });
  if (!result.success || result.data === undefined) return result as McpResult<never>;
  return {
    success: true,
    data: { path: args.path, size: result.data.size },
    summary: `Created ${args.path} (${result.data.size} bytes).`,
    changed: true,
  };
}

export async function defoldDeleteFile(
  config: ProjectConfig,
  args: z.infer<typeof DeleteFileSchema>,
): Promise<McpResult<{ path: string }>> {
  return deleteFile(config.projectRoot, args.path, args.confirm);
}

export async function defoldSearch(
  config: ProjectConfig,
  args: z.infer<typeof SearchSchema>,
): Promise<McpResult<{ matches: SearchMatch[] }>> {
  const matches = await searchProject(config.projectRoot, args);
  return { success: true, data: { matches } };
}

export async function defoldSearchFiles(
  config: ProjectConfig,
  args: { query: string; extensions?: string[]; maxResults?: number },
): Promise<McpResult<{ matches: SearchMatch[] }>> {
  const matches = await findFilesByName(config.projectRoot, args.query, {
    extensions: args.extensions,
    maxResults: args.maxResults,
  });
  return { success: true, data: { matches } };
}

export async function defoldApplyPatch(
  config: ProjectConfig,
  args: z.infer<typeof ApplyPatchSchema>,
): Promise<McpResult<{ path: string; changed: boolean }>> {
  const readResult = await readTextFile(config.projectRoot, args.path);
  if (!readResult.success || readResult.data === undefined) return readResult as McpResult<never>;

  const patchResult = applyPatch(readResult.data.contents, {
    path: args.path,
    operation: args.operation,
    oldText: args.oldText,
    newText: args.newText,
    startLine: args.startLine,
    endLine: args.endLine,
  });
  if (!patchResult.success || patchResult.data === undefined) return patchResult as McpResult<never>;

  const writeResult = await writeTextFile(config.projectRoot, args.path, patchResult.data, {
    backup: true,
    ensureDir: true,
  });
  if (!writeResult.success || writeResult.data === undefined) return writeResult as McpResult<never>;

  return {
    success: true,
    data: { path: args.path, changed: true },
    summary: `Applied ${args.operation} patch to ${args.path}.`,
    changed: true,
  };
}
