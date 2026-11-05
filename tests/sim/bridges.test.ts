// M6-07, M6-08, M6-19: the two bridges. The Dongshuimen's truss over the Yangtze, its road deck on top and Line 6's rail deck
// inside it; the Qiansimen's span down in the Jialing. He climbs the north pier's ladder from the bank onto the rail
// deck, and crosses the truss from its north end to the Nan'an bank: the stringers walked where the plates are gone,
// the gap jumped, the derailed car climbed over; the run ends there (no machines: this is about the ways). The
// checkpoint on its road deck: in through a scanner gate, over the hoarding, up the hatch from the rail deck, and each
// way in its hazard set off (the gate's scan line, the turrets).
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { raycast } from '../../src/world/geom';
import { TRUSS, at, rail, road } from '../../src/world/yuzhong/bridges';
import { CHECK } from '../../src/world/yuzhong/checkpoint';
import { B, type SimState } from '../../src/sim/types';
import { run, aim, secs, settle, LMB } from './helpers';
import { walk, crossDeck, climbLadder } from './routekit';

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
const go = (s: SimState, pts: V3[]) => walk(s, w, pts);

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
    expect(ladder.y1 - ladder.y0, 'a long climb').toBeGreaterThan(12);
    const s = at0(tp), p = s.player;
    s.flags.god = false;
    expect(climbLadder(s, w, ladder), where(s)).toBe(true);
    expect(s.dead ?? null).toBeNull();
    expect(p.mode, where(s)).toBe('ground');
    expect(Math.abs(p.pos.y - rail(b, b.pier!)), where(s)).toBeLessThan(0.3);
    // In onto the deck through the handrail's gap.
    expect(go(s, [P(b.pier!, 6)]), where(s)).toBe(1);
  });

  it('crosses the truss from its north end to the south bank: the stringers, the gap, the derailed car', async () => {
    await settle();
    const s = at0(w.teleports.find(t => t.name === 'Dongshuimen Bridge: rail deck')!);
    expect(crossDeck(s, w), where(s)).toBe(5);
    expect(s.ended?.route, where(s)).toBe('bridge');
  });
});

describe('the bridge checkpoint (M6-19)', () => {
  const tc = b.checkpoint!, R = (t: number, sv: number): V3 => { const [x, z] = at(b, t, sv); return { x, y: road(b, t), z }; };
  const cam = (kind: string, near: V3, r: number) => w.cameras.map((c, i) => ({ c, i })).filter(({ c }) => c.kind === kind && Math.hypot(c.x - near.x, c.z - near.z) < r).map(({ i }) => i);
  const turrets = cam('turret', R(tc + CHECK.mast, 0), 2);
  /** A run at noon by day, the machines about (he can't die), him at a spot. */
  function live(p: V3) {
    const s = createState(1, w);
    s.time = 12 * 3600; s.flags.clear = true; s.flags.god = true;
    teleport(s.player, p.x, p.y + 0.1, p.z);
    run(s, w, 10);
    return s;
  }
  const most = (s: SimState, cams: number[]) => Math.max(...s.units.filter(u => u.cam !== undefined && cams.includes(u.cam)).map(u => u.aware ?? 0));
  const inside = (s: SimState) => (s.player.pos.x - b.ox) * b.ux + (s.player.pos.z - b.oz) * b.uz > tc + 1;

  it('has the scanner gates, the turret cluster, the military crate and the hatch', () => {
    expect(cam('tripwire', R(tc, 0), 9).length).toBe(2);
    expect(turrets.length).toBe(3);
    const crate = w.inter.find(i => i.id === 'bridge-crate')!;
    expect(crate.kind).toBe('container');
    expect(crate.data?.loot).toBe('armory');
    const h = R(b.hatch! + 0.6, 0);
    expect(raycast(w.index, h.x, h.y + 0.5, h.z, 0, -1, 0, 3), 'a hole in the plate').toBeNull();
  });

  it('in through a scanner gate: upright, its scan line has him; ducked under it, it does not', async () => {
    await settle();
    const gate = cam('tripwire', R(tc, -5), 3);
    for (const [duck, seen] of [[true, false], [false, true]] as const) {
      const s = live(R(tc - 6, -5));
      let top = 0;
      for (let k = 0; k < secs(6) && !inside(s); k++) { run(s, w, 1, { my: 1, yaw: Math.atan2(-b.ux, -b.uz), buttons: duck ? B.CROUCH : 0 }); top = Math.max(top, most(s, gate)); }
      expect(inside(s), `through, ${where(s)}`).toBe(true);
      expect(top >= 1, `ducked ${duck}`).toBe(seen);
    }
  });

  it('in over the hoarding, and the turrets see him', async () => {
    await settle();
    const s = live(R(tc - 3, 10.4)), p = s.player, lip = R(tc, 10.4), tp = lip.y + CHECK.hoarding;
    expect(go(s, [R(tc - 0.8, 10.4)]), where(s)).toBe(1);
    for (let k = 0; k < 40 && p.mode !== 'grip'; k++) { aim(s, lip.x, tp - 0.1, lip.z); run(s, w, 1, { buttons: LMB }); }
    expect(p.mode, where(s)).toBe('grip');
    run(s, w, secs(3), { buttons: LMB, my: 1 });
    expect(go(s, [R(tc + 4, 10.4), R(tc + 5, 3)]), where(s)).toBe(2);
    let top = 0;
    for (let k = 0; k < secs(6); k++) { run(s, w, 1); top = Math.max(top, most(s, turrets)); }
    expect(top, where(s)).toBeGreaterThanOrEqual(1);
  });

  it('in up the hatch from the rail deck, and the turrets see him', async () => {
    await settle();
    const lad = R(b.hatch! + 0.05, 0), ladder = w.climbables.find(c => c.kind === 'ladder' && Math.hypot(c.x - lad.x, c.z - lad.z) < 0.2)!;
    const s = live(P(b.hatch! + 0.7, 0)), p = s.player;
    expect(climbLadder(s, w, ladder), where(s)).toBe(true);
    expect(p.pos.y, where(s)).toBeGreaterThan(road(b, b.hatch!) - 0.3);
    expect(go(s, [R(b.hatch! - 1.5, 0)]), where(s)).toBe(1);
    let top = 0;
    for (let k = 0; k < secs(6); k++) { run(s, w, 1); top = Math.max(top, most(s, turrets)); }
    expect(top, where(s)).toBeGreaterThanOrEqual(1);
  });
});
