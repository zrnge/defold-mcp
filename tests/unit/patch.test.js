import { describe, it, expect } from 'vitest';
import { applyPatch } from '../../src/utils/patch.js';
describe('applyPatch', () => {
    it('replaces exact text', () => {
        const result = applyPatch('local speed = 100', {
            path: 'player.script',
            operation: 'replace',
            oldText: 'local speed = 100',
            newText: 'local speed = 200',
        });
        expect(result.success).toBe(true);
        expect(result.data).toBe('local speed = 200');
    });
    it('fails when oldText is missing', () => {
        const result = applyPatch('local speed = 100', {
            path: 'player.script',
            operation: 'replace',
            oldText: 'missing',
            newText: 'x',
        });
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('PATCH_FAILED');
    });
    it('reports ambiguous matches', () => {
        const result = applyPatch('a\na\na', {
            path: 'x',
            operation: 'replace',
            oldText: 'a',
            newText: 'b',
        });
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('AMBIGUOUS_PATCH');
    });
    it('replaces a line range', () => {
        const result = applyPatch('line1\nline2\nline3', {
            path: 'x',
            operation: 'replace_lines',
            startLine: 2,
            endLine: 2,
            newText: 'replaced',
        });
        expect(result.success).toBe(true);
        expect(result.data).toBe('line1\nreplaced\nline3');
    });
    it('inserts after text', () => {
        const result = applyPatch('function init(self)\nend', {
            path: 'x',
            operation: 'insert_after',
            oldText: 'function init(self)',
            newText: '    print("init")',
        });
        expect(result.success).toBe(true);
        expect(result.data).toBe('function init(self)\n    print("init")\nend');
    });
    it('validates Lua block balance', async () => {
        const { validateLuaSyntaxLightweight } = await import('../../src/utils/patch.js');
        const diagnostics = validateLuaSyntaxLightweight('function init(self)\nend\nend');
        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0]?.severity).toBe('error');
    });
});
//# sourceMappingURL=patch.test.js.map