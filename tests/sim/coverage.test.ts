// M6-23: the coverage tool over a game day: each high-security site's approaches (the teleports outside its ways in,
// M6-25) and when nothing's watching each; every site has an approach with an unwatched window of 10 s or more.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { unwatched, longest } from '../../src/sim/coverage';
import { SECURE } from '../../src/world/yuzhong/secure';

const w = getWorld('yuzhong');

describe('the coverage tool (M6-23)', () => {
  it('finds, for every high-security site, an approach unwatched for 10 s or more in a day', () => {
    const s = createState(3, w), lines: string[] = [];
    // (Its machines out on their beats: none sent anywhere.)
    for (const site of w.secure!) {
      const en = SECURE.find(q => q.id === site.id)!.en, best = w.teleports.filter(t => t.name.startsWith(`${en}:`)).map(t => {
        const ws = unwatched(s, w, t, 6 * 3600, 2);
        return { name: t.name, best: longest(ws), n: ws.length };
      });
      lines.push(...best.map(b => `${b.name}: longest ${b.best} s in ${b.n} windows`));
      expect(Math.max(...best.map(b => b.best)), `${site.id}: ${best.map(b => `${b.name} ${b.best}`).join(', ')}`).toBeGreaterThanOrEqual(10);
    }
    console.log(lines.join('\n'));
  }, 600000);
});
