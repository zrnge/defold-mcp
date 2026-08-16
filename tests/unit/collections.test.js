import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { defoldReadCollection, defoldCreateCollection, defoldAddGameObjectToCollection, defoldRemoveGameObjectFromCollection, } from '../../src/tools/collections.js';
const TEST_ROOT = resolve(process.cwd(), 'tests', 'tmp', 'collections-root');
const config = { projectRoot: TEST_ROOT, logLevel: 'error' };
beforeAll(async () => {
    await rm(TEST_ROOT, { recursive: true, force: true });
    await mkdir(join(TEST_ROOT, 'main'), { recursive: true });
    await writeFile(join(TEST_ROOT, 'main', 'main.collection'), 'name: "main"\nscale_along_z: 0\ncollection {\n}\n');
});
afterAll(async () => {
    await rm(TEST_ROOT, { recursive: true, force: true });
});
describe('collection tools', () => {
    it('reads a collection', async () => {
        const result = await defoldReadCollection(config, { path: 'main/main.collection' });
        expect(result.success).toBe(true);
        expect(result.data?.gameObjects).toEqual([]);
    });
    it('creates a collection', async () => {
        const result = await defoldCreateCollection(config, {
            path: 'levels/level1.collection',
            name: 'level1',
        });
        expect(result.success).toBe(true);
        const contents = await readFile(join(TEST_ROOT, 'levels', 'level1.collection'), 'utf-8');
        expect(contents).toContain('name: "level1"');
    });
    it('adds a game object to a collection', async () => {
        const result = await defoldAddGameObjectToCollection(config, {
            collection: 'main/main.collection',
            id: 'enemy',
            position: { x: 200, y: 200, z: 0 },
        });
        expect(result.success).toBe(true);
        const contents = await readFile(join(TEST_ROOT, 'main', 'main.collection'), 'utf-8');
        expect(contents).toContain('id: "enemy"');
    });
    it('refuses removal without confirmation', async () => {
        const result = await defoldRemoveGameObjectFromCollection(config, {
            collection: 'main/main.collection',
            id: 'enemy',
            confirm: false,
        });
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('MISSING_CONFIRMATION');
    });
});
//# sourceMappingURL=collections.test.js.map