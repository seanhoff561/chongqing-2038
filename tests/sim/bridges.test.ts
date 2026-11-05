// M6-07, M6-08: the two bridges. The Dongshuimen's truss over the Yangtze, its road deck on top and Line 6's rail deck
// inside it; the Qiansimen's span down in the Jialing. He climbs the north pier's ladder from the bank onto the rail
// deck, and crosses the truss from its north end to the Nan'an bank: the stringers walked where the plates are gone,
// the gap jumped, the derailed car climbed over; the run ends there. (No machines: this is about the ways.)
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { raycast } from '../../src/world/geom';
import { TRUSS, at, rail, road } from '../../src/world/yuzhong/bridges';
import { B, type SimState } from '../../src/sim/types';
import { run, aim, secs, settle, LMB, RMB } from './helpers';

type V3 = { x: number; y: number; z: number };
const w = getWorld('yuzhong'), [b, q] = w.bridges!, H = TRUSS.half;
const P = (t: number, s: number): V3 => { const [x, z] = at(b, t, s); return { x, y: rail(b, t), z }; };
/** The top of what's under a point, within 3 m under `y`. */
const top = (x: number, y: number, z: number) => { const h = raycast(w.index, x, y + 0.5, z, 0, -1, 0, 3.5); return h ? y + 0.5 - h.t : null; };
const where = (s: SimState) => `at t ${((s.player.pos.x - b.ox) * b.ux + (s.player.pos.z - b.oz) * b.uz).toFixed(1)} y ${s.player.pos.y.toFixed(1)} ${s.player.mode}`;

/** A run with no machines, him standing at a spot. */
function at0(p: V3) {
  const s = createState(1, w);
  s.units.length = 0; s.flags.clear = true; s.flags.god = true;
  teleport(s.player, p.x, p.y + 0.1, p.z);
  run(s, w, 10);
  return s;
}
/** Walk him to each point in turn (sprinting if asked), hopping when he's stopped against something. */
function go(s: SimState, pts: V3[], buttons = 0): number {
  const p = s.player;
  for (let i = 0; i < pts.length; i++) {
    const g = pts[i];
    let still = 0, last = { ...p.pos };
    const until = secs(30 + Math.hypot(g.x - p.pos.x, g.z - p.pos.z) / 2);
    for (let k = 0; k < until && Math.hypot(g.x - p.pos.x, g.z - p.pos.z) > 0.6 && !s.ended; k++) {
      const hop = still > 30 && still % 40 < 2;
      run(s, w, 1, { my: 1, yaw: Math.atan2(-(g.x - p.pos.x), -(g.z - p.pos.z)), buttons: buttons | (hop ? B.JUMP : 0), pressed: hop ? B.JUMP : 0 });
      if (Math.hypot(p.pos.x - last.x, p.pos.z - last.z) < 0.02) still++; else { still = 0; last = { ...p.pos }; }
    }
    if (s.ended) return pts.length;
    if (Math.hypot(g.x - p.pos.x, g.z - p.pos.z) > 1) return i;
  }
  return pts.length;
}

describe('the bridges (M6-07, M6-08)', () => {
  it("has the Dongshuimen's truss over the Yangtze, its road deck and rail deck, and the Qiansimen's span fallen", () => {
    const [r0, r1] = b.river;
    expect(r1 - r0).toBeGreaterThan(400);
    expect(b.pylons.length).toBe(2);
    // Over the river, every 10 m but at its holes: the rail deck's floor, the road's plate 8 m over it.
    for (let t = r0; t < r1; t += 10) {
      if (b.holes!.some(([h0, h1]) => t > h0 - 1 && t < h1 + 1) || (t > b.car! - 1 && t < b.car! + 12)) continue;
      const [x, z] = at(b, t, -6), fl = top(x, rail(b, t), z), rd = top(x, road(b, t), z);
      expect(fl !== null && Math.abs(fl - rail(b, t)) < 0.15, `rail deck at ${t}`).toBe(true);
      expect(rd !== null && Math.abs(rd - road(b, t)) < 0.15, `road at ${t}`).toBe(true);
    }
    // The Qiansimen: nothing at either deck's level in its fallen span.
    const mid = (q.fallen![0] + q.fallen![1]) / 2, [x, z] = at(q, mid, 0);
    expect(raycast(w.index, x, road(q, mid) + 1, z, 0, -1, 0, 20)).toBeNull();
  });

  it("climbs the north pier's ladder from the bank onto the rail deck", async () => {
    await settle();
    const tp = w.teleports.find(t => t.name === 'Dongshuimen Bridge: north pier')!, [lx, lz] = at(b, b.pier!, H + 0.05);
    const ladder = w.climbables.find(c => c.kind === 'ladder' && Math.hypot(c.x - lx, c.z - lz) < 0.2)!;
    expect(ladder.y1 - ladder.y0, 'a long climb').toBeGreaterThan(20);
    const s = at0(tp), p = s.player, bits = [LMB, RMB];
    teleport(p, ladder.x + ladder.nx * 0.7, p.pos.y + 0.01, ladder.z + ladder.nz * 0.7);
    run(s, w, 5);
    let hand = 0;
    for (let k = 0; k < 400 && (p.mode !== 'ground' || k === 0); k++) {
      const holding = p.hands.reduce((a, h, i) => a | (h.grip ? bits[i] : 0), 0);
      aim(s, ladder.x + ladder.nx * 0.08, Math.min(ladder.y1 - 0.05, p.pos.y + 2.2), ladder.z + ladder.nz * 0.08);
      run(s, w, 2, { buttons: holding | bits[hand] });
      run(s, w, secs(1), { buttons: bits[hand], my: 1 });
      hand = 1 - hand;
      if (p.mode === 'action') run(s, w, secs(1));
    }
    expect(p.mode, where(s)).toBe('ground');
    expect(Math.abs(p.pos.y - rail(b, b.pier!)), where(s)).toBeLessThan(0.3);
    // In onto the deck through the handrail's gap.
    expect(go(s, [P(b.pier!, 6)]), where(s)).toBe(1);
  });

  it('crosses the truss from its north end to the south bank: the stringers, the gap, the derailed car', async () => {
    await settle();
    const s = at0(w.teleports.find(t => t.name === 'Dongshuimen Bridge: rail deck')!), [a0, a1] = b.holes![0], [g0, g1] = b.holes![1], c = b.car!;
    // Up the deck and along a stringer where the plates are gone.
    expect(go(s, [P(a0 - 6, -2.6), P(a0 - 1, -2.6), P(a1 + 3, -2.6), P(g0 - 30, -5)]), where(s)).toBe(4);
    // A run and a jump across the gap.
    const p = s.player;
    for (let k = 0; k < secs(10) && (p.pos.x - b.ox) * b.ux + (p.pos.z - b.oz) * b.uz < g0 - 0.3; k++) run(s, w, 1, { my: 1, yaw: Math.atan2(-b.ux, -b.uz), buttons: B.SPRINT });
    run(s, w, 1, { my: 1, yaw: Math.atan2(-b.ux, -b.uz), buttons: B.SPRINT | B.JUMP, pressed: B.JUMP });
    run(s, w, secs(1.5), { my: 1, yaw: Math.atan2(-b.ux, -b.uz), buttons: B.SPRINT | B.JUMP });
    expect(Math.abs(p.pos.y - rail(b, g1)), where(s)).toBeLessThan(0.5);
    // Up onto the derailed car (its lip grabbed, pulled up and over), along it, down, and on to the Nan'an end.
    expect(go(s, [P(c - 3, -5), P(c - 0.9, -5)]), where(s)).toBe(2);
    const lip = P(c, -5), top = lip.y + 2;
    for (let k = 0; k < 40 && p.mode !== 'grip'; k++) { aim(s, lip.x, top - 0.1, lip.z); run(s, w, 1, { buttons: LMB }); }
    expect(p.mode, where(s)).toBe('grip');
    run(s, w, secs(3), { buttons: LMB, my: 1 });
    expect(p.pos.y, where(s)).toBeGreaterThan(top - 0.2);
    expect(go(s, [P(c + 5, -5), P(c + 15, -5), P(b.tb - 2, -5)]), where(s)).toBe(3);
    expect(s.ended?.route, where(s)).toBe('bridge');
  });
});
