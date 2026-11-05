// The cableway's cabin (M7-05, DESIGN section 10). At the Xinhua Road substation the cableway's feeder panel takes the
// spare HV fuse in its blown one's place (held, then its breaker slams shut, heard all round): the feeder's live. In
// cabin 2 at the north station the operator key in its control panel starts the drive; the doors shut and it runs out
// along the ropes, him in it (and Xiaoyu, if she said she'd come), up to 12 m/s, rumbling: 60 s out to the open river
// over the Yangtze and the ending. The line drone patrols the ropes over the old town and the bank, above them, looking
// down: it hears the cabin coming and looks at it, and sees him through the glass as any machine sees (lit, standing,
// near); low under the windows he can't be seen, and the jammer blinds it near him. If it sees him, the network trips
// the feeder at the substation: the drive dies and the cabin brakes to a stop, hanging over the old town, and the hunter
// drones are on it in 20 s.
import { B, DT, type InputFrame, type SimState } from './types';
import type { World, Inter } from '../world/world';
import type { Pose } from './units';
import { onInteract, START_SOUND } from './interact';
import { has, consume } from './inventory';
import { stepDone } from './escape';
import { die } from './body';
import { visibility } from './perception';
import { SENSES, SIGHT } from '../data/units';
import { SCALE } from './clock';
import { JAM } from './jammer';
import { cableLive } from './cableway';
import { ropeY, type CableLine } from '../world/yuzhong/cableway';

/** The cabin: its top speed (m/s), how fast it picks up and brakes (m/s²); seconds fitting the fuse and turning the
 *  key; how far its rumble and the breaker are heard (m); its floor under the track ropes; its windows' sill and top
 *  over its floor (m); real seconds from being seen till the hunters are on it; how near Xiaoyu must be to board. */
export const CABIN = { top: 12, accel: 1, brake: 2, fuse: 8, key: 3, noise: 30, breaker: 40, hang: 5.3, sill: 1.1, glass: 2.1, caught: 20, board: 6 };
/** The line drone: the stretch of the line it patrols (fractions of the way across), how far to the side of the ropes
 *  and over them it flies (m), its speed (m/s), and how long it keeps looking where it heard the cabin (s). */
export const LINE_DRONE = { f0: 0.15, f1: 0.45, side: 6, up: 8, speed: 3.5, look: 10 };

/** The ropes' line (the haul rope's two ends, `cable:rope`), its ends at the track ropes' height. */
const lines = new WeakMap<World, CableLine | null>();
export function lineOf(w: World): CableLine | null {
  if (!lines.has(w)) {
    const [a, b] = w.features.filter(f => f.kind === 'cable:rope');
    lines.set(w, a && b ? { a: { x: a.x, y: a.y + 0.2, z: a.z }, b: { x: b.x, y: b.y + 0.2, z: b.z }, dx: a.nx!, dz: a.nz!, len: Math.hypot(b.x - a.x, b.z - a.z) } : null);
  }
  return lines.get(w)!;
}

/** The track ropes `d` m out along the line from the north station's open end (short of it, inside the station). */
export const onLine = (l: CableLine, d: number) => ({ x: l.a.x + l.dx * d, y: ropeY(l, Math.max(0, Math.min(1, d / l.len))), z: l.a.z + l.dz * d });

/** Where the cabin hangs: its floor's middle `d` m along. */
export function cabinAt(l: CableLine, d: number) { const c = onLine(l, d); return { x: c.x, y: c.y - CABIN.hang, z: c.z }; }

/** The line drone now: to and fro over its stretch of the line, facing the way it flies, or where it heard the cabin;
 *  once it's seen him, hovering by the stopped cabin. */
export function lineDrone(s: SimState, l: CableLine): Pose {
  const D = LINE_DRONE, C = s.cable, cab = C && (C.by === 'cabin' ? C.d : C.cabin);
  const look = (x: number, y: number, z: number, yaw: number): Pose => {
    if (cab === undefined || !(C!.spotted !== undefined || (C!.heard !== undefined && s.time - C!.heard < D.look * SCALE))) return { x, y, z, yaw, active: true };
    const q = cabinAt(l, cab);
    return { x, y, z, yaw: Math.atan2(q.x - x, q.z - z), active: true };
  };
  if (C?.spotted !== undefined && cab !== undefined) { const q = cabinAt(l, cab); return look(q.x - l.dz * D.side, q.y + 4, q.z + l.dx * D.side, 0); }
  const span = (D.f1 - D.f0) * l.len, T = span / D.speed, t = (((s.time / SCALE) % (2 * T)) + 2 * T) % (2 * T), out = t < T;
  const c = onLine(l, D.f0 * l.len + (out ? t / T : 2 - t / T) * span), k = out ? 1 : -1;
  return look(c.x - l.dz * D.side, c.y + D.up, c.z + l.dx * D.side, Math.atan2(l.dx * k, l.dz * k));
}

// The feeder's fuse at the substation: the spare in, the breaker closed.
START_SOUND.feeder = () => 'latch';
onInteract('feeder', {
  can: s => (s.wstate.open['cable-feeder'] ? 'live' : has(s.inv.pack, 'hvfuse') ? null : 'the cableway feeder: its fuse is blown'),
  dur: () => CABIN.fuse,
  done: (s, _w, it) => {
    consume(s.inv.pack, 'hvfuse');
    s.wstate.open['cable-feeder'] = true;
    stepDone(s, 'cable', 'feeder');
    s.events.push({ t: 'sfx', id: 'force' }, { t: 'noise', x: it.x, y: it.y, z: it.z, r: CABIN.breaker, kind: 'crash' }, { t: 'msg', text: 'the breaker closed: the cableway feeder is live' });
  },
});

// Cabin 2's control panel: the operator key turned, the drive started.
START_SOUND.cabin = () => 'latch';
onInteract('cabin', {
  can: s => (!has(s.inv.pack, 'opkey') ? 'cabin 2: its panel needs the operator key' : !cableLive(s) ? 'cabin 2: the drive is dead' : null),
  no: s => (has(s.inv.pack, 'opkey') ? 'engine-click' : ''),
  dur: () => CABIN.key,
  done: depart,
});

/** The doors shut and the cabin's away: him in it where he stands, Xiaoyu too if she's coming. */
function depart(s: SimState, w: World, it: Inter) {
  const l = lineOf(w), cab = w.features.find(f => f.kind === 'cable:cabin');
  if (!l || !cab) return;
  const d = (cab.x - l.a.x) * l.dx + (cab.z - l.a.z) * l.dz, c = cabinAt(l, d), p = s.player, ox = p.pos.x - c.x, oz = p.pos.z - c.z;
  s.cable = { by: 'cabin', d, v: 0, at: [Math.max(-2.6, Math.min(2.6, ox * l.dx + oz * l.dz)), Math.max(-1.2, Math.min(1.2, -ox * l.dz + oz * l.dx))] };
  s.wstate.gone[it.id] = true;
  p.mode = 'cable'; p.act = null; p.hands[0].grip = p.hands[1].grip = null;
  const x = s.sister;
  if (x?.route === 'cable' && x.with && Math.hypot(x.x - c.x, x.z - c.z) < CABIN.board) { x.aboard = true; s.events.push({ t: 'msg', text: 'Xiaoyu sits down by the window' }); }
  stepDone(s, 'cable', 'cabin');
  s.events.push({ t: 'sfx', id: 'engine-start' }, { t: 'sfx', id: 'door-close' });
}

/** Every tick in the cabin: the drive (or the brakes), him carried with it, standing or keeping low as he likes; its
 *  rumble; the line drone watching; seen, the hunters coming. */
export function stepCabin(s: SimState, w: World, input: InputFrame) {
  const C = s.cable, l = lineOf(w), p = s.player;
  if (C?.by !== 'cabin' || !l || s.dead || s.ended) return;
  C.v = cableLive(s) ? Math.min(CABIN.top, C.v + CABIN.accel * DT) : Math.max(0, C.v - CABIN.brake * DT);
  // (At the south station's wall it stops.)
  C.d = Math.min(l.len - 6, C.d + C.v * DT);
  if (C.d >= l.len - 6) C.v = 0;
  const c = cabinAt(l, C.d), [u, v] = C.at!;
  if (input.pressed & B.CRAWL) p.posture = p.posture === 'crawl' ? 'stand' : 'crawl';
  else if (p.posture !== 'crawl') p.posture = input.buttons & B.CROUCH ? 'crouch' : 'stand';
  p.pos.x = c.x + l.dx * u - l.dz * v; p.pos.y = c.y + 0.1; p.pos.z = c.z + l.dz * u + l.dx * v;
  p.vel.x = l.dx * C.v; p.vel.y = 0; p.vel.z = l.dz * C.v; p.onGround = true; p.fallFrom = p.pos.y;
  if (C.v > 1 && s.tick % 30 === 0) s.events.push({ t: 'noise', x: c.x, y: c.y + 1, z: c.z, r: CABIN.noise, kind: 'engine' }, { t: 'sfx', id: 'cabin' });
  watch(s, w, l, c);
  if (C.spotted !== undefined && (s.time - C.spotted) / SCALE >= CABIN.caught) die(s, 'cableway');
}

/** The line drone, ten times a second: the cabin heard (it looks), him seen through the glass (its awareness climbing
 *  as a machine's does), and seen, the feeder tripped. */
function watch(s: SimState, w: World, l: CableLine, c: { x: number; y: number; z: number }) {
  const C = s.cable!, p = s.player.pos;
  if (C.spotted !== undefined || s.tick % 6) return;
  const q = lineDrone(s, l), dt = 0.1;
  if (C.v > 1 && Math.hypot(q.x - c.x, q.y - c.y, q.z - c.z) < CABIN.noise * SENSES.drone.hear) C.heard = s.time;
  const blind = !!s.jam && Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z) < JAM.reach;
  const v = blind ? 0 : visibility(s, w, 'drone', q, { y0: c.y + CABIN.sill, y1: c.y + CABIN.glass });
  C.aware = v >= SIGHT.min ? (C.aware ?? 0) + SIGHT.rate * v * dt : Math.max(0, (C.aware ?? 0) - SIGHT.decay * dt);
  if (C.aware < 1) return;
  C.spotted = s.time;
  s.wstate.open['cable-feeder'] = false;
  s.events.push({ t: 'sfx', id: 'engine-stop' }, { t: 'msg', text: 'the line drone has seen you: the drive cuts out' });
}
