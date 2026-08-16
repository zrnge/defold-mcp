import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { readTextFile, writeTextFile, deleteFile } from '../../src/utils/files.js';
const TEST_ROOT = resolve(process.cwd(), 'tests', 'tmp', 'filesystem-root');
beforeAll(async () => {
    await rm(TEST_ROOT, { recursive: true, force: true });
    await mkdir(join(TEST_ROOT, 'player'), { recursive: true });
    await writeFile(join(TEST_ROOT, 'player', 'player.script'), 'local speed = 100');
});
afterAll(async () => {
    await rm(TEST_ROOT, { recursive: true, force: true });
});
describe('filesystem utilities', () => {
    it('reads a text file', async () => {
        const result = await readTextFile(TEST_ROOT, 'player/player.script');
        expect(result.success).toBe(true);
        expect(result.data?.contents).toBe('local speed = 100');
    });
    it('writes a file and creates backup', async () => {
        const result = await writeTextFile(TEST_ROOT, 'player/player.script', 'local speed = 200', {
            backup: true,
            ensureDir: true,
        });
        expect(result.success).toBe(true);
        const contents = await readFile(join(TEST_ROOT, 'player', 'player.script'), 'utf-8');
        expect(contents).toBe('local speed = 200');
    });
    it('refuses deletion without confirmation', async () => {
        const result = await deleteFile(TEST_ROOT, 'player/player.script', false);
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('MISSING_CONFIRMATION');
    });
});
//# sourceMappingURL=filesystem.test.js.map