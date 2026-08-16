import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathExists } from '../security/paths.js';
import type { CollectionInfo, GameObjectInfo, ComponentInfo } from '../types/index.js';

/**
 * Lightweight parser for Defold text-based file formats.
 * These formats are roughly Lua-like nested tables.
 */

export interface DefoldNode {
  type: string;
  id?: string;
  children: DefoldNode[];
  properties: Record<string, unknown>;
}

export function parseDefoldText(contents: string): DefoldNode[] {
  const nodes: DefoldNode[] = [];
  const stack: DefoldNode[] = [];
  let current: DefoldNode | null = null;
  const lines = contents.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('--')) continue;

    const openMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\{/);
    if (openMatch) {
      const type = openMatch[1];
      const node: DefoldNode = { type, children: [], properties: {} };
      if (current) {
        current.children.push(node);
      } else {
        nodes.push(node);
      }
      stack.push(node);
      current = node;
      continue;
    }

    if (line === '}') {
      stack.pop();
      current = stack[stack.length - 1] ?? null;
      continue;
    }

    const propMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_.:]*)\s*:\s*(.+)$/);
    if (propMatch && current) {
      const key = propMatch[1];
      let value: unknown = propMatch[2].trim();
      if (typeof value === 'string') {
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value === 'true') {
          value = true;
        } else if (value === 'false') {
          value = false;
        } else if (!isNaN(Number(value)) && value !== '') {
          value = Number(value);
        }
      }
      current.properties[key] = value;
    }
  }

  return nodes;
}

function findChildren(node: DefoldNode, type: string): DefoldNode[] {
  return node.children.filter((c) => c.type === type);
}

function getVec3(props: Record<string, unknown>, prefix: string): { x: number; y: number; z: number } | undefined {
  const xKey = prefix ? `${prefix}.x` : 'x';
  const yKey = prefix ? `${prefix}.y` : 'y';
  const zKey = prefix ? `${prefix}.z` : 'z';
  const x = props[xKey];
  const y = props[yKey];
  const z = props[zKey];
  if (x !== undefined && y !== undefined && z !== undefined) {
    return { x: Number(x), y: Number(y), z: Number(z) };
  }
  return undefined;
}

function getQuat(props: Record<string, unknown>): { x: number; y: number; z: number; w: number } | undefined {
  const x = props['x'] ?? props['rotation.x'];
  const y = props['y'] ?? props['rotation.y'];
  const z = props['z'] ?? props['rotation.z'];
  const w = props['w'] ?? props['rotation.w'];
  if (x !== undefined && y !== undefined && z !== undefined && w !== undefined) {
    return { x: Number(x), y: Number(y), z: Number(z), w: Number(w) };
  }
  return undefined;
}

export function parseCollection(contents: string): CollectionInfo {
  const nodes = parseDefoldText(contents);
  const root = nodes.find((n) => n.type === 'collection');
  const gameObjects: GameObjectInfo[] = [];

  if (!root) return { path: '', gameObjects: [] };

  const goNodes = [
    ...findChildren(root, 'game_objects'),
    ...findChildren(root, 'embedded_instances'),
  ];

  for (const goNode of goNodes) {
    const id = String(goNode.properties.id ?? '');
    const components: ComponentInfo[] = [];
    for (const compNode of goNode.children) {
      if (compNode.type === 'components') {
        const compId = String(compNode.properties.id ?? '');
        const compType = String(compNode.properties.type ?? '');
        const compPath = compNode.properties.data
          ? String(compNode.properties.data).replace(/^\/+/, '')
          : undefined;
        components.push({ id: compId, type: compType, path: compPath });
      }
    }

    const position = extractVec3(goNode, 'position');
    const rotation = extractQuat(goNode, 'rotation');
    const scale = extractVec3(goNode, 'scale');

    gameObjects.push({
      id,
      position,
      rotation,
      scale,
      parent: goNode.properties.parent ? String(goNode.properties.parent) : undefined,
      components,
    });
  }

  return { path: '', gameObjects };
}

function extractVec3(
  node: DefoldNode,
  name: string,
): { x: number; y: number; z: number } | undefined {
  const child = node.children.find((c) => c.type === name);
  if (!child) return undefined;
  return getVec3(child.properties, '');
}

function extractQuat(
  node: DefoldNode,
  name: string,
): { x: number; y: number; z: number; w: number } | undefined {
  const child = node.children.find((c) => c.type === name);
  if (!child) return undefined;
  return getQuat(child.properties);
}

export async function readCollection(
  projectRoot: string,
  relativePath: string,
): Promise<CollectionInfo | null> {
  const absolutePath = join(projectRoot, relativePath);
  if (!(await pathExists(absolutePath))) return null;
  const contents = await readFile(absolutePath, 'utf-8');
  const info = parseCollection(contents);
  info.path = relativePath;
  return info;
}
