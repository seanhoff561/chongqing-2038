// M6-21: the city's tunnels. The air-raid tunnels across the districts, the hospital's basement link and the telecom
// exchange's cable tunnel off Jiaochangkou's station hall, Line 1's tunnels and Line 6's east toward the Dongshuimen
// Bridge, the flood culvert; and a walk on foot under the ground from the start hideout (by its one vent, U-047) to
// Xiaoshizi. No machines: this is about the ways.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { heightAt } from '../../src/world/heightfield';
import { districtAt } from '../../src/world/yuzhong/lots';
import { addItem } from '../../src/sim/inventory';
import { RUBBLE } from '../../src/sim/doors';
import { GRATE } from '../../src/sim/grate';
import { B, type SimState } from '../../src/sim/types';
import { run, aim, secs, settle, LMB, RMB } from './helpers';

type V3 = { x: number; y: number; z: number };
const w = getWorld('yuzhong'), g = w.ground!;
const where = (s: SimState) => `at ${s.player.pos.x.toFixed(1)},${s.player.pos.y.toFixed(1)},${s.player.pos.z.toFixed(1)} ${s.player.mode} ${s.dead || ''}`;
const path = (kind: string) => w.features.filter(f => f.kind === kind).sort((a, b) => a.group - b.group);
/** Under the ground: well under its surface, or where it's holed (a basement, a shaft) under a building's floor. */
const under = (p: V3) => { const h = heightAt(g, p.x, p.z); return h === null || p.y < h - 2; };

/** Walk him along the points (holding `hold`, e.g. crouched), each to within half a metre (a metre to give up), checking `each` as he goes. */
function go(s: SimState, pts: V3[], hold = 0, each?: (p: V3) => void): number {
  const p = s.player;
  for (let i = 0; i < pts.length; i++) {
    const q = pts[i];
    let still = 0, last = { ...p.pos };
    const until = secs(20 + Math.hypot(q.x - p.pos.x, q.z - p.pos.z));
    for (let t = 0; t < until && (Math.hypot(q.x - p.pos.x, q.z - p.pos.z) > 0.5 || Math.abs(q.y - p.pos.y) > 2); t++) {
      const hop = still > 30 && still % 40 < 2;
      run(s, w, 1, { my: 1, yaw: Math.atan2(-(q.x - p.pos.x), -(q.z - p.pos.z)), buttons: hold | (hop ? B.JUMP : 0), pressed: hop ? B.JUMP : 0 });
      if (Math.hypot(p.pos.x - last.x, p.pos.z - last.z) < 0.02) still++; else { still = 0; last = { ...p.pos }; }
      if (t % 30 === 0) each?.(p.pos);
    }
    if (Math.hypot(q.x - p.pos.x, q.z - p.pos.z) > 1 || Math.abs(q.y - p.pos.y) > 2) return i;
  }
  return pts.length;
}
/** A run's state at a spot, nothing about. */
function at(q: V3) {
  const s = createState(1, w);
  s.units.length = 0; s.flags.clear = true;
  teleport(s.player, q.x, q.y + 0.05, q.z);
  run(s, w, 10);
  return s;
}

describe('the city tunnels (M6-21)', () => {
  it('has the air-raid tunnels across three districts, Line 1 under Jiaochangkou and on from Jiefangbei, the flood culvert', () => {
    const route = path('underRoute'), ds = new Set(route.map(q => districtAt(q.x, q.z).district));
    for (const d of ['jiaochangkou', 'jiefangbei', 'xiaoshizi']) expect(ds.has(d), d).toBe(true);
    expect(w.features.some(f => f.kind === 'in:gt:entrance' && districtAt(f.x, f.z).district === 'shibati')).toBe(true);
    expect(w.features.filter(f => f.kind === 'station').length).toBeGreaterThanOrEqual(3);
    // The flood culvert: standing water along it, under the hill.
    const fc = w.features.find(f => f.kind === 'flood:culvert')!;
    expect(fc).toBeTruthy();
    expect(w.water.some(b => fc.x > b.x0 && fc.x < b.x1 && fc.z > b.z0 && fc.z < b.z1 && b.y1 > fc.y + 0.3)).toBe(true);
    expect(under(fc)).toBe(true);
  });

  for (const [name, site] of [['link:telecom', 'Telecom exchange'], ['link:hospital', 'Yuzhong Hospital']] as const) it(`walks ${name.slice(5)}'s tunnel from Jiaochangkou's station hall to the foot of its basement shaft, under the ground all the way`, () => {
    const pts = path(name), s = at(pts[0]);
    let above = 0;
    expect(go(s, pts.slice(1), 0, p => { if (!under(p)) above++; }), where(s)).toBe(pts.length - 1);
    expect(above).toBe(0);
    // At the foot of the site's basement shaft, its ladder up to the manhole.
    const tp = w.teleports.find(t => t.name === `${site}: basement`)!;
    expect(Math.hypot(tp.x - s.player.pos.x, tp.z - s.player.pos.z)).toBeLessThan(2.5);
    expect(s.dead).toBeFalsy();
  });

  it("walks Line 6's tunnel from Xiaoshizi's hall east to its shutter, toward the bridge", () => {
    const portal = w.features.find(f => f.kind === 'line6:portal')!, xs = w.teleports.find(t => t.name === 'Underground Xiaoshizi')!;
    expect(portal.x - xs.x).toBeGreaterThan(80);
    const s = at({ x: xs.x + 6, y: portal.y, z: portal.z - 4.5 });
    expect(go(s, [{ x: portal.x - 3, y: portal.y, z: portal.z - 4.5 }]), where(s)).toBe(1);
    expect(under(s.player.pos)).toBe(true);
  });

  it('walks from the start hideout to Xiaoshizi under the ground: the rubble cleared, the vent, its ladder and grate, the old tunnels, the city and the metro', async () => {
    await settle();
    const s = createState(1, w), p = s.player, plug = w.inter.find(i => i.id === 'airraid-plug')!, vent = w.inter.find(i => i.id === 'airraid-vent')!;
    s.units.length = 0; s.flags.clear = true;
    addItem(s, s.inv.pack, 'crowbar', 1);
    run(s, w, 10);
    let above = 0;
    const each = (q: V3) => { if (!under(q)) above++; };
    // Past the shaft's foot to the rubble, cleared with the crowbar.
    expect(go(s, path('homeExit').slice(0, 1), 0, each), where(s)).toBe(1);
    aim(s, plug.x, plug.y, plug.z);
    run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT });
    for (let t = 0; t < secs(RUBBLE.clear + 0.5) && !s.wstate.open[plug.id]; t++) run(s, w, 1, { buttons: B.INTERACT });
    expect(s.wstate.open[plug.id]).toBe(true);
    // Along the old way out into the vent, crouched along it to the shaft's foot.
    expect(go(s, path('homeExit').slice(1, 3), 0, each), where(s)).toBe(2);
    expect(go(s, path('homeVent'), B.CROUCH, each), where(s)).toBe(3);
    // Up its ladder hand over hand (as tests/sim/home.test.ts) to the grate, lifted, and out onto the junction room's floor.
    const ladder = w.climbables.find(c => c.kind === 'ladder' && Math.hypot(c.x - vent.x, c.z - vent.z) < 1.5)!, bits = [LMB, RMB];
    teleport(p, ladder.x + ladder.nx * 0.7, p.pos.y + 0.01, ladder.z + ladder.nz * 0.7);
    run(s, w, 5);
    const holding = () => p.hands.reduce((a, h, i) => a | (h.grip ? bits[i] : 0), 0);
    let hand = 0, last = -1;
    for (let k = 0; k < 60; k++) {
      aim(s, ladder.x + ladder.nx * 0.08, Math.min(vent.y - 0.2, p.pos.y + 2.2), ladder.z + ladder.nz * 0.08);
      run(s, w, 2, { buttons: holding() | bits[hand] });
      run(s, w, secs(0.8), { buttons: bits[hand], my: 1 });
      hand = 1 - hand;
      if (p.mode === 'grip' && Math.abs(p.pos.y - last) < 0.02) break;
      last = p.pos.y;
    }
    expect(p.pos.y).toBeGreaterThan(vent.y - 3);
    const keep = holding();
    aim(s, vent.x, vent.y, vent.z);
    run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT | keep });
    for (let i = 0; i < secs(GRATE.lift + 0.5) && !s.wstate.open[vent.id]; i++) run(s, w, 1, { buttons: B.INTERACT | keep });
    expect(s.wstate.open[vent.id]).toBe(true);
    for (let k = 0; k < 6 && p.mode !== 'ground'; k++) run(s, w, secs(0.5), { buttons: keep, my: 1, pressed: B.JUMP });
    run(s, w, secs(1));
    expect(p.pos.y).toBeGreaterThan(vent.y - 0.1);
    // On from the junction room along the underground's way to Xiaoshizi's station.
    const route = path('underRoute'), from = route.findIndex(q => Math.hypot(q.x - vent.x, q.z - vent.z) < 6);
    expect(from).toBeGreaterThan(0);
    expect(go(s, route.slice(from), 0, each), where(s)).toBe(route.length - from);
    expect(districtAt(p.pos.x, p.pos.z).district).toBe('xiaoshizi');
    expect(above).toBe(0);
    expect(s.dead).toBeFalsy();
  });
});
