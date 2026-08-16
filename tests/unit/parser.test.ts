import { describe, it, expect } from 'vitest';
import { readCollection } from '../../src/defold/parser.js';
import { resolve } from 'node:path';

const FIXTURES = resolve(process.cwd(), 'tests', 'fixtures', 'sample-project');

describe('Defold parser', () => {
  it('reads a collection', async () => {
    const collection = await readCollection(FIXTURES, 'main/main.collection');
    expect(collection).not.toBeNull();
    expect(collection?.gameObjects.length).toBeGreaterThan(0);
    const player = collection?.gameObjects.find((go) => go.id === 'player');
    expect(player).toBeDefined();
    expect(player?.position?.x).toBe(100);
  });
});
