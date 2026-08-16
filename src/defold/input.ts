import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathExists } from '../security/paths.js';
import { parseDefoldText } from './parser.js';
import type { InputBinding } from '../types/index.js';

const DEFAULT_BINDING_PATH = 'input/game.input_binding';

export async function getInputBindings(projectRoot: string): Promise<InputBinding[]> {
  const path = join(projectRoot, DEFAULT_BINDING_PATH);
  if (!(await pathExists(path))) return [];

  const contents = await readFile(path, 'utf-8');
  const nodes = parseDefoldText(contents);
  const bindings: InputBinding[] = [];

  for (const node of nodes) {
    const type = mapInputType(node.type);
    const action = String(node.properties.action ?? '');
    const input = String(
      node.properties.input ?? node.properties.key ?? node.properties.name ?? '',
    );
    if (action && input) {
      bindings.push({ action, input, type });
    }
  }

  return bindings;
}

function mapInputType(nodeType: string): InputBinding['type'] {
  switch (nodeType) {
    case 'key_trigger':
      return 'key';
    case 'mouse_trigger':
      return 'mouse';
    case 'gamepad_trigger':
      return 'gamepad';
    case 'touch_trigger':
      return 'touch';
    case 'text_trigger':
      return 'text';
    default:
      return 'key';
  }
}

export async function addInputBinding(
  projectRoot: string,
  binding: InputBinding,
): Promise<void> {
  const path = join(projectRoot, DEFAULT_BINDING_PATH);
  const contents = (await pathExists(path)) ? await readFile(path, 'utf-8') : defaultBindingTemplate();

  const typeNode = bindingTypeToNode(binding.type);
  const entryLine = `  {\n    input: "${binding.input}"\n    action: "${binding.action}"\n  }`;

  const marker = `${typeNode} {`;
  const idx = contents.indexOf(marker);
  if (idx === -1) {
    // Append new section at end.
    const newContents = contents.trimEnd() + `\n\n${typeNode} {\n${entryLine}\n}\n`;
    await writeFile(path, newContents, 'utf-8');
    return;
  }

  const insertIdx = contents.indexOf('}', idx);
  const before = contents.slice(0, insertIdx);
  const after = contents.slice(insertIdx);
  await writeFile(path, `${before}${entryLine}\n${after}`, 'utf-8');
}

function bindingTypeToNode(type: InputBinding['type']): string {
  switch (type) {
    case 'mouse':
      return 'mouse_trigger';
    case 'gamepad':
      return 'gamepad_trigger';
    case 'touch':
      return 'touch_trigger';
    case 'text':
      return 'text_trigger';
    case 'key':
    default:
      return 'key_trigger';
  }
}

function defaultBindingTemplate(): string {
  return `key_trigger {
}

mouse_trigger {
}

gamepad_trigger {
}
`;
}
