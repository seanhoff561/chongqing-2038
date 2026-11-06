import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
// @ts-expect-error: plain JS, run as it is in the browser check too
import { worldHash } from '../worldhash.mjs';

// The city the tests walk is the one players get: seed 1's city hashed here in Node is kept in tests/worldhash.json,
// and tests/e2e/samecity.e2e.mjs hashes the city Chrome builds against it. (A change to the city changes the hash:
// once it's meant, `npx vitest run -u tests/sim/samecity.seeds.slow.test.ts` keeps the new one.)
describe('the city built in Node', () => {
  it("is seed 1's city as kept for the browser check", async () => {
    const w = getWorld('yuzhong', 1), n = w.solids.length;
    await expect(`${JSON.stringify({ seed: 1, solids: n, hash: worldHash(w, n) })}\n`).toMatchFileSnapshot('../worldhash.json');
  }, 900000);
});
