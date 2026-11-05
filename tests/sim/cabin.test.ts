// M7-05: Route B, the cabin. The spare HV fuse fitted at the substation's cableway feeder panel makes the feeder live;
// the operator key in cabin 2's panel starts it; it runs out over the old town past the line drone and over the
// Yangtze to the 索道 ending in about 60 s. Kept low under its windows he passes unseen; standing at the glass by day
// the drone sees him, the feeder's tripped, the cabin stops short and the hunters have him.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { addItem } from '../../src/sim/inventory';
import { syncWorld } from '../../src/sim/doors';
import { layTrail } from '../../src/sim/sister';
import { lookTarget } from '../../src/sim/interact';
import { CABIN, lineOf } from '../../src/sim/cablecar';
import { SCALE } from '../../src/sim/clock';
import { raycast } from '../../src/world/geom';
import { B, type SimState } from '../../src/sim/types';
import { run, secs, aim, settle } from './helpers';

const w = getWorld('yuzhong');
const feeder = w.inter.find(i => i.kind === 'feeder')!, panel = w.inter.find(i => i.kind === 'cabin')!;
const zone = w.zones.find(z => z.kind === 'ending:cable')!.box;

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
/** Standing on the floor `back` m from a thing, toward `from`, looking at it. */
function by(it: { x: number; y: number; z: number }, from: { x: number; z: number }, back: number, items: string[]) {
  const d = Math.hypot(from.x - it.x, from.z - it.z), x = it.x + ((from.x - it.x) / d) * back, z = it.z + ((from.z - it.z) / d) * back;
  const h = raycast(w.index, x, it.y + 0.5, z, 0, -1, 0, 3)!;
  const s = at(x, it.y + 0.5 - h.t + 0.05, z, items);
  aim(s, it.x, it.y, it.z);
  run(s, w, 2);
  return s;
}
/** E held on what he looks at for `t` s. */
const hold = (s: SimState, t: number) => { run(s, w, secs(t), { buttons: B.INTERACT, pressed: B.INTERACT }); run(s, w, 2); };

/** In cabin 2 by its panel, the feeder live, the key in his pack; the key turned. */
function aboard(sister = false): SimState {
  const cab = w.features.find(f => f.kind === 'cable:cabin')!;
  const s = by(panel, cab, 1.2, ['opkey']);
  if (sister) { layTrail(s, w, 'cable'); s.sister!.with = true; }
  expect(lookTarget(s, w)?.id).toBe(panel.id);
  hold(s, CABIN.key + 0.2);
  expect(s.player.mode, 'the drive dead: it stays').toBe('ground');
  s.wstate.open['cable-feeder'] = true;
  aim(s, panel.x, panel.y, panel.z);
  hold(s, CABIN.key + 0.2);
  expect(s.player.mode).toBe('cable');
  return s;
}

describe('Route B: the cabin (M7-05)', () => {
  it('the spare HV fuse at the substation\'s cableway feeder panel makes the feeder live', () => {
    // (In front of its panel: out from the panel's middle through its fuse carrier.)
    const box = w.inter.filter(i => i.en === 'Feeder panel').sort((a, b) => Math.hypot(a.x - feeder.x, a.z - feeder.z) - Math.hypot(b.x - feeder.x, b.z - feeder.z))[0];
    const s = by(feeder, { x: 2 * feeder.x - box.x, z: 2 * feeder.z - box.z }, 1.0, []);
    expect(lookTarget(s, w)?.id).toBe(feeder.id);
    hold(s, CABIN.fuse + 0.5);
    expect(s.wstate.open['cable-feeder'], 'no fuse').toBeFalsy();
    addItem(s, s.inv.pack, 'hvfuse', 1);
    aim(s, feeder.x, feeder.y, feeder.z);
    hold(s, CABIN.fuse + 0.5);
    expect([s.wstate.open['cable-feeder'], s.inv.pack.items.some(i => i.id === 'hvfuse'), s.dead]).toEqual([true, false, null]);
  });

  it('kept low under the windows he rides past the line drone to the ending in about 60 s, Xiaoyu with him', async () => {
    await settle();
    const s = aboard(true), t0 = s.time;
    expect(s.sister!.aboard, 'she came aboard').toBe(true);
    run(s, w, secs(80), { buttons: B.CROUCH }, x => { if (x.ended && x.player.mode === 'cable') x.player.mode = 'ground'; });
    expect(s.ended).toMatchObject({ route: 'cable', sister: true });
    const took = (s.ended!.t - t0) / SCALE;
    expect(took, 'its ride').toBeGreaterThan(55);
    expect(took, 'its ride').toBeLessThan(65);
    expect(s.cable!.spotted).toBeUndefined();
    expect(s.cable!.heard, 'the drone heard it go by').toBeDefined();
    const l = lineOf(w)!, p = s.player.pos;
    expect(p.x >= zone.x0 && p.x <= zone.x1 && p.z >= zone.z0 && p.z <= zone.z1).toBe(true);
    expect((p.x - l.a.x) * l.dx + (p.z - l.a.z) * l.dz).toBeGreaterThan(600);
  }, 900000);

  it('standing at the glass by day he\'s seen: the feeder\'s tripped, the cabin stops short of the river, the hunters have him', async () => {
    await settle();
    const s = aboard(), l = lineOf(w);
    let stopped = -1, died = -1;
    run(s, w, secs(80), {}, x => { if (stopped < 0 && x.cable!.spotted !== undefined && x.cable!.v === 0) stopped = x.cable!.d; if (died < 0 && x.dead) died = x.time; });
    expect(s.cable!.spotted, 'seen').toBeDefined();
    expect(s.wstate.open['cable-feeder'], 'the feeder tripped').toBe(false);
    expect(s.ended).toBeUndefined();
    const enter = Math.min(...[[zone.x0, zone.z0], [zone.x1, zone.z1], [zone.x0, zone.z1], [zone.x1, zone.z0]].map(([x, z]) => (x - l!.a.x) * l!.dx + (z - l!.a.z) * l!.dz));
    expect(stopped, 'stopped over the old town').toBeGreaterThan(100);
    expect(stopped, 'short of the river').toBeLessThan(enter);
    expect(s.dead).toBe('cableway');
    expect((died - s.cable!.spotted!) / SCALE, 'the hunters on it').toBeCloseTo(CABIN.caught, 0);
  }, 900000);
});
