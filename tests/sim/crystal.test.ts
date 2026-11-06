// M6-18: the Raffles drone hub in The Crystal (yuzhong/hub.ts, sim/crystal.ts). Its four ways in, each taken on his
// own legs and hands: up T2's fire stair from its door at the tower's foot; up T5's freight lift; up T3S's face in the
// window-cleaning gondola to the roof terrace and in at the service door (shouldered); from the terrace up the ladder
// onto The Crystal's roof, along it to the drones' hatch, down onto the gantry and its stair to the hall. Its tier 4
// loot with the second spare HV fuse. And its hazards set off: a gust on the roof walks him off his line upright (not
// crouched), off the edge by it; a pane of the glass floor gives him away (its beams don't).
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { syncWorld } from '../../src/sim/doors';
import { addItem } from '../../src/sim/inventory';
import { gustAt, onPane } from '../../src/sim/crystal';
import { SCALE } from '../../src/sim/clock';
import { districtOf } from '../../src/sim/district';
import { RAFFLES } from '../../src/world/yuzhong/raffles';
import { HUB } from '../../src/world/yuzhong/hub';
import { B, type SimState } from '../../src/sim/types';
import { walk, standBy, hold } from './routekit';
import { run, secs } from './helpers';

type P = { x: number; y: number; z: number };
const w = getWorld('yuzhong'), all = (k: string) => w.features.filter(f => f.kind === k).sort((a, b) => a.group - b.group), one = (k: string) => all(k)[0];
const c = one('crystal'), Y = c.y, N = { x: -c.nz!, z: c.nx! };
/** A point in The Crystal's frame (t along, s across it, south +). */
const at = (t: number, s: number, y = Y): P => ({ x: c.x + c.nx! * t - c.nz! * s, y, z: c.z + c.nz! * t + c.nx! * s });
const T = (q: P) => (q.x - c.x) * c.nx! + (q.z - c.z) * c.nz!, S = (q: P) => (q.x - c.x) * N.x + (q.z - c.z) * N.z;
const where = (s: SimState) => `at ${s.player.pos.x.toFixed(1)},${s.player.pos.y.toFixed(1)},${s.player.pos.z.toFixed(1)} (${s.player.mode})`;

/** A run at noon with the machines away, him at a spot with a crowbar. */
function live(p: P) {
  const s = createState(5, w);
  s.flags.clear = true; s.flags.god = true; s.time = 12 * 3600;
  for (const u of s.units) u.off = Infinity;
  addItem(s, s.inv.pack, 'crowbar', 1);
  syncWorld(s, w);
  teleport(s.player, p.x, p.y + 0.1, p.z);
  run(s, w, 30);
  return s;
}
/** E held on an interactable till it's done. */
function work(s: SimState, id: string, t: number) {
  const it = w.inter.find(i => i.id === id)!;
  expect(standBy(s, w, it.x, it.y, it.z, undefined, undefined, Math.max(0.5, it.r)), `by ${id}`).toBe(true);
  hold(s, w, t + 1);
}
const inCrystal = (s: SimState) => Math.abs(s.player.pos.y - Y) < 0.5 && Math.abs(S(s.player.pos)) < RAFFLES.half;

describe('the Raffles drone hub (M6-18)', () => {
  it('has four ways in, its heart, and tier 4 loot with the second spare HV fuse', () => {
    for (const k of ['in:hub:stair', 'in:hub:lift', 'in:hub:door', 'in:hub:hatch', 'heart:hub']) expect(one(k), k).toBeTruthy();
    const bins = w.inter.filter(i => i.kind === 'container' && i.id.startsWith('hub-'));
    expect(bins.filter(i => i.data?.tier === 4).length).toBeGreaterThanOrEqual(4);
    expect(bins.find(i => i.id === 'hub-spares')!.data!.items).toEqual([['hvfuse', 1]]);
    expect(w.cameras.some(q => q.kind === 'camera' && Math.hypot(q.x - w.inter.find(i => i.id === 'hub-lift')!.x, q.z - w.inter.find(i => i.id === 'hub-lift')!.z) < 3), "the lift car's camera").toBe(true);
  });

  it("in up T2's fire stair, from its door at the tower's foot to The Crystal, 250 m up", () => {
    const s = live(one('out:hub:stair')), way = all('hub:stair');
    expect(way.length).toBeGreaterThan(200);
    work(s, 'raffles-t2-stair', 2);
    expect(walk(s, w, way.slice(0, 1)), where(s)).toBe(1);
    expect(walk(s, w, way, B.SPRINT), where(s)).toBe(way.length);
    work(s, 'raffles-t2-stairhead', 2);
    expect(walk(s, w, [one('in:hub:stair')]), where(s)).toBe(1);
    expect(inCrystal(s), where(s)).toBe(true);
  }, 600000);

  it("in up T5's freight lift to the loading bay", () => {
    const s = live(one('out:hub:lift'));
    work(s, 'raffles-t5-lift', 2);
    work(s, 'hub-lift', HUB.lift);
    expect(Math.hypot(s.player.pos.x - one('in:hub:lift').x, s.player.pos.z - one('in:hub:lift').z), where(s)).toBeLessThan(1.5);
    expect(inCrystal(s), where(s)).toBe(true);
  }, 300000);

  it('in by the gondola up T3S to its roof terrace, and the service door shouldered', () => {
    const s = live(w.inter.find(i => i.id === 'hub-gondola')!);
    work(s, 'hub-gondola', HUB.gondola);
    expect(s.player.pos.y, where(s)).toBeGreaterThan(Y - 0.5);
    const d = w.inter.find(i => i.id === 'hub-service')!, side = Math.sign(S(d));
    expect(walk(s, w, [at(T(d), side * (RAFFLES.half + 1.2))]), where(s)).toBe(1);
    work(s, 'hub-service', 2);
    expect(s.wstate.open['hub-service']).toBe(true);
    expect(walk(s, w, [one('in:hub:door')]), where(s)).toBe(1);
    expect(inCrystal(s), where(s)).toBe(true);
  }, 300000);

  it("in from the roof: up the stair from the terrace, along it in the wind, down through the drones' hatch", () => {
    const s = live(one('hub:terrace')), up = all('hub:roofstair');
    expect(walk(s, w, up), where(s)).toBe(up.length);
    expect(walk(s, w, [one('hub:roof')]), where(s)).toBe(1);
    expect(s.player.pos.y, where(s)).toBeGreaterThan(Y + RAFFLES.tall);
    // Crouched along the roof's spine, then to the hatch and in.
    const h = one('hub:hatch');
    expect(walk(s, w, [at(T(s.player.pos), 0, h.y), at(T(h), 0, h.y), h], B.CROUCH), where(s)).toBe(3);
    const g = one('in:hub:hatch');
    // (Upright for the last step: crouched he stops at an edge.)
    walk(s, w, [g]);
    run(s, w, secs(2));
    expect(Math.abs(s.player.pos.y - g.y), where(s)).toBeLessThan(0.5);
    expect(walk(s, w, all('hub:gantry')), where(s)).toBe(all('hub:gantry').length);
    expect(inCrystal(s), where(s)).toBe(true);
  }, 300000);

  it('blows him about in the gusts on the roof: walked across it upright, held crouched, warned first; off the edge', () => {
    const top = Y + RAFFLES.tall + 0.4, mid = 0;
    /** From just before a gust's warning till it's blown over: how far north it took him, and whether he was warned. */
    const gust = (buttons: number, s0: number) => {
      const s = live(at(60, s0, top)), G = HUB.gust;
      const n = Math.ceil(s.time / SCALE / G.every) + 1;
      s.time = (n * G.every - G.warn - 0.5) * SCALE;
      run(s, w, 2, { buttons });
      const from = S(s.player.pos), y0 = s.player.pos.y;
      let warned = false;
      for (let k = 0; k < secs(G.warn + G.last + 2); k++) { run(s, w, 1, { buttons }); warned ||= s.events.some(e => e.t === 'sfx' && e.id === 'gust'); }
      return { moved: S(s.player.pos) - from, warned, fell: y0 - s.player.pos.y };
    };
    expect(gustAt(0).now).toBe('gust');
    const up = gust(0, mid), low = gust(B.CROUCH, mid);
    expect(up.warned).toBe(true);
    expect(up.moved, 'upright').toBeGreaterThan(2);
    expect(Math.abs(low.moved), 'crouched').toBeLessThan(0.5);
    expect(gust(0, RAFFLES.half - 1.5).fell, 'off the edge').toBeGreaterThan(5);
  }, 300000);

  it("gives him away on a glass pane, not along a beam", () => {
    const [g0, g1] = all('crystal:glass').map(q => T(q)), beam = -RAFFLES.half + 5 * HUB.pane;
    const cross = (s0: number) => {
      const s = live(at(g0 - 2, s0)), k = districtOf(s.player.pos.x, s.player.pos.z);
      expect(walk(s, w, [at(g1 + 2, s0)]), where(s)).toBe(1);
      return s.hive.districts[k]?.state ?? 'unaware';
    };
    expect(onPane(w, at(g0 + 1.5, beam + 1.5).x, Y, at(g0 + 1.5, beam + 1.5).z)).toBe(true);
    expect(onPane(w, at(g0 + 1.5, beam).x, Y, at(g0 + 1.5, beam).z)).toBe(false);
    expect(cross(beam), 'along a beam').toBe('unaware');
    expect(cross(beam + 1.5), 'over the panes').toBe('searching');
  }, 300000);
});
