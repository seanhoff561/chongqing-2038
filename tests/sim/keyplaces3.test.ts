// M10-38d, M6-16: the cableway's north station (yuzhong/cableway.ts), the river-police pier's deckhouse (pierhouse.ts)
// and the construction site's office compound (siteoffice.ts), made by hand. Each walked on his own legs and hands from
// outside, by each of its ways in, to its heart: the way in taken as he'd take it (a door forced with what he brings,
// a ladder climbed, a crawl, a jump and a ride), then on along a way found through its rooms (its doors open, its
// collapses standing), each lock on that way opened by something found in the place, reached without going through
// it; its collapses sending him round (cleared, some way in is shorter); its story on its walls. And the cableway's
// own (M6-16): its ropes over the river clear of everything, the operator key and the parked cabin, and its bullwheel
// lurching into him in its nip, still once its brake is set.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { syncWorld, doorSolid } from '../../src/sim/doors';
import { addItem } from '../../src/sim/inventory';
import { overlaps, raycast } from '../../src/world/geom';
import { MAT } from '../../src/world/mats';
import { docSpot } from '../../src/sim/documents';
import { SITEHAZ } from '../../src/sim/sitehaz';
import { WHEEL, wheelState } from '../../src/sim/cableway';
import { WATER_Y } from '../../src/world/yuzhong/ground';
import { heightAt } from '../../src/world/heightfield';
import { GEO } from '../../src/world/geo';
import { inside } from '../../src/world/yuzhong/shapes';
import { B, type SimState } from '../../src/sim/types';
import { walkPath } from './walker';
import { climbPole } from './climbbot';
import { run, secs, aim, LMB, RMB } from './helpers';
import type { Inter } from '../../src/world/world';

type P = { x: number; y: number; z: number };
type Box = { x0: number; z0: number; x1: number; z1: number };
const w = getWorld('yuzhong'), feat = (k: string) => w.features.filter(q => q.kind === k), one = (k: string) => feat(k)[0];
const tpOf = (name: string) => w.teleports.find(q => q.name === name)!;
let near = '';

const floorAt = (x: number, y: number, z: number, down = 1.5) => { const h = raycast(w.index, x, y + 0.5, z, 0, -1, 0, down + 0.5); return h ? y + 0.5 - h.t : null; };
const room = (x: number, y: number, z: number, r = 0.25) => !overlaps(w.index, { x0: x - r, y0: y + 0.35, z0: z - r, x1: x + r, y1: y + 1.7, z1: z + r });
const within = (b: Box, x: number, z: number) => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1;

/** A way on foot within the box on a G m grid (up steps and ramps, down off them a metre at most, with his headroom,
 *  off the walls where there's room), from a point to within a metre of any of the goals: its points, or null. Every
 *  door in the box open but the buried ones and those in `shut`; `off` solids taken away too. */
function way(b: Box, G: number, from: P, goals: P[], shut = new Set<string>(), off: number[] = []): P[] | null {
  const doors = w.inter.filter(i => (i.kind === 'door' || i.kind === 'grate') && within(b, i.x, i.z) && i.data?.lock !== 'collapsed' && !shut.has(i.id)).map(doorSolid).filter(id => id >= 0);
  const was = [...doors, ...off].map(id => w.index.off[id]);
  for (const id of [...doors, ...off]) w.index.off[id] = 1;
  const y0 = floorAt(from.x, from.y + 0.3, from.z, 2)!, i0 = Math.round(from.x / G), j0 = Math.round(from.z / G);
  const key = (i: number, j: number, y: number) => `${i},${j},${Math.round(y * 2)}`, k0 = key(i0, j0, y0);
  const seen = new Map<string, string | null>([[k0, null]]), at = new Map<string, P>([[k0, { x: i0 * G, y: y0, z: j0 * G }]]);
  const buckets: [number, number, number, string][][] = [[[i0, j0, y0, k0]]], done = new Set<string>();
  let end: string | null = null;
  for (let c = 0; c < buckets.length && !end && done.size < 800000; c++) {
    for (const [i, j, y, k] of buckets[c] ?? []) {
      if (done.has(k)) continue;
      done.add(k);
      if (goals.some(g => Math.hypot(g.x - i * G, g.z - j * G) < 1 && Math.abs(g.y - y) < 0.6)) { end = k; break; }
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const ni = i + di, nj = j + dj, x = ni * G, z = nj * G;
        if (!within(b, x, z)) continue;
        const ny = floorAt(x, y, z, 1);
        if (ny === null || ny > y + 0.46 || !room(x, ny, z, 0.25)) continue;
        const nk = key(ni, nj, ny);
        if (seen.has(nk)) continue;
        seen.set(nk, k); at.set(nk, { x, y: ny, z });
        (buckets[c + (di && dj ? 3 : 2) + (room(x, ny, z, 0.45) ? 0 : 6)] ??= []).push([ni, nj, ny, nk]);
      }
    }
  }
  [...doors, ...off].forEach((id, n) => (w.index.off[id] = was[n]));
  if (!end) {
    const g = goals[0], best = [...at.values()].reduce((a, q) => (Math.hypot(q.x - g.x, q.z - g.z) + Math.abs(q.y - g.y) < Math.hypot(a.x - g.x, a.z - g.z) + Math.abs(a.y - g.y) ? q : a));
    near = `${seen.size} cells; nearest ${best.x.toFixed(1)},${best.y.toFixed(1)},${best.z.toFixed(1)}`;
    return null;
  }
  const path: P[] = [];
  for (let k: string | null = end; k; k = seen.get(k)!) path.unshift(at.get(k)!);
  return path;
}

/** A run with the machines away (but its cameras' units off too), him at a spot with the tools to hand. */
function at(x: number, y: number, z: number, yaw = 0) {
  const s = createState(5, w);
  s.flags.clear = true; s.flags.god = true; s.time = 12 * 3600;
  for (const u of s.units) u.off = Infinity;
  for (const id of ['crowbar', 'boltcutters', 'sitecard']) addItem(s, s.inv.pack, id, 1);
  syncWorld(s, w);
  teleport(s.player, x, y, z);
  s.player.yaw = yaw;
  run(s, w, 30);
  return s;
}
const tp = (name: string) => { const t = tpOf(name); return at(t.x, t.y, t.z, t.yaw); };
const where = (s: SimState) => `at ${s.player.pos.x.toFixed(1)},${s.player.pos.y.toFixed(1)},${s.player.pos.z.toFixed(1)} (${s.player.mode}, ${s.player.posture})`;

/** Hold E on it until it's done (or `t` s). */
function work(s: SimState, id: string, t = 15) {
  const it = w.inter.find(i => i.id === id)!;
  aim(s, it.x, it.y, it.z);
  run(s, w, 1, { buttons: B.INTERACT, pressed: B.INTERACT });
  for (let i = 0; i < secs(t) && s.task; i++) { aim(s, it.x, it.y, it.z); run(s, w, 1, { buttons: B.INTERACT }); }
}
/** On up over the top of a climbable until he's standing (as tests/sim/pier.test.ts). */
function over(s: SimState, l: { x: number; z: number; y1: number; nx: number; nz: number }) {
  const bits: number[] = [LMB, RMB];
  let hand = 0;
  for (let step = 0; step < 20 && s.player.mode !== 'ground'; step++) {
    const p = s.player, held = p.hands.map((h, i) => (h.grip ? bits[i] : 0)).reduce((a, b) => a | b, 0);
    aim(s, l.x - l.nx * 0.3, Math.min(l.y1 - 0.05, p.pos.y + 2.2), l.z - l.nz * 0.3);
    run(s, w, 2, { buttons: held | bits[hand] });
    run(s, w, secs(1), { buttons: bits[hand], my: 1 });
    hand = 1 - hand;
    if (p.mode === 'action') run(s, w, secs(1));
  }
}
const ladderAt = (x: number, z: number) => w.climbables.filter(c => c.kind === 'ladder').sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];

/** Walk him on along a way's points (every third), facing each, at a run, hopping when he's stuck: '' or where he
 *  stuck. Every door in the run opened first, but the buried ones. */
function walk(s: SimState, path: P[]): string {
  for (const it of w.inter) if (it.kind === 'door' && it.data?.lock !== 'collapsed') s.wstate.open[it.id] = true;
  syncWorld(s, w);
  const pts = path.filter((_, n) => n % 3 === 0 || n === path.length - 1);
  for (let n = 0; n < pts.length; n++) {
    const q = pts[n];
    let still = 0, last = { ...s.player.pos };
    for (let t = 0; t < 60 * 4; t++) {
      const p = s.player.pos, dx = q.x - p.x, dz = q.z - p.z;
      if (Math.hypot(dx, dz) < 0.4 && Math.abs(q.y - p.y) < 1) break;
      const hop = still > 20 && still % 30 < 2, side = still > 10 ? (Math.floor(still / 15) % 2 ? 1 : -1) : 0;
      run(s, w, 1, { yaw: Math.atan2(-dx, -dz), my: 1, mx: side, buttons: B.SPRINT | (hop ? B.JUMP : 0), pressed: hop ? B.JUMP : 0 });
      if (Math.hypot(p.x - last.x, p.z - last.z) < 0.02) still++; else { still = 0; last = { ...p }; }
    }
    const p = s.player.pos;
    if (Math.hypot(q.x - p.x, q.z - p.z) >= 0.6 || Math.abs(q.y - p.y) >= 1) return `${n}/${pts.length}: ${where(s)} for ${q.x.toFixed(1)},${q.y.toFixed(1)},${q.z.toFixed(1)}`;
  }
  return s.dead ? 'dead' : '';
}

/** What opens a door, if it needs anything: its card, or a tool. */
const needs = (it: Inter): string[] => (it.data?.key ? [it.data.key as string] : it.data?.lock === 'chained' ? ['boltcutters', 'crowbar'] : it.data?.lock === 'locked' ? ['crowbar'] : []);

/** A place: its box, the grid, its heart, its ways in (each taken from outside: him standing inside, or a failure),
 *  and the ids of its outer doors (not counted as its locks). */
interface Place { box: (from: P) => Box; G: number; heart: P; ways: [string, () => SimState | string][]; outer: string[]; doc?: string }

function walkIn(pl: Place) {
  const failed: string[] = [], lengths: number[] = [], froms: P[] = [], all: Box[] = [];
  for (const [name, take] of pl.ways) {
    const s = take();
    if (typeof s === 'string') { failed.push(`${name}: ${s}`); continue; }
    const from = { ...s.player.pos }, box = pl.box(from), its = w.inter.filter(i => within(box, i.x, i.z)), path = way(box, pl.G, from, [pl.heart]);
    froms.push(from); all.push(box);
    if (!path) { failed.push(`${name}: no way to the heart from ${where(s)} (${near})`); lengths.push(Infinity); continue; }
    lengths.push(path.length);
    // The locks on the way: each opened by something found in the place, reached from here without going through it.
    const locked = its.filter(d => d.kind === 'door' && needs(d).length && !pl.outer.includes(d.id) && path.some(q => Math.hypot(q.x - d.x, q.z - d.z) < pl.G * 3 && Math.abs(q.y + 1.1 - d.y) < 0.8));
    const shut = new Set(locked.map(d => d.id));
    for (const d of locked) {
      const holders = its.filter(c => c.kind === 'container' && (c.data?.items as [string, number][] | undefined)?.some(([i]) => needs(d).includes(i)));
      const goals = holders.map(c => ({ x: c.x, y: floorAt(c.x, c.y, c.z, 3) ?? c.y, z: c.z }));
      if (!goals.length || !way(box, pl.G, from, goals, shut)) failed.push(`${name}: nothing in it opens ${d.en} (${needs(d).join('/')})`);
    }
    const stuck = walk(s, path);
    if (stuck) failed.push(`${name}: stuck ${stuck}`);
  }
  expect(failed.join('\n')).toBe('');
  return { lengths, froms, all };
}

/** Its collapses (heaps where it came down, buried doors) cleared: some way in to the heart shorter. Its story in
 *  what's in it: words on its walls, its story document by its heart. */
function told(pl: Place, r: ReturnType<typeof walkIn>) {
  const cleared = r.froms.map((from, n) => {
    const box = r.all[n], fill = w.index.solids.map((q, k) => ({ q, k })).filter(({ q }) => q.mat === MAT.rubble && within(box, (q.x0 + q.x1) / 2, (q.z0 + q.z1) / 2)).map(({ k }) => k);
    const buried = w.inter.filter(d => within(box, d.x, d.z) && d.data?.lock === 'collapsed').map(doorSolid);
    expect(fill.length + buried.length, 'collapses').toBeGreaterThan(0);
    return way(box, pl.G, from, [pl.heart], new Set(), [...fill, ...buried])?.length ?? Infinity;
  });
  expect(cleared.some((l, n) => l < r.lengths[n] - 8), `a collapse in the way (${r.lengths.join(', ')} cleared ${cleared.join(', ')})`).toBe(true);
  const box = r.all[0];
  expect(w.props.filter(p => p.kind === 'graffiti' && within(box, p.x, p.z) && Math.abs(p.y - pl.heart.y) < 8).length, 'words on its walls').toBeGreaterThanOrEqual(4);
  if (pl.doc) { const t = docSpot(w, pl.doc)!; expect(Math.hypot(t.x - pl.heart.x, t.z - pl.heart.z), 'its document by its heart').toBeLessThan(6); }
}

/** Crawl to a point (and stand up there). */
function crawl(s: SimState, q: { x: number; z: number }) {
  run(s, w, 10, { buttons: B.CRAWL, pressed: B.CRAWL });
  for (let t = 0; t < secs(25) && Math.hypot(q.x - s.player.pos.x, q.z - s.player.pos.z) > 0.5; t++) {
    const yaw = Math.atan2(-(q.x - s.player.pos.x), -(q.z - s.player.pos.z));
    s.player.yaw = yaw;
    run(s, w, 1, { yaw, my: 1, buttons: B.CRAWL });
  }
  run(s, w, 10, { buttons: B.CRAWL, pressed: B.CRAWL });
  run(s, w, 30);
}

/** A way in through a door: from outside it, forced or unlocked with what he's brought, and through (under a roller
 *  shutter prised up, crawling). */
const through = (tpName: string, id: string) => (): SimState | string => {
  const s = tp(tpName), it = w.inter.find(i => i.id === id)!;
  work(s, id);
  if (!s.wstate.open[id]) return `${it.en} not opened`;
  const ox = it.x - s.player.pos.x, oz = it.z - s.player.pos.z, d = Math.hypot(ox, oz), q = { x: it.x + (ox / d) * 1.4, y: it.y - 1.1, z: it.z + (oz / d) * 1.4 };
  if (it.data?.shutter) crawl(s, q);
  else walk(s, [q]);
  return Math.hypot(q.x - s.player.pos.x, q.z - s.player.pos.z) < 0.8 ? s : `not through ${it.en}: ${where(s)}`;
};

describe('the cableway station, the pier and the construction site, made by hand (M10-38d)', () => {
  it('the cableway: walked from the street door, the staff door, the roof and the sewer up to cabin 2 at its upper station', () => {
    const S = w.secure!.find(q => q.id === 'cableway')!, plot = w.plots.find(p => p.prefix === S.prefix)!, ways = new Map(S.ways.map(q => [q.kind, q.id]));
    expect([...ways.keys()].sort()).toEqual(['basement', 'door', 'roof', 'staff']);
    const xs = plot.corners.map(c => c[0]), zs = plot.corners.map(c => c[1]), box: Box = { x0: Math.min(...xs) - 8, z0: Math.min(...zs) - 8, x1: Math.max(...xs) + 8, z1: Math.max(...zs) + 8 };
    const sewer = (): SimState | string => {
      const t = tpOf('Yangtze cableway: basement'), g = w.inter.find(i => i.id === ways.get('basement'))!, l = ladderAt(g.x, g.z), s = at(t.x, t.y, t.z);
      s.wstate.open[g.id] = true;
      syncWorld(s, w);
      walkPath(s, w, [{ x: l.x + l.nx * 0.6, y: l.y0, z: l.z + l.nz * 0.6 }], false);
      if (!climbPole(s, w, l, 0.6)) return `not up the shaft: ${where(s)}`;
      over(s, l);
      return s.player.mode === 'ground' && s.player.pos.y > g.y - 0.5 ? s : `not out into the cellar: ${where(s)}`;
    };
    const pl: Place = { box: () => box, G: 0.25, heart: S.heart, outer: [...ways.values()], ways: [
      ['street door', through('Yangtze cableway: door', ways.get('door')!)],
      ['staff door', through('Yangtze cableway: staff', ways.get('staff')!)],
      ['roof', () => tp('Yangtze cableway: roof')],
      ['sewer', sewer],
    ] };
    told(pl, walkIn(pl));
    // Its cabin hall on its top two floors: the station stands as the city rolled it, nothing over its roof but its
    // stairwell's hut.
    expect(S.heart.y, 'its cabin hall on its top floors').toBeCloseTo(plot.wall - 2 * 3, 1);
    expect(w.solids.filter(q => q.y1 > plot.top + 4 && inside(plot.corners, (q.x0 + q.x1) / 2, (q.z0 + q.z1) / 2)).length, 'nothing standing over it').toBe(0);
  }, 900000);

  it('the pier: walked from the gangway, out of the water by its ladder and off the crane to its watch room', () => {
    const deck = one('pier:deck'), heart = one('heart:pier'), box: Box = { x0: deck.x - 40, z0: deck.z - 40, x1: deck.x + 40, z1: deck.z + 40 };
    const ladder = (): SimState | string => {
      const l = ladderAt(one('pier:ladder').x, one('pier:ladder').z), s = at(l.x + l.nx * 0.6, l.y0 + 1.6, l.z + l.nz * 0.6);
      if (!climbPole(s, w, l, 0.6)) return `not up the ladder: ${where(s)}`;
      over(s, l);
      return Math.abs(s.player.pos.y - deck.y) < 0.6 ? s : `not onto the deck: ${where(s)}`;
    };
    const crane = (): SimState | string => {
      const cr = one('pier:crane'), l = ladderAt(cr.x, cr.z), s = at(l.x + l.nx * 0.6, l.y0 + 0.05, l.z + l.nz * 0.6);
      if (!climbPole(s, w, l, 0.6)) return `not up the mast: ${where(s)}`;
      over(s, l);
      walkPath(s, w, [one('pier:jib')], false);
      run(s, w, 20, { yaw: s.player.yaw, my: 1 });
      run(s, w, secs(2));
      walkPath(s, w, [{ x: deck.x, y: deck.y, z: deck.z }], false);
      return Math.abs(s.player.pos.y - deck.y) < 0.6 ? s : `not down onto the deck: ${where(s)}`;
    };
    const pl: Place = { box: () => box, G: 0.25, heart, outer: [], doc: 'pier', ways: [['gangway', () => tp('River-police pier: gangway')], ['ladder', ladder], ['crane', crane]] };
    told(pl, walkIn(pl));
  }, 900000);

  it('the construction site: walked in by its gate, its scaffold, its ditch and its hoist to the site manager\'s office', () => {
    const heart = one('heart:site'), base = tpOf('Construction site').y - 0.05;
    const box = (q: P): Box => ({ x0: Math.min(q.x, heart.x) - 30, z0: Math.min(q.z, heart.z) - 30, x1: Math.max(q.x, heart.x) + 30, z1: Math.max(q.z, heart.z) + 30 });
    const done = (s: SimState) => (s.player.pos.y < base + 0.8 && !s.dead ? s : `not down in the site: ${where(s)}`);
    const gate = () => { const s = tp('Construction site: gate'); work(s, 'site-gate'); walkPath(s, w, [one('site:gateIn')], false); return done(s); };
    const scaffold = () => {
      const o = one('site:scaffold'), s = tp('Construction site: scaffold'), l = ladderAt(o.x, o.z);
      walkPath(s, w, [{ x: l.x + l.nx * 0.6, y: l.y0, z: l.z + l.nz * 0.6 }], false);
      if (!climbPole(s, w, l, 0.6)) return `not up the scaffold: ${where(s)}`;
      over(s, l);
      walkPath(s, w, [one('site:scaffoldWalk'), one('site:scaffoldEnd'), one('site:scaffoldIn')], false);
      return done(s);
    };
    const ditch = () => { const s = tp('Construction site: ditch'); crawl(s, one('site:ditchIn')); return done(s); };
    const hoist = () => {
      const s = tp('Construction site: hoist'), land = one('site:hoist');
      walkPath(s, w, [one('site:hoistRoof')], false);
      let held = 0;
      for (let t = 0; t < secs(6) && !s.dead && !(s.player.mode === 'ground' && s.player.pos.y < land.y + 1); t++) {
        const p = s.player.pos, yaw = Math.atan2(-(land.x - p.x), -(land.z - p.z));
        if (held <= 0 && s.player.mode === 'ground') held = 20;
        s.player.yaw = yaw;
        run(s, w, 1, { yaw, my: 1, buttons: held-- > 0 ? B.JUMP : 0, pressed: held === 19 ? B.JUMP : 0 });
      }
      run(s, w, secs(1));
      const cage = w.inter.find(i => i.id === 'site-hoist')!;
      walkPath(s, w, [{ x: cage.x, y: land.y, z: cage.z }], false);
      work(s, 'site-hoist', SITEHAZ.ride + 2);
      run(s, w, 2);
      return done(s);
    };
    // (Each way its own box, from where he's in to the office: the site's too big to search whole.)
    const pl: Place = { box, G: 0.5, heart, outer: ['site-gate'], doc: 'site', ways: [['gate', gate], ['scaffold', scaffold], ['ditch', ditch], ['hoist', hoist]] };
    told(pl, walkIn(pl));
  }, 900000);
});

describe('the cableway station (M6-16)', () => {
  const S = w.secure!.find(q => q.id === 'cableway')!;
  it('has the haul rope and the track ropes over the Yangtze on the real line, a cabin\'s way clear under them, the operator key at its desk, cabin 2 parked', () => {
    const [a, b] = feat('cable:rope'), g = w.ground!, sad = one('cable:saddle');
    expect(a && b, 'the haul rope\'s ends').toBeTruthy();
    expect(Math.hypot(sad.x - a.x, sad.y - 0.2 - a.y, sad.z - a.z), 'from the hall\'s open end').toBeLessThan(0.05);
    expect(Math.hypot(b.x - a.x, b.z - a.z), 'across the river').toBeGreaterThan(800);
    // On the real line's bearing (OpenStreetMap's 长江索道, north station to Shangxin Street) within a degree.
    const real = GEO.aerial.filter(q => q[0] === '长江索道')[0][1];
    expect(Math.abs(Math.atan2(b.z - a.z, b.x - a.x) - Math.atan2(real[3] - real[1], real[2] - real[0])), 'its bearing').toBeLessThan(Math.PI / 180);
    expect(heightAt(g, b.x, b.z)!, 'its far end on the far bank').toBeGreaterThan(WATER_Y);
    let wet = 0;
    for (let f = 0; f <= 1; f += 0.01) if ((heightAt(g, a.x + (b.x - a.x) * f, a.z + (b.z - a.z) * f) ?? 0) < WATER_Y) wet++;
    expect(wet, 'over the river').toBeGreaterThan(20);
    // Every rope clear of everything all the way (but where it leaves its hall). (The bridges' steel and stays, drawn
    // with them, are coloured: M6-07.)
    const ropes = w.ropes!.filter(l => l.color === undefined);
    expect(ropes.length).toBeGreaterThanOrEqual(3 * 8);
    for (const l of ropes) {
      const dx = l.b.x - l.a.x, dy = l.b.y - l.a.y, dz = l.b.z - l.a.z, d = Math.hypot(dx, dy, dz);
      expect(raycast(w.index, l.a.x + (dx / d) * 0.5, l.a.y + (dy / d) * 0.5, l.a.z + (dz / d) * 0.5, dx / d, dy / d, dz / d, d - 0.5), `rope at ${l.a.x.toFixed(0)},${l.a.y.toFixed(0)},${l.a.z.toFixed(0)}`).toBeNull();
    }
    // A cabin's way along it clear (its floor 5.3 m under the haul rope, 1.6 m either side), out of the hall's open
    // end to 6 m short of the south station's wall.
    const L = Math.hypot(b.x - a.x, b.z - a.z), ux = (b.x - a.x) / L, uz = (b.z - a.z) / L, rope = w.ropes!.slice(16, 32);
    for (const l of rope) for (const side of [-1.6, 1.6]) for (const down of [5.3, 2.5]) {
      const t0 = Math.max((l.a.x - a.x) * ux + (l.a.z - a.z) * uz, 4), t1 = Math.min((l.b.x - a.x) * ux + (l.b.z - a.z) * uz, L - 6);
      if (t1 <= t0) continue;
      const p = (t: number) => { const f = (t - (l.a.x - a.x) * ux - (l.a.z - a.z) * uz) / Math.hypot(l.b.x - l.a.x, l.b.z - l.a.z); return { x: a.x + ux * t - uz * side, y: l.a.y + (l.b.y - l.a.y) * f - down, z: a.z + uz * t + ux * side }; };
      const [q0, q1] = [p(t0), p(t1)], d = Math.hypot(q1.x - q0.x, q1.y - q0.y, q1.z - q0.z);
      expect(raycast(w.index, q0.x, q0.y, q0.z, (q1.x - q0.x) / d, (q1.y - q0.y) / d, (q1.z - q0.z) / d, d), `cabin's way at ${q0.x.toFixed(0)},${q0.y.toFixed(0)},${q0.z.toFixed(0)}`).toBeNull();
    }
    // The ending's zone on its line, out over the water.
    const z = w.zones.find(q => q.kind === 'ending:cable')!.box, f = ((z.x0 + z.x1) / 2 - a.x) / (b.x - a.x);
    expect(Math.abs(a.z + (b.z - a.z) * f - (z.z0 + z.z1) / 2), 'the ending on the rope\'s line').toBeLessThan(1);
    // The operator key in the control desk's drawer; cabin 2 at the platform, its floor his to stand on.
    const key = w.inter.find(i => i.id.startsWith(`${S.prefix}-`) && (i.data?.items as [string, number][] | undefined)?.some(([id]) => id === 'opkey'))!;
    expect(key.en).toBe('Control desk drawer');
    expect(Math.abs(key.y - S.heart.y), 'up in its hall').toBeLessThan(2);
    const cab = one('cable:cabin');
    expect(Math.hypot(cab.x - S.heart.x, cab.z - S.heart.z)).toBeLessThan(3);
    expect(room(cab.x - cab.nx! * 0.8, floorAt(cab.x - cab.nx! * 0.8, cab.y + 0.3, cab.z - cab.nz! * 0.8)!, cab.z - cab.nz! * 0.8), 'room in the cabin').toBe(true);
  });

  it("its bullwheel lurches and drags him in by its rim; its brake set, it's still", () => {
    const f = one('cable:bullwheel'), lever = w.inter.find(i => i.kind === 'cablebrake')!;
    // In its nip, on the walkway past its rim.
    const toward = { x: lever.x - f.x, z: lever.z - f.z }, d = Math.hypot(toward.x, toward.z);
    const nip = { x: f.x + (toward.x / d) * (WHEEL.r + 0.5), z: f.z + (toward.z / d) * (WHEEL.r + 0.5) };
    const s = at(nip.x, floorAt(nip.x, f.y + 0.3, nip.z)! + 0.05, nip.z);
    s.flags.god = false;
    let hurt = 0, groan = 0;
    const T = WHEEL.cycle.reduce((a, b) => a + b, 0);
    run(s, w, secs(T + 1), {}, st => { for (const e of st.events) { if (e.t === 'hurt' && e.cause === 'bullwheel') hurt++; if (e.t === 'sfx' && e.id === 'force') groan++; } });
    expect(hurt, 'dragged in').toBeGreaterThan(0);
    expect(groan, 'heard straining first').toBeGreaterThan(0);
    // The brake set (held at its lever), the wheel's still: a whole cycle stood in its nip, unhurt.
    const t = at(lever.x + (f.x - lever.x) * 0.15, lever.y - 1.15, lever.z + (f.z - lever.z) * 0.15);
    work(t, lever.id, WHEEL.brake + 2);
    expect(t.wstate.open['cable-brake'], 'the brake set').toBe(true);
    teleport(t.player, nip.x, floorAt(nip.x, f.y + 0.3, nip.z)! + 0.05, nip.z);
    t.flags.god = false;
    let after = 0;
    run(t, w, secs(T + 1), {}, st => { for (const e of st.events) if (e.t === 'hurt' && e.cause === 'bullwheel') after++; });
    expect(after).toBe(0);
    expect(wheelState(t)).toBe('still');
  });
});
