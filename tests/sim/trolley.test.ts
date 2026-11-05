// M7-06: Route B, the trolley. With the haul-rope trolley he climbs onto cabin 2's roof at the north station's open
// end (a jump to its lip and a pull up), clips onto the haul rope over it (out of reach from the platform) and slides
// it down the line's sag to the ending over the Yangtze in 40 s; and from a cabin the line drone had stopped, up
// through its hatch onto the rope and on.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { addItem } from '../../src/sim/inventory';
import { syncWorld } from '../../src/sim/doors';
import { lookTarget } from '../../src/sim/interact';
import { CABIN } from '../../src/sim/cablecar';
import { TROLLEY } from '../../src/sim/trolley';
import { SCALE } from '../../src/sim/clock';
import { raycast } from '../../src/world/geom';
import { B, type SimState } from '../../src/sim/types';
import { run, secs, aim, settle, LMB } from './helpers';

const w = getWorld('yuzhong');
const rope = w.inter.find(i => i.kind === 'haulrope')!, panel = w.inter.find(i => i.kind === 'cabin')!, cab = w.features.find(f => f.kind === 'cable:cabin')!;
/** Cabin 2's middle on its floor, out of its door (toward the platform), and along it toward the open end. */
const mid = { x: cab.x - cab.nx! * 1.35, y: cab.y, z: cab.z - cab.nz! * 1.35 }, out = { x: cab.nx!, z: cab.nz! }, ux = -cab.nz!, uz = cab.nx!;

/** A run at noon on a clear day, the city's machines elsewhere, him at (x, y, z) with what he's given. */
function at(x: number, y: number, z: number, items: string[]): SimState {
  const s = createState(3, w);
  s.flags.clear = true; s.time = 12 * 3600;
  for (const u of s.units) u.off = Infinity;
  for (const id of items) addItem(s, s.inv.pack, id, 1);
  syncWorld(s, w);
  teleport(s.player, x, y, z);
  run(s, w, 30);
  return s;
}
const floorAt = (x: number, y: number, z: number) => y + 0.5 - raycast(w.index, x, y + 0.5, z, 0, -1, 0, 3)!.t;
/** E held on what he looks at for `t` s. */
const hold = (s: SimState, t: number) => { run(s, w, secs(t), { buttons: B.INTERACT, pressed: B.INTERACT }); run(s, w, 2); };
/** Walked to (x, z) on the level he's on, facing it. */
function walkTo(s: SimState, x: number, z: number) {
  for (let i = 0; i < secs(6); i++) {
    const p = s.player.pos, dx = x - p.x, dz = z - p.z;
    if (Math.hypot(dx, dz) < 0.25) break;
    run(s, w, 1, { yaw: Math.atan2(-dx, -dz), my: Math.min(1, Math.hypot(dx, dz)) });
  }
  run(s, w, 20);
}

describe('Route B: the trolley (M7-06)', () => {
  it('up onto cabin 2\'s roof, clipped onto the haul rope at the open end, and down the line to the ending', async () => {
    await settle();
    // On the platform by the cabin's side, toward the open end: the haul rope's out of reach from here.
    const sx = mid.x + out.x * 2.1 + ux * 2, sz = mid.z + out.z * 2.1 + uz * 2, s = at(sx, floorAt(sx, cab.y, sz) + 0.05, sz, ['trolley']);
    aim(s, rope.x, rope.y, rope.z);
    run(s, w, 2);
    expect(lookTarget(s, w)?.id, 'out of reach from the platform').not.toBe(rope.id);
    // A jump to the roof's lip, and pulled up onto it.
    const lip = { x: mid.x + out.x * 1.7 + ux * 2, y: cab.y + 2.42, z: mid.z + out.z * 1.7 + uz * 2 };
    aim(s, lip.x, lip.y, lip.z);
    run(s, w, 1, { pressed: B.JUMP, buttons: B.JUMP });
    for (let i = 0; i < 40 && s.player.mode !== 'grip'; i++) { aim(s, lip.x, lip.y, lip.z); run(s, w, 1, { buttons: LMB | B.JUMP }); }
    expect(s.player.mode, 'hanging from its lip').toBe('grip');
    // (Pulled up until he's on it, and no further: the roof's only 3.4 m across.)
    for (let i = 0; i < secs(3) && s.player.mode !== 'ground'; i++) run(s, w, 1, { buttons: LMB, my: s.player.mode === 'grip' ? 1 : 0 });
    run(s, w, secs(1));
    expect(s.player.pos.y, 'on its roof').toBeCloseTo(cab.y + 2.45, 1);
    // Along it to the open end, under the rope; clipped on.
    walkTo(s, mid.x + ux * 2.6, mid.z + uz * 2.6);
    aim(s, rope.x, rope.y, rope.z);
    run(s, w, 2);
    expect(lookTarget(s, w)?.id).toBe(rope.id);
    hold(s, TROLLEY.clip + 0.2);
    expect([s.player.mode, s.cable?.by]).toEqual(['cable', 'trolley']);
    const t0 = s.time;
    run(s, w, secs(70));
    expect([s.dead, s.ended?.route]).toEqual([null, 'cable']);
    const took = (s.ended!.t - t0) / SCALE;
    expect(Math.abs(took - TROLLEY.secs), `its slide: ${took.toFixed(2)} s`).toBeLessThanOrEqual(1);
    expect(TROLLEY.secs).toBe(40);
    expect(s.escape!.cable.trolley).toBeDefined();
  }, 900000);

  it('from a cabin the line drone stopped, up through its hatch onto the haul rope and on to the ending', async () => {
    await settle();
    // In cabin 2 by its panel, the feeder live; the key turned.
    const fx = panel.x + (mid.x - panel.x) * 0.8, fz = panel.z + (mid.z - panel.z) * 0.8, s = at(fx, floorAt(fx, cab.y, fz) + 0.05, fz, ['opkey', 'trolley']);
    s.wstate.open['cable-feeder'] = true;
    aim(s, panel.x, panel.y, panel.z);
    run(s, w, 2);
    hold(s, CABIN.key + 0.2);
    expect(s.player.mode).toBe('cable');
    // Standing at the glass by day: seen, stopped.
    for (let i = 0; i < secs(60) && !(s.cable!.spotted !== undefined && s.cable!.v === 0); i++) run(s, w, 1);
    expect(s.cable!.spotted, 'seen').toBeDefined();
    const stopped = s.cable!.d;
    run(s, w, 1, { buttons: B.INTERACT, pressed: B.INTERACT });
    run(s, w, secs(TROLLEY.hatch + 0.5));
    expect([s.cable!.by, s.cable!.cabin]).toEqual(['trolley', stopped]);
    run(s, w, secs(60));
    expect([s.dead, s.ended?.route]).toEqual([null, 'cable']);
  }, 900000);
});
