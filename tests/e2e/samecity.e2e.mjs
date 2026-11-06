// The city Chrome builds is the one the tests walk in Node: seed 1's, hashed in the page against the hash Node gave
// (tests/sim/samecity.seeds.slow.test.ts keeps it in tests/worldhash.json). Engines' Math.sin and the rest differ in the
// last bit; the city is built with src/world/trig.ts so it doesn't.
import fs from 'fs';
import { worldHash } from '../worldhash.mjs';

export default async function ({ open, fail }) {
  const want = JSON.parse(fs.readFileSync(new URL('../worldhash.json', import.meta.url), 'utf8'));
  const page = await open(`?scenario=yuzhong&seed=${want.seed}`, 'samecity');
  const got = await page.evaluate(`(${worldHash})(window.__cq.game.world, ${want.solids})`);
  if (got !== want.hash) fail('samecity', `seed ${want.seed}'s city hashes ${got} in Chrome, ${want.hash} in Node`);
  await page.close();
}
