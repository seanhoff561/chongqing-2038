// M4-95 (U-069): spider robots live in the sewers, a handful in every district's, patrolling the runs underground; one
// that comes on him down there sees him and goes for him, its prod fast and painful close.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { unitPose } from '../../src/sim/units';
import { teleport } from '../../src/sim/player';
import { heightAt } from '../../src/world/heightfield';
import { run, secs } from './helpers';

const w = getWorld('yuzhong');

describe('spider robots in the sewers (M4-95)', () => {
  it('patrol every district\'s sewers underground and go for him there', () => {
    const beats = w.patrols.map((p, i) => ({ p, i })).filter(({ p }) => p.unit === 'crawler' && p.kind === 'under');
    expect(beats.length).toBeGreaterThanOrEqual(25);
    for (const { p } of beats) expect(p.pts[0].y).toBeLessThan((heightAt(w.ground!, p.pts[0].x, p.pts[0].z) ?? Infinity) - 3);
    // He's down a run, a few metres ahead of one.
    const s = createState(1, w), { i } = beats[0], u = s.units.find(x => x.patrol === i && !x.extra)!;
    s.flags.clear = true; s.time = 12 * 3600;
    const q = unitPose(w, u, s.time), p = w.patrols[i].pts, ahead = p.find(t => Math.hypot(t.x - q.x, t.z - q.z) > 4) ?? p[2], d = Math.hypot(ahead.x - q.x, ahead.z - q.z);
    const at = { x: q.x + ((ahead.x - q.x) / d) * 4, y: q.y, z: q.z + ((ahead.z - q.z) / d) * 4 };
    teleport(s.player, at.x, at.y + 0.05, at.z);
    let hurt = 0;
    run(s, w, secs(12), {}, st => { hurt += st.events.filter(e => e.t === 'hurt' && e.cause === 'prod').length; st.body.hp = 100; });
    expect(u.aware ?? 0).toBeGreaterThanOrEqual(0.3);
    expect(hurt).toBeGreaterThan(0);
  });
});
