// M7-09: Route C's crossing. The river police's sonar buoys hear the boat's engine within 50 m and the drone boats run
// him down, fog or not; drifting with the engine off in fog at night slips past them, and out on the open river too
// (by day they see it, even drifting); the jammer, or an EMP at a buoy (the string goes deaf with it), lets the engine
// run past them. Xiaoyu, if she said she'd come, comes down into the boat where it waits by her steps; the open reach
// past Chaotianmen ends the run, 雾中, with her if she's in it.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { startRun } from '../../src/sim/run';
import { teleport } from '../../src/sim/player';
import { addItem } from '../../src/sim/inventory';
import { useStack } from '../../src/sim/use';
import { sisterRoute } from '../../src/sim/sister';
import { BOAT, ahead } from '../../src/sim/boat';
import { RIVER } from '../../src/sim/river';
import { EMP } from '../../src/sim/emp';
import { heightAt } from '../../src/world/heightfield';
import { raycast } from '../../src/world/geom';
import { WATER_Y } from '../../src/world/yuzhong/ground';
import { B, emptyInput, type SimState } from '../../src/sim/types';
import { run, secs, aim } from './helpers';

const w = getWorld('yuzhong'), moor = w.inter.find(i => i.id === 'patrolboat')!;
const buoys = w.features.filter(f => f.kind === 'pier:buoy');
const zone = w.zones.find(z => z.kind === 'ending:boat')!.box, mid = { x: (zone.x0 + zone.x1) / 2, z: (zone.z0 + zone.z1) / 2 };

/** On the pontoon across from the moored boat (whichever side of it the deck is), looking at it. */
function byBoat(s: SimState) {
  const f = ahead(moor.data!.yaw as number);
  for (const k of [1, -1]) {
    const x = moor.x - f.z * k * 2.4, z = moor.z + f.x * k * 2.4, h = raycast(w.index, x, WATER_Y + 3, z, 0, -1, 0, 3);
    if (!h || WATER_Y + 3 - h.t < WATER_Y) continue;
    teleport(s.player, x, WATER_Y + 3 - h.t + 0.05, z);
    run(s, w, 20);
    aim(s, moor.x, moor.y, moor.z);
    return;
  }
  throw new Error('no deck by the boat');
}

/** A run (begun as a new one, or not) at `hour` on day 2, fog or clear, the machines away; diesel, a battery and the
 *  key worked into the boat from the pontoon, and him at its helm, cast off. */
function atHelm(hour: number, fog: number, seed = 3, begun = false) {
  const s = createState(seed, w);
  if (begun) startRun(s, w);
  s.time = 86400 + hour * 3600;
  if (fog) s.flags.fog = fog; else s.flags.clear = true;
  for (const u of s.units) u.off = Infinity;
  for (const [id, extra] of [['jerrycan', {}], ['carbattery', { charge: 60 }], ['boatkey', {}]] as const) addItem(s, s.inv.pack, id, 1, extra);
  for (const t of [BOAT.pour, BOAT.wire, 0]) {
    byBoat(s);
    run(s, w, Math.max(1, secs(t + 0.3)), { buttons: B.INTERACT, pressed: B.INTERACT });
  }
  expect(s.player.mode).toBe('boat');
  return s;
}

/** Ticks with what he hears of the drone boats counted. */
function go(s: SimState, t: number, inp: Parameters<typeof run>[3] = {}) {
  let boats = 0;
  run(s, w, secs(t), inp, x => { for (const e of x.events) if (e.t === 'sfx' && e.id === 'boats') boats++; });
  return boats;
}
const engine = (s: SimState) => run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT });
const dist = (s: SimState, p: { x: number; z: number }) => Math.hypot(s.boat!.x - p.x, s.boat!.z - p.z);

describe("Route C's crossing (M7-09)", () => {
  it('the buoys hear the engine started among them: the drone boats come at once and run him down, fog or none', () => {
    for (const [hour, fog] of [[12, 0], [2, 0.9]]) {
      const s = atHelm(hour, fog);
      expect(buoys.some(b => dist(s, b) < RIVER.engine)).toBe(true);
      expect(go(s, 2)).toBe(0);
      engine(s);
      expect(s.boat!.on).toBe(true);
      expect(go(s, 1, { my: 1 }), `${hour}:00 heard`).toBe(1);
      go(s, RIVER.boats + 1, { my: 1 });
      expect(s.dead, `${hour}:00`).toBe('river');
      expect(s.ended).toBeUndefined();
    }
  }, 600000);

  it('drifting with the engine off in fog at night slips past the buoys and on down the open river to the far reach: 雾中', () => {
    const s = atHelm(1, 0.9), from = { x: s.boat!.x, z: s.boat!.z };
    expect(go(s, 100)).toBe(0);
    expect(dist(s, from)).toBeGreaterThan(150);
    for (const b of buoys) expect(dist(s, b), 'past the buoys').toBeGreaterThan(RIVER.engine);
    expect([s.dead, s.river?.boats]).toEqual([null, undefined]);
    // On out into the open river toward the reach (carried there, as by the hours of current): still nothing hears it,
    // and the current takes it into the reach.
    const f = { x: mid.x - s.boat!.x, z: mid.z - s.boat!.z }, d = Math.hypot(f.x, f.z), at = d - 200;
    s.boat!.x += (f.x / d) * at; s.boat!.z += (f.z / d) * at;
    const ends: string[] = [];
    run(s, w, secs(120), {}, x => { for (const e of x.events) if (e.t === 'ending') ends.push(e.route); });
    expect(ends).toEqual(['boat']);
    expect(s.ended).toMatchObject({ route: 'boat', sister: false });
    expect(s.dead).toBeNull();
  }, 600000);

  it('by day the drone boats see it out on the open river, drifting or not', () => {
    const s = atHelm(12, 0), f = { x: mid.x - moor.x, z: mid.z - moor.z }, d = Math.hypot(f.x, f.z);
    s.boat!.x = mid.x - (f.x / d) * 170; s.boat!.z = mid.z - (f.z / d) * 170;
    expect(heightAt(w.ground!, s.boat!.x, s.boat!.z)!).toBeLessThan(WATER_Y - 2);
    expect(go(s, RIVER.sonar + 1)).toBe(1);
    go(s, RIVER.boats);
    expect(s.dead).toBe('river');
  }, 600000);

  it('the jammer, or an EMP at a buoy, lets the engine run past them', () => {
    const jam = atHelm(12, 0);
    addItem(jam, jam.inv.pack, 'jammer', 1);
    jam.jam = { since: jam.time };
    engine(jam);
    expect(go(jam, 15, { my: 1 })).toBe(0);
    expect(jam.dead).toBeNull();
    // The EMP: set off with the boat by a buoy, the whole string's deaf as long as a sensor stays out.
    const s = atHelm(12, 0), b = buoys[0], o = { x: b.x - moor.x, z: b.z - moor.z }, d = Math.hypot(o.x, o.z);
    const spot = { x: b.x + (o.x / d) * 2, z: b.z + (o.z / d) * 2 };
    s.boat!.x = spot.x; s.boat!.z = spot.z;
    run(s, w, 2);
    addItem(s, s.inv.pack, 'emp', 1);
    useStack(s, w, s.inv.pack.items.find(i => i.id === 'emp')!, emptyInput());
    expect(Object.keys(s.deaf ?? {}).length).toBe(buoys.length);
    engine(s);
    expect(go(s, 8, { my: 1 })).toBe(0);
    // Without it, the same: heard.
    const loud = atHelm(12, 0);
    loud.boat!.x = spot.x; loud.boat!.z = spot.z;
    engine(loud);
    expect(go(loud, 2, { my: 1 })).toBe(1);
    expect(EMP.camera).toBeGreaterThan(8);
  }, 600000);

  it('Xiaoyu, if she said she would come, comes down into it by her steps, and leaves with him', () => {
    let seed = 1;
    while (sisterRoute(seed) !== 'boat') seed++;
    const s = atHelm(2, 0.9, seed, true), x = s.sister!;
    // The open water nearest her.
    let best: { x: number; z: number; d: number } | undefined;
    for (let r = 4; r <= 40; r += 2) for (let k = 0; k < 32; k++) {
      const px = x.x + Math.sin((k * Math.PI) / 16) * r, pz = x.z + Math.cos((k * Math.PI) / 16) * r;
      if ((heightAt(w.ground!, px, pz) ?? 0) < WATER_Y - 3 && (!best || r < best.d)) best = { x: px, z: pz, d: r };
    }
    expect(best!.d).toBeLessThan(BOAT.call - 6);
    s.boat!.x = best!.x; s.boat!.z = best!.z;
    run(s, w, secs(2));
    expect(x.aboard, "she hasn't said she'd come").toBeFalsy();
    x.with = true;
    run(s, w, secs(2));
    expect(x.aboard).toBe(true);
    s.boat!.x = mid.x; s.boat!.z = mid.z;
    run(s, w, 31);
    expect(s.ended).toMatchObject({ route: 'boat', sister: true });
  }, 600000);
});
