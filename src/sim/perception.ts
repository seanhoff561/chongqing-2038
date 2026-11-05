// Seeing him (M4-03, DESIGN section 5). How visible he is to a unit: the share of five points of his body (head, two
// shoulders, pelvis, knees) inside its cone and range with nothing in the way, times the light on him (a night-vision
// unit's floor under it; a drone's searchlight lights what it looks at by night), how his posture shows him, how he's
// moving, the falloff with distance, and the weather's cut to its range. By night thermal units see his heat instead
// (M4-06). Each unit thinks ten times a second, in turn,
// and its awareness of him climbs while he's visible and falls away when he isn't.
import type { SimState } from './types';
import type { World, Patrol } from '../world/world';
import { SENSES, SIGHT, HEARING, THERMAL, SENSORS, type UnitKind } from '../data/units';
import { movement as M } from '../data/movement';
import { raycast } from '../world/geom';
import { lightAt, LAMP_LIGHT } from './light';
import { daylight, SCALE } from './clock';
import { unitPose, isOff, type Pose, type Unit } from './units';
import { smoked } from './throw';
import { onUseId } from './use';
import { LEAN } from './player';
import { remember } from './hive';
import { heightened, districtOf } from './district';
import { leave } from './alert';
import { laptopLight } from './laptop';

type V3 = { x: number; y: number; z: number };

/** His five points: head, shoulders, pelvis, knees, at his posture's heights (lying along the ground crawling). */
export function bodyPoints(s: SimState): V3[] {
  const p = s.player, { x, y, z } = p.pos, c = Math.cos(p.yaw), sn = Math.sin(p.yaw);
  if (p.posture === 'crawl') return [0.6, 0.3, 0.3, 0, -0.6].map((f, i) => ({ x: x - sn * f + (i === 1 ? c * 0.2 : i === 2 ? -c * 0.2 : 0), y: y + 0.25, z: z - c * f + (i === 1 ? -sn * 0.2 : i === 2 ? sn * 0.2 : 0) }));
  const h = M.height[p.posture === 'crouch' ? 'crouch' : p.posture === 'hidden' ? 'hidden' : 'stand'], k = h / M.height.stand;
  // Leaning (M4-21b), his head goes out to the side, his shoulders half as far.
  const l = p.lean * LEAN.out, hx = c * l, hz = -sn * l;
  return [{ x: x + hx, y: y + h - 0.12, z: z + hz }, { x: x + c * 0.2 + hx / 2, y: y + 1.45 * k, z: z - sn * 0.2 + hz / 2 }, { x: x - c * 0.2 + hx / 2, y: y + 1.45 * k, z: z + sn * 0.2 + hz / 2 }, { x, y: y + 0.95 * k, z }, { x, y: y + 0.5 * k, z }];
}

/** How his posture shows him. */
function posture(s: SimState) {
  const p = s.player, P = SIGHT.posture;
  if (p.mode === 'hidden') return P.hidden;
  if (p.mode === 'grip' || p.mode === 'cling' || p.mode === 'chimney') return P.hang;
  return p.posture === 'crawl' ? P.crawl : p.posture === 'crouch' ? P.crouch : P.stand;
}

/** How his moving shows him. */
function motion(s: SimState) {
  const p = s.player, v = Math.hypot(p.vel.x, p.vel.z), Mo = SIGHT.motion;
  if (p.mode === 'air' || p.mode === 'action' || p.mode === 'wallrun' || p.mode === 'wallclimb' || p.mode === 'zip') return Mo.fast;
  if (v < 0.2) return Mo.still;
  if (p.posture === 'crawl') return Mo.crawl;
  if (p.posture === 'crouch') return Mo.crouch;
  return v > M.speed.jog + 0.5 ? Mo.fast : Mo.jog;
}

/** How much of his heat shows to thermal sight: all of it, a tenth under the mylar blanket, three tenths wet, none
 *  in water over a metre deep. */
function heat(s: SimState, w: World) {
  const p = s.player;
  if (p.mode === 'swim') {
    const top = w.water.find(b => p.pos.x >= b.x0 && p.pos.x <= b.x1 && p.pos.z >= b.z0 && p.pos.z <= b.z1 && p.pos.y < b.y1);
    if (top && top.y1 - p.pos.y > THERMAL.deep) return 0;
  }
  return (wrapped(s) ? THERMAL.mylar : 1) * (p.wetUntil > s.tick ? THERMAL.wet : 1);
}

/** Whether he's wrapped in the mylar blanket (and still has it). */
const wrapped = (s: SimState) => s.player.mylar && s.inv.pack.items.some(i => i.id === 'mylar');

// The mylar blanket (M4-06): used, he wraps it round himself, or takes it off again.
onUseId('mylar', s => { s.player.mylar = !wrapped(s); s.events.push({ t: 'msg', text: s.player.mylar ? 'wrapped in the mylar blanket' : 'mylar blanket off' }); });

/** A motion sensor (M4-11): him within its 10 m cone in clear sight, moving faster than it notices by how his
 *  posture shows him (a crawl, 0.8 m/s x 0.3, slides under it; a crouch-walk doesn't). */
function pirTrips(s: SimState, w: World, at: Pose) {
  const p = s.player, P = SENSORS.pir, c = { x: p.pos.x, y: p.pos.y + 0.5, z: p.pos.z }, dx = c.x - at.x, dy = c.y - at.y, dz = c.z - at.z, d = Math.hypot(dx, dy, dz);
  if (d > P.range || d < 0.01 || (dx * Math.sin(at.yaw) + dz * Math.cos(at.yaw)) / Math.hypot(dx, dz) < Math.cos((P.fov * Math.PI) / 360)) return false;
  if (raycast(w.index, at.x, at.y, at.z, dx / d, dy / d, dz / d, d - 0.3)) return false;
  return Math.hypot(p.vel.x, p.vel.y, p.vel.z) * posture(s) > P.motion;
}

/** A tripwire (M4-11): his body, feet to head, through its beam; a running jump clears one at shin height. */
function wireTrips(s: SimState, c: { x: number; y: number; z: number; to?: { x: number; y: number; z: number }; w?: number }) {
  const p = s.player.pos, b = c.to!, vx = b.x - c.x, vz = b.z - c.z, L = vx * vx + vz * vz || 1, t = Math.max(0, Math.min(1, ((p.x - c.x) * vx + (p.z - c.z) * vz) / L));
  const h = M.height[s.player.posture === 'crouch' ? 'crouch' : s.player.posture === 'crawl' ? 'crawl' : 'stand'];
  // (A pressure plate's the same, wide and on the floor: any weight on it, M6-11.)
  return Math.hypot(c.x + vx * t - p.x, c.z + vz * t - p.z) < (c.w ?? 0.25) && c.y >= p.y && c.y <= p.y + h;
}

/** Each beat's ground, its dock's too (a box, x and z). */
const beatBoxes = new WeakMap<Patrol, { x0: number; z0: number; x1: number; z1: number }>();
/** Whether a unit walking its beat is nowhere along it (or on the way to and from its dock) within r of (x, z): then
 *  it can't see, hear or shoot there, and needn't be placed to know it (M10-04: most of the city's machines most
 *  ticks). A unit off its beat, a column's or a fixed sensor never is. */
export function farFromBeat(w: World, u: Unit, x: number, z: number, r: number) {
  if (u.trip || u.stop || u.crash || u.convoy || u.cam !== undefined || u.reserve || u.patrol < 0) return false;
  const P = w.patrols[u.patrol];
  let b = beatBoxes.get(P);
  if (!b) {
    const pts = P.dock !== undefined ? [...P.pts, w.docks[P.dock]] : P.pts;
    b = { x0: Math.min(...pts.map(q => q.x)), z0: Math.min(...pts.map(q => q.z)), x1: Math.max(...pts.map(q => q.x)), z1: Math.max(...pts.map(q => q.z)) };
    beatBoxes.set(P, b);
  }
  return x < b.x0 - r || x > b.x1 + r || z < b.z0 - r || z > b.z1 + r;
}
/** Whether a unit walking its beat is too far from him anywhere along it to see him. */
const offBeat = (s: SimState, w: World, u: Unit) => farFromBeat(w, u, s.player.pos.x, s.player.pos.z, rangeOf(s, u.kind) + 3);

/** How far a unit sees now: its day range by day, its night range by night (between them at dusk), cut by fog and rain. */
export function rangeOf(s: SimState, kind: UnitKind) {
  const S = SENSES[kind], d = daylight(s.time), f = s.weather.fog, r = s.weather.rain;
  return (S.night + (S.day - S.night) * d) * (f > 0.6 ? 0.45 : f > 0.25 ? 0.75 : 1) * (r > 0.3 ? 0.85 : 1);
}

/** How visible he is to a unit standing at a pose: 0 (not at all) to 1. */
export function visibility(s: SimState, w: World, kind: UnitKind, at: Pose): number {
  const S = SENSES[kind], eye = { x: at.x, y: at.y + S.eye, z: at.z }, range = rangeOf(s, kind), p = s.player.pos;
  const d = Math.hypot(p.x - eye.x, p.y + 1 - eye.y, p.z - eye.z);
  if (d > range || s.player.mode === 'dead') return 0;
  // Walked right up to him (not hidden in something), it can't miss him.
  if (s.player.posture !== 'hidden' && Math.hypot(p.x - at.x, p.z - at.z) < SIGHT.touch && Math.abs(p.y - at.y) < 1.5) return 1;
  // The cone's axis: the way it faces, pitched down for a drone.
  const pc = Math.cos((S.pitch * Math.PI) / 180), ax = Math.sin(at.yaw) * pc, ay = -Math.sin((S.pitch * Math.PI) / 180), az = Math.cos(at.yaw) * pc, half = Math.cos((S.fov * Math.PI) / 360);
  let seen = 0;
  for (const q of bodyPoints(s)) {
    const dx = q.x - eye.x, dy = q.y - eye.y, dz = q.z - eye.z, L = Math.hypot(dx, dy, dz);
    if (L < 0.01 || (dx * ax + dy * ay + dz * az) / L < half) continue;
    // (Not through a powder cloud, M5-19.)
    if (!raycast(w.index, eye.x, eye.y, eye.z, dx / L, dy / L, dz / L, L - 0.05) && !smoked(s, eye, q)) seen++;
  }
  if (!seen) return 0;
  // (His open laptop's screen lights him too: M5-01.)
  let light = Math.max(lightAt(w, p, s.time, Math.max(LAMP_LIGHT[s.player.lamp], laptopLight(s))), S.ir);
  if (daylight(s.time) < 0.5) {
    // By night: in a searchlight's spot he's lit; within thermal range his heat shows (M4-06).
    const cx = p.x - eye.x, cy = p.y + 0.9 - eye.y, cz = p.z - eye.z, cl = Math.hypot(cx, cy, cz) || 1;
    if (S.lamp && (cx * ax + cy * ay + cz * az) / cl > Math.cos((S.lamp * Math.PI) / 180)) light = 1;
    else if (S.thermal && d <= S.thermal) light = Math.max(light, heat(s, w));
  }
  return (seen / 5) * light * posture(s) * motion(s) * (1 - (d / range) ** 2);
}

/** Every tick: the units whose turn it is look (each ten times a second), their awareness of him climbing at 2.5 x
 *  visibility a second while it's 0.04 or more, else falling away. */
export function stepSight(s: SimState, w: World, every = 6) {
  const dt = every / 60, H = heightened(s);
  for (const u of s.units) {
    if (isOff(s, u)) continue;
    // A tripwire's beam is watched every tick, so no running step goes through it unseen (M4-11).
    if (u.kind === 'tripwire') {
      if (wireTrips(s, w.cameras[u.cam!])) { u.aware = 1.2; u.seen = { ...s.player.pos }; u.saw = s.time; }
      else u.aware = Math.max(0, (u.aware ?? 0) - SIGHT.decay / 60);
      continue;
    }
    if ((u.id + s.tick) % every) continue;
    // (A fixed sensor too far from him to see him: M10-04.)
    if (u.cam !== undefined && u.kind !== 'pir') { const c = w.cameras[u.cam], R = rangeOf(s, u.kind) + 3; if (Math.abs(c.x - s.player.pos.x) > R || Math.abs(c.z - s.player.pos.z) > R) { u.aware = Math.max(0, (u.aware ?? 0) - SIGHT.decay * dt); continue; } }
    // Blinded (M4-19), or nowhere on its whole beat within sight of him (M9-12: most of the city's machines, not
    // placed at all), it sees nothing.
    if (u.blind || offBeat(s, w, u)) { u.aware = Math.max(0, (u.aware ?? 0) - SIGHT.decay * dt); continue; }
    const at = unitPose(w, u, s.time);
    // A motion sensor's alarm: all at once (M4-11).
    if (u.kind === 'pir') {
      if (pirTrips(s, w, at)) { u.aware = 1.2; u.seen = { ...s.player.pos }; u.saw = s.time; }
      else u.aware = Math.max(0, (u.aware ?? 0) - SIGHT.decay * dt);
      continue;
    }
    const v = at.active && !at.docked ? visibility(s, w, u.kind, at) : 0;
    // (Heightened, its awareness climbs 1.3 times as fast: M4-16.)
    const rate = SIGHT.rate * (H.size && H.has(districtOf(at.x, at.z)) ? SIGHT.heightened : 1);
    u.aware = v >= SIGHT.min ? Math.min(1.5, (u.aware ?? 0) + rate * v * dt) : Math.max(0, (u.aware ?? 0) - SIGHT.decay * dt);
    if (v >= SIGHT.min) { u.seen = { ...s.player.pos }; u.saw = s.time; u.went = { x: s.player.vel.x, z: s.player.vel.z }; }
  }
}


/** Every tick: the noises he made, heard by the units within each one's radius times their hearing (x0.6 through
 *  walls). A unit that hears one is at least Suspicious, and goes to look where it came from; a hostile noise (a shot,
 *  a blast) sends every unit that heard it, and the hive remembers where (its search is M4-15's). */
export function stepHearing(s: SimState, w: World) {
  for (const e of s.events) {
    if (e.t !== 'noise') continue;
    const hostile = HEARING.hostile.has(e.kind);
    for (const u of s.units) {
      const hear = SENSES[u.kind].hear;
      if (!hear || farFromBeat(w, u, e.x, e.z, e.r * hear + 2) || isOff(s, u)) continue;
      const at = unitPose(w, u, s.time);
      if (!at.active || at.docked) continue;
      const S = SENSES[u.kind], ear = { x: at.x, y: at.y + Math.max(0.3, S.eye), z: at.z }, d = Math.hypot(e.x - ear.x, e.y + 0.5 - ear.y, e.z - ear.z), r = e.r * S.hear;
      if (d > r) continue;
      if (d > r * HEARING.occluded && raycast(w.index, e.x, e.y + 0.5, e.z, (ear.x - e.x) / d, (ear.y - e.y - 0.5) / d, (ear.z - e.z) / d, d - 0.1)) continue;
      // Machine fire (its own or its fellows', a tag launcher's pop too) tells it where the fight is, not where he is: a
      // fresh sight of him stands.
      if ((e.kind === 'gunfire' || e.kind === 'tag') && u.saw !== undefined && s.time - u.saw < HEARING.fresh * SCALE) continue;
      // A delivery robot doesn't look into a loud noise (a firecracker, a shot): it's scared off its route, away from
      // it, and back to its round after (M4-34).
      if (u.kind === 'delivery') {
        if (e.r >= HEARING.scare && !u.trip) { const dx = at.x - e.x, dz = at.z - e.z, l = Math.hypot(dx, dz) || 1; leave(s, w, u, 'look', { x: at.x + (dx / l) * HEARING.flee, y: at.y, z: at.z + (dz / l) * HEARING.flee }); }
        continue;
      }
      u.aware = Math.max(u.aware ?? 0, 0.35);
      u.seen = { x: e.x, y: e.y, z: e.z };
    }
    // (A turret's own fire tells the hive nothing it doesn't know already.)
    if (hostile && e.kind !== 'gunfire') remember(s, e);
  }
}
