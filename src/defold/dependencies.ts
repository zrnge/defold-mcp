import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathExists } from '../security/paths.js';
import { parseDefoldText } from './parser.js';

export interface DependencyGraph {
  direct: string[];
  reverse: string[];
}

/**
 * Extract direct dependencies from a Defold resource file.
 * Supports .go, .collection, .gui, .script, .factory, etc.
 */
export async function getDependencies(
  projectRoot: string,
  relativePath: string,
): Promise<DependencyGraph> {
  const direct: string[] = [];
  const absolutePath = join(projectRoot, relativePath);
  if (!(await pathExists(absolutePath))) {
    return { direct: [], reverse: [] };
  }

  const contents = await readFile(absolutePath, 'utf-8');
  const nodes = parseDefoldText(contents);

  for (const root of nodes) {
    for (const child of root.children) {
      collectRefs(child, direct);
    }
    collectRefs(root, direct);
  }

  // Also scan Lua scripts for factory/resource/hash references.
  if (relativePath.endsWith('.script') || relativePath.endsWith('.gui_script')) {
    const factoryMatches = contents.match(/factory\.create\s*\(\s*["']([^"']+)["']/g);
    if (factoryMatches) {
      for (const m of factoryMatches) {
        const inner = m.match(/["']([^"']+)["']/);
        if (inner) direct.push(inner[1]);
      }
    }
    const hashMatches = contents.match(/hash\s*\(\s*["']([^"']+)["']/g);
    if (hashMatches) {
      for (const m of hashMatches) {
        const inner = m.match(/["']([^"']+)["']/);
        if (inner) direct.push(inner[1]);
      }
    }
  }

  const reverse = await findReverseDependencies(projectRoot, relativePath);

  return { direct: unique(direct), reverse: unique(reverse) };
}

function collectRefs(node: ReturnType<typeof parseDefoldText>[number], out: string[]): void {
  for (const [key, value] of Object.entries(node.properties)) {
    if (
      (key === 'data' || key.endsWith('.path') || key.endsWith('.resource')) &&
      typeof value === 'string'
    ) {
      const cleaned = value.replace(/^\/+/, '');
      if (cleaned) out.push(cleaned);
    }
  }
  for (const child of node.children) {
    collectRefs(child, out);
  }
}

async function findReverseDependencies(projectRoot: string, relativePath: string): Promise<string[]> {
  const reverse: string[] = [];
  const target = relativePath.replace(/\\/g, '/');
  const { listProjectFiles } = await import('../utils/project.js');
  const files = await listProjectFiles(projectRoot, { recursive: true });
  for (const entry of files) {
    if (entry.type !== 'file') continue;
    if (!isTextResource(entry.relativePath)) continue;
    try {
      const contents = await readFile(entry.path, 'utf-8');
      if (contents.includes(target)) {
        reverse.push(entry.relativePath);
      }
    } catch {
      // ignore
    }
  }
  return reverse;
}

function isTextResource(relativePath: string): boolean {
  const textExts = new Set([
    '.go',
    '.collection',
    '.gui',
    '.script',
    '.gui_script',
    '.factory',
    '.collectionfactory',
    '.sprite',
    '.atlas',
    '.tilesource',
    '.tilemap',
    '.particlefx',
    '.sound',
    '.collisionobject',
    '.material',
    '.render',
    '.render_script',
    '.input_binding',
    '.font',
    '.label',
    '.camera',
    '.model',
    '.spine',
    '.spinemodel',
  ]);
  const ext = relativePath.slice(relativePath.lastIndexOf('.')).toLowerCase();
  return textExts.has(ext);
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
