import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { defoldGetInputBindings, defoldAddInputBinding } from '../../src/tools/input.js';

const TEST_ROOT = resolve(process.cwd(), 'tests', 'tmp', 'input-root');
const config = { projectRoot: TEST_ROOT, logLevel: 'error' as const };

beforeAll(async () => {
  await rm(TEST_ROOT, { recursive: true, force: true });
  await mkdir(join(TEST_ROOT, 'input'), { recursive: true });
  await writeFile(
    join(TEST_ROOT, 'input', 'game.input_binding'),
    'key_trigger {\n  input: "KEY_LEFT"\n  action: "move_left"\n}\n',
  );
});

afterAll(async () => {
  await rm(TEST_ROOT, { recursive: true, force: true });
});

describe('input tools', () => {
  it('reads input bindings', async () => {
    const result = await defoldGetInputBindings(config);
    expect(result.success).toBe(true);
    expect(result.data?.bindings).toContainEqual({
      action: 'move_left',
      input: 'KEY_LEFT',
      type: 'key',
    });
  });

  it('adds an input binding', async () => {
    const result = await defoldAddInputBinding(config, {
      action: 'jump',
      input: 'KEY_SPACE',
      type: 'key',
    });
    expect(result.success).toBe(true);
    const contents = await readFile(join(TEST_ROOT, 'input', 'game.input_binding'), 'utf-8');
    expect(contents).toContain('KEY_SPACE');
  });
});
