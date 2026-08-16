import { describe, it, expect, beforeAll } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join, resolve, normalize } from 'node:path';
import { createPathResolver } from '../../src/security/paths.js';
const TEST_ROOT = normalize(resolve(process.cwd(), 'tests', 'tmp', 'security-root'));
beforeAll(async () => {
    await rm(TEST_ROOT, { recursive: true, force: true });
    await mkdir(join(TEST_ROOT, 'sub'), { recursive: true });
    await writeFile(join(TEST_ROOT, 'sub', 'file.txt'), 'hello');
});
describe('createPathResolver', () => {
    it('resolves a relative path inside the project', async () => {
        const resolver = createPathResolver(TEST_ROOT);
        const result = await resolver.resolveProjectPath('sub/file.txt');
        expect(result.success).toBe(true);
        expect(result.data?.toLowerCase()).toBe(join(TEST_ROOT, 'sub', 'file.txt').toLowerCase());
    });
    it('rejects path traversal', async () => {
        const resolver = createPathResolver(TEST_ROOT);
        const result = await resolver.resolveProjectPath('../outside.txt');
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('PATH_TRAVERSAL');
    });
    it('rejects absolute paths outside the project', async () => {
        const resolver = createPathResolver(TEST_ROOT);
        const result = await resolver.resolveProjectPath('C:\\Windows\\System32');
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('PATH_TRAVERSAL');
    });
    it('allows the project root itself', async () => {
        const resolver = createPathResolver(TEST_ROOT);
        const result = await resolver.resolveProjectPath('.');
        expect(result.success).toBe(true);
        expect(result.data?.toLowerCase()).toBe(TEST_ROOT.toLowerCase());
    });
});
//# sourceMappingURL=security.test.js.map