import { describe, it, expect } from 'vitest';
import { parseBuildOutput } from '../../src/defold/build.js';

describe('build output parser', () => {
  it('parses Lua error lines', () => {
    const output = 'player/player.script:42: attempt to index nil\nmain/main.script:10:5: syntax error near \')\'';
    const diagnostics = parseBuildOutput(output);
    expect(diagnostics.length).toBe(2);
    expect(diagnostics[0]?.file).toBe('player/player.script');
    expect(diagnostics[0]?.line).toBe(42);
    expect(diagnostics[1]?.column).toBe(5);
  });

  it('classifies warnings', () => {
    const diagnostics = parseBuildOutput('main/main.script:3: warning: unused variable');
    expect(diagnostics[0]?.severity).toBe('warning');
  });
});
