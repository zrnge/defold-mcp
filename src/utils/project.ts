import { readdir, stat, readFile } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import type { FileEntry, DefoldProjectInfo, DefoldEngineInfo } from '../types/index.js';
import { createPathResolver, pathExists } from '../security/paths.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function isDefoldProject(projectRoot: string): Promise<boolean> {
  const gameProjectPath = join(projectRoot, 'game.project');
  return pathExists(gameProjectPath);
}

export async function listProjectFiles(
  projectRoot: string,
  options: {
    path?: string;
    recursive?: boolean;
    includeHidden?: boolean;
    extensions?: string[];
  } = {},
): Promise<FileEntry[]> {
  const resolver = createPathResolver(projectRoot);
  const base = options.path ?? '.';
  const resolved = await resolver.resolveProjectPath(base);
  if (!resolved.success || resolved.data === undefined) return [];

  const root = resolved.data;
  const entries: FileEntry[] = [];

  async function walk(dir: string): Promise<void> {
    const items = await readdir(dir, { withFileTypes: true });
    for (const item of items) {
      if (!options.includeHidden && item.name.startsWith('.')) continue;
      const absolutePath = join(dir, item.name);
      const relPath = relative(projectRoot, absolutePath).replace(/\\/g, '/');
      if (item.isDirectory()) {
        entries.push({ path: absolutePath, relativePath: relPath, type: 'directory' });
        if (options.recursive) {
          await walk(absolutePath);
        }
      } else if (item.isFile()) {
        const ext = extname(item.name).toLowerCase();
        if (options.extensions && !options.extensions.includes(ext)) continue;
        const stats = await stat(absolutePath);
        entries.push({
          path: absolutePath,
          relativePath: relPath,
          type: 'file',
          size: stats.size,
        });
      }
    }
  }

  await walk(root);
  return entries;
}

export async function readGameProject(projectRoot: string): Promise<Record<string, Record<string, string>>> {
  const path = join(projectRoot, 'game.project');
  if (!(await pathExists(path))) {
    return {};
  }
  const contents = await readFile(path, 'utf-8');
  return parseIni(contents);
}

export function parseIni(contents: string): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  let currentSection = '';
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';') || line.startsWith('#')) continue;
    if (line.startsWith('[') && line.endsWith(']')) {
      currentSection = line.slice(1, -1);
      result[currentSection] = result[currentSection] ?? {};
      continue;
    }
    const eq = line.indexOf('=');
    if (eq > 0 && currentSection) {
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim();
      result[currentSection][key] = value;
    }
  }
  return result;
}

export async function getProjectInfo(
  projectRoot: string,
  defoldPath?: string,
): Promise<DefoldProjectInfo> {
  const settings = await readGameProject(projectRoot);
  const files = (await listProjectFiles(projectRoot, { recursive: true }))
    .filter((e) => e.type === 'file')
    .map((e) => e.relativePath);

  const dependencies: string[] = [];
  const depSection = settings['project'] ?? {};
  for (let i = 1; i <= 20; i++) {
    const dep = depSection[`dependencies${i}`];
    if (dep) dependencies.push(dep);
  }

  const display = settings['display'] ?? {};
  const input = settings['input'] ?? {};
  const render = settings['render'] ?? {};

  return {
    path: projectRoot,
    name: settings['project']?.title,
    version: settings['project']?.version,
    dependencies,
    display,
    input,
    render,
    bootstrapCollection: settings['bootstrap']?.main_collection,
    mainCollection: settings['bootstrap']?.main_collection,
    settings,
    files,
    defold: await detectDefoldEngine(defoldPath),
  };
}

export async function detectDefoldEngine(defoldPath?: string): Promise<DefoldEngineInfo> {
  const candidates: string[] = [];
  if (defoldPath) candidates.push(defoldPath);
  const envPath = process.env.DEFOLD_PATH;
  if (envPath) candidates.push(envPath);
  candidates.push(
    // Common Windows paths
    'C:\\Program Files\\Defold\\Defold.exe',
    'C:\\Program Files (x86)\\Defold\\Defold.exe',
    // macOS
    '/Applications/Defold.app/Contents/MacOS/Defold',
    // Linux
    '/usr/bin/Defold',
    '/usr/local/bin/Defold',
  );

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (await pathExists(candidate)) {
      return {
        path: candidate,
        available: true,
        version: undefined,
        platforms: ['desktop'],
      };
    }
  }

  // Try to find Defold on PATH.
  try {
    const { stdout } = await execFileAsync('where', ['Defold.exe'], { shell: false });
    const found = stdout.split('\n')[0]?.trim();
    if (found && (await pathExists(found))) {
      return {
        path: found,
        available: true,
        version: undefined,
        platforms: ['desktop'],
      };
    }
  } catch {
    // ignore
  }

  return { available: false, platforms: [] };
}
