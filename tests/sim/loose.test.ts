// U-085: homes hold more (the chosen container rolls more and the rest now and then hold one thing left behind), and
// now and then something lies loose on a room's floor, rolled for the run as he comes near and there to pick up.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { rollLoot } from '../../src/sim/loot';
import { grid } from '../../src/sim/inventory';
import { teleport } from '../../src/sim/player';
import { LEFTOVER, LOOSE } from '../../src/data/loot';
import { run } from './helpers';

const w = getWorld('yuzhong');

describe('loot in homes (U-085)', () => {
  it('leaves one thing now and then in the containers not chosen for loot', () => {
    const s = createState(3, w), rest = w.inter.filter(i => i.kind === 'container' && !i.data?.loot && LEFTOVER.of[i.data?.type as string]).slice(0, 400);
    const held = rest.filter(i => { s.containers[i.id] = grid(5, 4); rollLoot(s, i); return s.containers[i.id].items.length > 0; }).length;
    expect(held / rest.length).toBeGreaterThan(LEFTOVER.chance - 0.08);
    expect(held / rest.length).toBeLessThan(LEFTOVER.chance + 0.08);
  });
  it('lays things loose on room floors near him, each spot rolled once', () => {
    const spots = w.features.filter(f => f.kind.startsWith('loose:'));
    expect(spots.length).toBeGreaterThan(300);
    const s = createState(3, w), f = spots[Math.floor(spots.length / 2)];
    s.flags.god = true; s.flags.clear = true;
    teleport(s.player, f.x, f.y, f.z);
    run(s, w, 31);
    const near = spots.filter(q => Math.hypot(q.x - f.x, q.z - f.z) <= LOOSE.near).length, got = s.dropped.filter(d => d.loose);
    expect(Object.keys(s.wstate.loose ?? {}).length).toBe(near);
    expect(got.every(d => Math.hypot(d.x - f.x, d.z - f.z) <= LOOSE.near + 0.1)).toBe(true);
    if (near >= 6) expect(got.length).toBeGreaterThan(0);
    run(s, w, 60);
    expect(s.dropped.filter(d => d.loose).length).toBe(got.length);
  });
});
