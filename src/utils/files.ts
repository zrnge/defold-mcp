import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createPathResolver, pathExists } from '../security/paths.js';
import type { McpResult, Diagnostic } from '../types/index.js';
import { createError, ErrorCodes } from './errors.js';
import { logger } from './logger.js';

const TEXT_EXTENSIONS = new Set([
  '.script',
  '.gui_script',
  '.lua',
  '.project',
  '.collection',
  '.go',
  '.gui',
  '.render',
  '.render_script',
  '.factory',
  '.collectionfactory',
  '.sprite',
  '.atlas',
  '.tilesource',
  '.tilemap',
  '.input_binding',
  '.material',
  '.font',
  '.label',
  '.camera',
  '.particlefx',
  '.sound',
  '.collisionobject',
  '.spine',
  '.spinemodel',
  '.model',
  '.md',
  '.txt',
  '.json',
  '.xml',
]);

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.tga',
  '.dds',
  '.wav',
  '.ogg',
  '.mp3',
  '.fbx',
  '.dae',
  '.gltf',
  '.glb',
  '.bin',
  '.zip',
  '.jar',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
]);

export function isTextFile(filePath: string): boolean {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) return true;
  if (BINARY_EXTENSIONS.has(ext)) return false;
  // Default to text for unknown Defold-like extensions.
  return true;
}

export async function readTextFile(
  projectRoot: string,
  relativePath: string,
): Promise<McpResult<{ contents: string; size: number; lineCount: number }>> {
  const resolver = createPathResolver(projectRoot);
  const resolved = await resolver.resolveProjectPath(relativePath);
  if (!resolved.success || resolved.data === undefined) {
    return resolved as McpResult<never>;
  }

  const absolutePath = resolved.data;
  if (!(await pathExists(absolutePath))) {
    return {
      success: false,
      error: createError(
        ErrorCodes.FILE_NOT_FOUND,
        `The requested file does not exist: ${relativePath}`,
        'Check the path and try again.',
        relativePath,
      ),
    };
  }

  if (!isTextFile(absolutePath)) {
    return {
      success: false,
      error: createError(
        ErrorCodes.BINARY_FILE,
        `File is binary and cannot be read as text: ${relativePath}`,
        'Request a text-based Defold resource.',
        relativePath,
      ),
    };
  }

  const contents = await readFile(absolutePath, 'utf-8');
  return {
    success: true,
    data: {
      contents,
      size: Buffer.byteLength(contents),
      lineCount: contents.split('\n').length,
    },
  };
}

export async function writeTextFile(
  projectRoot: string,
  relativePath: string,
  content: string,
  options: { backup?: boolean; ensureDir?: boolean } = {},
): Promise<McpResult<{ path: string; relativePath: string; size: number }>> {
  const resolver = createPathResolver(projectRoot);
  const resolved = await resolver.resolveProjectPath(relativePath);
  if (!resolved.success || resolved.data === undefined) {
    return resolved as McpResult<never>;
  }

  const absolutePath = resolved.data;
  const existed = await pathExists(absolutePath);

  if (options.backup && existed) {
    const backupDir = join(projectRoot, '.defold-mcp-backups');
    await mkdir(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(backupDir, `${relativePath.replace(/[\\/]/g, '__')}__${timestamp}`);
    const existing = await readFile(absolutePath, 'utf-8');
    await mkdir(dirname(backupPath), { recursive: true });
    await writeFile(backupPath, existing, 'utf-8');
    logger.info('Created backup', { original: relativePath, backup: backupPath });
  }

  if (options.ensureDir) {
    await mkdir(dirname(absolutePath), { recursive: true });
  }

  await writeFile(absolutePath, content, 'utf-8');
  const size = Buffer.byteLength(content);
  logger.info('Wrote file', { path: relativePath, existed, size });

  return {
    success: true,
    data: { path: absolutePath, relativePath, size },
  };
}

export async function deleteFile(
  projectRoot: string,
  relativePath: string,
  confirm: boolean,
): Promise<McpResult<{ path: string }>> {
  if (!confirm) {
    return {
      success: false,
      error: createError(
        ErrorCodes.MISSING_CONFIRMATION,
        'Deletion requires confirm: true.',
        'Set confirm to true to delete this file.',
        relativePath,
      ),
    };
  }

  const resolver = createPathResolver(projectRoot);
  const resolved = await resolver.resolveProjectPath(relativePath);
  if (!resolved.success || resolved.data === undefined) {
    return resolved as McpResult<never>;
  }

  const absolutePath = resolved.data;
  if (!(await pathExists(absolutePath))) {
    return {
      success: false,
      error: createError(
        ErrorCodes.FILE_NOT_FOUND,
        `The requested file does not exist: ${relativePath}`,
        'Check the path and try again.',
        relativePath,
      ),
    };
  }

  await rm(absolutePath, { recursive: true, force: true });
  logger.warn('Deleted file/directory', { path: relativePath });
  return { success: true, data: { path: absolutePath } };
}

export function formatDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
  return diagnostics.slice(0, 50);
}
