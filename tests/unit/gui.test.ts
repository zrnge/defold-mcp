import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { defoldCreateGui, defoldCreateGuiNode } from '../../src/tools/gui.js';

const TEST_ROOT = resolve(process.cwd(), 'tests', 'tmp', 'gui-root');
const config = { projectRoot: TEST_ROOT, logLevel: 'error' as const };

beforeAll(async () => {
  await rm(TEST_ROOT, { recursive: true, force: true });
  await mkdir(join(TEST_ROOT, 'main'), { recursive: true });
  await writeFile(join(TEST_ROOT, 'main', 'main.gui'), 'script: ""\nbackground_color {\n}\n');
});

afterAll(async () => {
  await rm(TEST_ROOT, { recursive: true, force: true });
});

describe('GUI tools', () => {
  it('creates a GUI file', async () => {
    const result = await defoldCreateGui(config, {
      path: 'hud/hud.gui',
      script: '/hud/hud.gui_script',
    });
    expect(result.success).toBe(true);
    const contents = await readFile(join(TEST_ROOT, 'hud', 'hud.gui'), 'utf-8');
    expect(contents).toContain('/hud/hud.gui_script');
  });

  it('adds a GUI node', async () => {
    const result = await defoldCreateGuiNode(config, {
      gui: 'main/main.gui',
      id: 'score',
      type: 'text',
      position: { x: 50, y: 700, z: 0 },
      text: 'Score: 0',
    });
    expect(result.success).toBe(true);
    const contents = await readFile(join(TEST_ROOT, 'main', 'main.gui'), 'utf-8');
    expect(contents).toContain('id: "score"');
    expect(contents).toContain('Score: 0');
  });
});
