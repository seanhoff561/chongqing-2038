// Key places (U-104, M10-40, DESIGN section 2): the high-security sites, the construction site, the exits' approaches,
// the Grand Tunnel, the air-raid shelter, the metro and his family's flat. None is on Anna's map at the start: a
// document or note of his sister's that names one marks it once he has it, walking into one marks it, and the flat
// is the one Anna shows him the first time he looks at the map. Each is kept with the game time he learned of it; the
// next time the map comes up Anna says her line on each learned since he last had it up, and it's flagged till then.
import type { SimState } from './types';
import type { World } from '../world/world';
import { onCmd } from './commands';
import { docById } from '../data/documents';
import { NOTES } from '../data/sister';
import { MAP_LINES } from '../data/dialogue';
import { place } from './sister';
import { GEO } from '../world/geo';
import { streets } from '../world/yuzhong/ground';
import { SECURE } from '../world/yuzhong/secure';

/** A key place: its id, its name, where it's marked, and what counts as being in it (a box on the ground, or within
 *  r of the mark; within dy of its height if it has one). */
export interface Place { id: string; zh: string; en: string; x: number; z: number; r?: number; y?: number; dy?: number; box?: { x0: number; z0: number; x1: number; z1: number } }

/** The places at a world teleport: id, its name, zh, en, how near counts as in it (m). */
const AT: [string, string, string, string, number][] = [
  ['site', 'Construction site', '工地', 'Construction site', 30], ['pier', 'River-police pier: gangway', '水警码头', 'River-police pier', 30],
  ['tunnel', 'Grand Tunnel entrance', '大隧道', 'Grand Tunnel', 15], ['shelter', 'Air-raid shelter', '防空洞', 'Air-raid shelter', 20],
  ['junction', 'Tunnel junction (metro)', '大隧道接地铁', 'Tunnel meets the metro', 15], ['metro', 'Metro station Jiefangbei', '地铁解放碑站', 'Jiefangbei station', 35],
  ['flat', 'Li family flat', '李家', 'the Li flat', 10], ['steps', 'river:steps@chaotianmen', '朝天门江边石梯', 'Chaotianmen river steps', 20],
];

const placesOf = new WeakMap<World, Place[]>();
export function keyPlaces(w: World): Place[] {
  let v = placesOf.get(w);
  if (v) return v;
  v = [];
  // The sites: in the building's footprint.
  for (const q of w.secure ?? []) {
    const d = SECURE.find(x => x.id === q.id)!, c = w.plots.find(p => p.prefix === q.prefix)?.corners ?? [[q.x, q.z]];
    const xs = c.map(k => k[0]), zs = c.map(k => k[1]);
    v.push({ id: q.id, zh: d.zh, en: d.en, x: q.x, z: q.z, box: { x0: Math.min(...xs) - 1, z0: Math.min(...zs) - 1, x1: Math.max(...xs) + 1, z1: Math.max(...zs) + 1 } });
  }
  for (const [id, at, zh, en, r] of AT) { const t = place(w, at); if (t) v.push({ id, zh, en, x: t.x, z: t.z, r, y: t.y, dy: 8 }); }
  if (w.name === 'yuzhong') {
    const cw = GEO.landmarks.cablewayNorth;
    if (cw) v.push({ id: 'cableway', zh: '长江索道', en: 'Yangtze cableway', x: cw.x, z: cw.z, r: 30 });
    // (The Dongshuimen Bridge at its bridgehead: the end of its deck nearest Xiaoshizi.)
    const XS = GEO.landmarks.xiaoshizi, ends = streets().filter(s => s.name === '东水门大桥').flatMap(s => [s.pts[0], s.pts[s.pts.length - 1]]);
    const b = XS && ends.sort((a, c) => Math.hypot(a[0] - XS.x, a[1] - XS.z) - Math.hypot(c[0] - XS.x, c[1] - XS.z))[0];
    if (b) v.push({ id: 'bridge', zh: '东水门大桥', en: 'Dongshuimen Bridge', x: b[0], z: b[1], r: 30 });
  }
  // The metro's ways in from the street: one mark each, learned only by finding them.
  for (const t of w.teleports) {
    if (!t.name.startsWith('Metro ') || t.name.startsWith('Metro station') || t.name.startsWith('Metro tunnel')) continue;
    const id = `metro:${t.name.slice(6)}`;
    if (!v.some(q => q.id === id)) v.push({ id, zh: `地铁${t.name.slice(6)}`, en: 'metro', x: t.x, z: t.z, r: 12, y: t.y, dy: 8 });
  }
  placesOf.set(w, v);
  return v;
}

/** Whether a point's in a place. */
export function inPlace(q: Place, x: number, y: number, z: number) {
  if (q.dy !== undefined && Math.abs(y - q.y!) > q.dy) return false;
  return q.box ? x >= q.box.x0 && x <= q.box.x1 && z >= q.box.z0 && z <= q.box.z1 : Math.hypot(x - q.x, z - q.z) <= q.r!;
}

/** He's come to know of a place (once). */
export function learn(s: SimState, id: string) { const k = (s.known ??= {}); if (k[id] === undefined) k[id] = s.time; }

/** Whether a known place is new on the map: learned since he last had it up. */
export const isNew = (s: SimState, id: string) => (s.known?.[id] ?? -Infinity) > (s.mapAt ?? -Infinity);

/** The places a found document or note of hers names. */
const noteById = new Map(NOTES.map(n => [n.id, n]));
const namesOf = (id: string) => docById.get(id)?.names ?? noteById.get(id)?.names ?? [];

/** Twice a second: a document or note he's carrying names its places; a place he's in. */
export function stepPlaces(s: SimState, w: World) {
  if (s.tick % 30 || s.dead || s.ended) return;
  for (const it of s.inv.pack.items) for (const id of namesOf(it.id)) learn(s, id);
  const p = s.player.pos;
  for (const q of keyPlaces(w)) if (inPlace(q, p.x, p.y, p.z)) learn(s, q.id);
}

// The map up (arg 1): the first time, his family's flat; Anna's line on each place new to it. Put away (arg 0): all
// of them seen.
onCmd((s, c) => {
  if (c.c !== 'act' || c.name !== 'map') return;
  if (!c.arg) { s.mapAt = s.time; return; }
  learn(s, 'flat');
  for (const id of Object.keys(s.known ?? {})) if (isNew(s, id)) for (const l of MAP_LINES[id] ?? MAP_LINES[id.split(':')[0]] ?? []) s.events.push({ t: 'say', id: l.id });
});
