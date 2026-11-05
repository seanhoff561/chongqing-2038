// M10-50 (U-104): the added metal climbing poles are gone; he climbs what the city already has: a tree up its trunk to
// the crown, a vine up a wall, a lamppost up its post to under its camera. Each climbable of those kinds stands on
// its prop, and the bot climbs one of each from its foot to near its top.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { run, settle } from './helpers';
import { climbPole } from './climbbot';
import type { Climbable, Prop } from '../../src/world/world';

const w = getWorld('yuzhong');
/** The prop a climbable is made from, and how far from its line that prop may stand. */
const FROM: Record<string, { props: string[]; d: number }> = {
  tree: { props: ['tree', 'figtree', 'camphor', 'ginkgo'], d: 0.6 },
  post: { props: ['lamppost', 'campole'], d: 0.1 },
  vine: { props: ['vine'], d: 0.3 },
};
/** The props by the metre cell they stand in. */
const cells = new Map<string, Prop[]>();
for (const p of w.props) { const k = `${Math.floor(p.x)},${Math.floor(p.z)}`, a = cells.get(k); if (a) a.push(p); else cells.set(k, [p]); }
const near = (x: number, z: number, d: number, kinds: string[]) => {
  for (let i = Math.floor(x) - 1; i <= Math.floor(x) + 1; i++) for (let j = Math.floor(z) - 1; j <= Math.floor(z) + 1; j++)
    if (cells.get(`${i},${j}`)?.some(p => kinds.includes(p.kind) && Math.hypot(p.x - x, p.z - z) < d)) return true;
  return false;
};
const on = (c: Climbable) => near(c.x, c.z, FROM[c.kind].d, FROM[c.kind].props);
const lamp = (c: Climbable) => c.kind === 'post' && near(c.x, c.z, 0.1, ['lamppost']);

describe('real trees, vines and street poles to climb (M10-50)', () => {
  it('has no added poles: every tree, post and vine he climbs is a prop the city already has', () => {
    expect(w.climbables.some(c => (c.kind as string) === 'pole')).toBe(false);
    expect(w.features.some(f => f.kind === 'pole')).toBe(false);
    const made = w.climbables.filter(c => c.kind in FROM);
    expect(made.filter(c => !on(c))).toEqual([]);
    expect(w.climbables.filter(lamp).length).toBeGreaterThan(200);
  });

  it('climbs a tree, a vine and a lamppost from the foot to near the top', async () => {
    await settle();
    const pick = [w.climbables.find(c => c.kind === 'tree' && on(c))!, w.climbables.find(c => c.kind === 'vine' && on(c))!, w.climbables.find(lamp)!];
    for (const c of pick) {
      const s = createState(1, w);
      s.flags.clear = true;
      teleport(s.player, c.x + c.nx * 0.45, c.y0 - 0.25, c.z + c.nz * 0.45);
      run(s, w, 20);
      expect(climbPole(s, w, c), `${c.kind} at ${c.x.toFixed(0)},${c.z.toFixed(0)}`).toBe(true);
      expect(s.player.pos.y, c.kind).toBeGreaterThan(c.y1 - 3);
    }
  });
});
