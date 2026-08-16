import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { detectDefoldEngine } from '../../src/utils/project.js';
import { buildProject } from '../../src/defold/build.js';
import { getProjectInfo } from '../../src/utils/project.js';

const FIXTURES = resolve(process.cwd(), 'tests', 'fixtures', 'sample-project');

describe('Defold engine integration', () => {
  it('detects whether Defold is available', async () => {
    const engine = await detectDefoldEngine();
    // This test is informational; it should not fail if Defold is absent.
    expect(typeof engine.available).toBe('boolean');
  });

  it('builds the fixture project only if Defold is installed', async () => {
    const info = await getProjectInfo(FIXTURES);
    const result = await buildProject(FIXTURES, info.defold, {
      platform: 'desktop',
      configuration: 'debug',
    });
    if (info.defold?.available) {
      expect(result.exitCode).toBe(0);
    } else {
      expect(result.exitCode).not.toBe(0);
      expect(result.diagnostics.some((d) => d.message.includes('Defold was not detected'))).toBe(true);
    }
  });
});
