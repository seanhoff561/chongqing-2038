// M7-11: Route D's way out, Line 1 on east past the crossover. The protective door opened each way (its card, quietly;
// the grinder, loudly; a breaching charge, ten seconds after it's set, blown open); the flooded dip drained by the
// pumps (the spare HV fuse in the metro's feeder at the substation, the station's pump panel) and walked through, or
// swum with the oxygen kit (without it he drowns); the seismic sensors feeling him run but not creep; and the way out
// beyond the end wall ending the run (with Xiaoyu only if the water was pumped out: one oxygen kit).
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { heightAt } from '../../src/world/heightfield';
import { raycast } from '../../src/world/geom';
import { doorSolid } from '../../src/sim/doors';
import { BLAST, PUMPS } from '../../src/sim/tunnelend';
import { CABIN } from '../../src/sim/cablecar';
import { RAIL } from '../../src/sim/metro';
import { lookTarget } from '../../src/sim/interact';
import { newUid } from '../../src/sim/inventory';
import { B, type SimState } from '../../src/sim/types';
import { run, secs } from './helpers';
import { standBy, hold } from './routekit';

type V3 = { x: number; y: number; z: number };
const w = getWorld('yuzhong'), g = w.ground!, F = w.flood!;
const walk = w.features.filter(f => f.kind === 'tunnelEnd:walk').sort((a, b) => a.group - b.group);
const door = w.inter.find(i => i.kind === 'blastdoor')!, pumps = w.inter.find(i => i.id === 'metro-pumps')!, feeder = w.inter.find(i => i.data?.live === 'metro-feeder')!;
const zone = w.zones.find(z => z.kind === 'ending:tunnel')!.box;
const where = (s: SimState) => `at ${s.player.pos.x.toFixed(1)},${s.player.pos.y.toFixed(1)},${s.player.pos.z.toFixed(1)} ${s.player.mode} ${s.dead ?? ''}`;

/** A run at a spot, nothing about; Xiaoyu waiting on this route, and said she'd come. */
function at(q: V3) {
  const s = createState(1, w);
  s.units.length = 0; s.flags.clear = true;
  s.sister = { route: 'tunnel', x: 0, y: 0, z: 0, yaw: 0, with: true };
  teleport(s.player, q.x, q.y + 0.05, q.z);
  run(s, w, 10);
  return s;
}
const give = (s: SimState, id: string) => s.inv.pack.items.push({ uid: newUid(s), id, n: 1, x: 0, y: 0, rot: false });
const noises = (s: SimState, n: number, inp = {}) => { let r = 0; run(s, w, n, inp, x => { for (const e of x.events) if (e.t === 'noise') r = Math.max(r, e.r); }); return r; };
/** At the door from the crossover's side, looking at it. */
function atDoor() {
  const s = at(walk[0]);
  expect(standBy(s, w, door.x, door.y, door.z, walk[1]), 'by the door').toBe(true);
  expect(lookTarget(s, w)?.id).toBe(door.id);
  return s;
}
const opened = (s: SimState) => !!s.wstate.open[door.id] && w.index.off[doorSolid(door)] === 1;

/** Along the walk from point i on, each to within half a metre: on foot (holding `keys`), or swimming (diving where
 *  the next point's lower). */
function go(s: SimState, from: number, keys = 0) {
  const p = s.player;
  for (let i = from; i < walk.length && !s.dead && !s.ended; i++) {
    const q = walk[i];
    for (let t = 0; t < secs(40 + Math.hypot(q.x - p.pos.x, q.z - p.pos.z)) && Math.hypot(q.x - p.pos.x, q.z - p.pos.z) > 0.5 && !s.dead && !s.ended; t++) {
      const dive = p.mode === 'swim' && p.pos.y > q.y + 0.6 ? B.CROUCH : 0;
      run(s, w, 1, { my: 1, yaw: Math.atan2(-(q.x - p.pos.x), -(q.z - p.pos.z)), buttons: keys | dive });
    }
  }
}

describe('Line 1 past the crossover: route D (M7-11)', () => {
  it('runs under the hill from the crossover through its door, down into the flooded dip and up to the way out', () => {
    expect(walk.length).toBe(7);
    for (const q of walk) expect(heightAt(g, q.x, q.z)! - q.y, `under at ${q.x},${q.z}`).toBeGreaterThan(9);
    // The water: full, over the roof along the bottom; under the door's sill.
    const low = walk[3], roof = raycast(w.index, low.x, low.y + 1, low.z, 0, 1, 0, 10)!;
    expect(low.y + 1 + roof.t).toBeLessThan(F.top - 1);
    expect(F.top).toBeLessThan(walk[0].y);
    // The way out: past the end wall, in the ending's zone.
    const end = walk[6];
    expect(end.x >= zone.x0 && end.x <= zone.x1 && end.z >= zone.z0 && end.z <= zone.z1 && end.y + 0.5 >= zone.y0 && end.y <= zone.y1).toBe(true);
  }, 600000);

  it('the door opens to its card, quietly', () => {
    const s = atDoor();
    hold(s, w, 1);
    expect(opened(s), 'no card: shut').toBe(false);
    give(s, 'blastcard');
    const r = noises(s, secs(BLAST.card + 0.3), { buttons: B.INTERACT, pressed: B.INTERACT });
    expect(opened(s)).toBe(true);
    expect(r).toBeLessThan(10);
  }, 600000);

  it('the door is cut open with the grinder, slowly and loudly', () => {
    const s = atDoor();
    give(s, 'grinder');
    run(s, w, secs(BLAST.grind - 2), { buttons: B.INTERACT, pressed: B.INTERACT });
    expect(opened(s), 'not yet').toBe(false);
    const r = noises(s, secs(2.5), { buttons: B.INTERACT });
    expect(opened(s)).toBe(true);
    expect(r).toBeGreaterThanOrEqual(BLAST.grinder);
  }, 600000);

  it('a breaching charge set on the door blows it open after its fuse: clear of it he lives, by it he doesn\'t', () => {
    for (const away of [true, false]) {
      const s = atDoor();
      give(s, 'breach');
      hold(s, w, BLAST.set + 0.3);
      expect(s.inv.pack.items.some(i => i.id === 'breach'), 'the charge set').toBe(false);
      expect(opened(s)).toBe(false);
      if (away) { teleport(s.player, walk[0].x - 14, walk[0].y + 0.05, walk[0].z); s.player.vel = { x: 0, y: 0, z: 0 }; }
      const r = noises(s, secs(BLAST.fuse));
      expect(opened(s), 'blown open').toBe(true);
      expect(r).toBeGreaterThanOrEqual(BLAST.noise);
      expect(s.dead, away ? 'clear' : 'by it').toBe(away ? null : 'blast');
    }
  }, 600000);

  it('the pumps: dead with the feeder; the spare fuse in the metro feeder, they run, the water goes and he walks out with Xiaoyu', () => {
    // At the pump panel: nothing.
    const s = at(pumps);
    expect(standBy(s, w, pumps.x, pumps.y, pumps.z), 'at the pump panel').toBe(true);
    hold(s, w, RAIL.pumps + 0.3);
    expect(s.wstate.open['metro-pumps']).toBeUndefined();
    // At the substation: the spare fuse into the metro's feeder panel.
    give(s, 'hvfuse');
    expect(standBy(s, w, feeder.x, feeder.y, feeder.z), 'at the feeder panel').toBe(true);
    expect(lookTarget(s, w)?.id).toBe(feeder.id);
    hold(s, w, CABIN.fuse + 0.3);
    expect(s.wstate.open['metro-feeder']).toBe(true);
    expect(s.inv.pack.items.some(i => i.id === 'hvfuse')).toBe(false);
    // The pumps run; the water's down in two minutes.
    expect(standBy(s, w, pumps.x, pumps.y, pumps.z)).toBe(true);
    hold(s, w, RAIL.pumps + 0.3);
    expect(s.wstate.open['metro-pumps']).toBe(true);
    run(s, w, secs(PUMPS.drain / 2));
    expect(F.boxes[0].y1).toBeLessThan(F.top - 3);
    run(s, w, secs(PUMPS.drain / 2 + 1));
    expect(F.boxes.every(b => b.y1 <= F.bottom)).toBe(true);
    // The door open with the card; through, down, along the dry bottom and out, slowly.
    teleport(s.player, walk[0].x, walk[0].y + 0.05, walk[0].z);
    give(s, 'blastcard');
    expect(standBy(s, w, door.x, door.y, door.z, walk[1])).toBe(true);
    hold(s, w, BLAST.card + 0.3);
    go(s, 1, B.CROUCH);
    expect(s.player.mode, where(s)).not.toBe('swim');
    expect(s.ended, where(s)).toMatchObject({ route: 'tunnel', sister: true });
    expect(s.hive.lkp, 'never felt').toBeUndefined();
  }, 900000);

  it('the flooded dip swum with the oxygen kit (Xiaoyu can\'t follow); without it he drowns', () => {
    for (const kit of [true, false]) {
      const s = at(walk[0]);
      s.wstate.open[door.id] = true; w.index.off[doorSolid(door)] = 1;
      if (kit) give(s, 'oxygen');
      go(s, 1, B.SPRINT);
      if (kit) expect([s.ended, s.inv.pack.items.find(i => i.id === 'oxygen')!.charge! < 50], where(s)).toMatchObject([{ route: 'tunnel', sister: false }, true]);
      else expect([s.dead, s.ended]).toEqual(['drown', undefined]);
    }
  }, 900000);

  it('the seismic sensors feel him run along the tracks, not creep', () => {
    for (const fast of [true, false]) {
      const s = at(walk[1]);
      const q = walk[2];
      run(s, w, secs(2), { my: 1, yaw: Math.atan2(-(q.x - s.player.pos.x), -(q.z - s.player.pos.z)), buttons: fast ? 0 : B.CROUCH });
      expect(!!s.hive.lkp, fast ? 'run' : 'crept').toBe(fast);
    }
  }, 600000);
});
