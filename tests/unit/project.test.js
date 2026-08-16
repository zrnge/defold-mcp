import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { isDefoldProject, getProjectInfo, parseIni, listProjectFiles } from '../../src/utils/project.js';
const FIXTURES = resolve(process.cwd(), 'tests', 'fixtures', 'sample-project');
describe('project utilities', () => {
    it('detects a Defold project', async () => {
        expect(await isDefoldProject(FIXTURES)).toBe(true);
    });
    it('parses game.project', async () => {
        const info = await getProjectInfo(FIXTURES);
        expect(info.name).toBe('Sample Defold Project');
        expect(info.version).toBe('1.0.0');
        expect(info.bootstrapCollection).toBe('/main/main.collection');
    });
    it('lists project files', async () => {
        const files = await listProjectFiles(FIXTURES, { recursive: true });
        const paths = files.map((f) => f.relativePath);
        expect(paths).toContain('game.project');
        expect(paths).toContain('main/main.collection');
        expect(paths).toContain('player/player.script');
    });
    it('filters by extension', async () => {
        const files = await listProjectFiles(FIXTURES, {
            recursive: true,
            extensions: ['.script'],
        });
        const fileEntries = files.filter((f) => f.type === 'file');
        expect(fileEntries.length).toBeGreaterThan(0);
        expect(fileEntries.every((f) => f.relativePath.endsWith('.script'))).toBe(true);
    });
    it('parses INI contents', () => {
        const parsed = parseIni('[section]\nkey = value\n; comment\n\n[other]\nfoo=bar');
        expect(parsed['section']?.key).toBe('value');
        expect(parsed['other']?.foo).toBe('bar');
    });
});
//# sourceMappingURL=project.test.js.map