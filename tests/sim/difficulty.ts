// M9-01: the difficulty statistics. Seeded trials in the built city: how long he goes unseen moving through each
// district (by day and by night, upright, at a sprint, crouched, or crouched still against a wall); how often a
// sensible player who's been had gets away (contact broken, and the search over without finding him); and how many
// days a simple forager lives on what he finds. The bands below are what the numbers are kept inside.
import type { World } from '../../src/world/world';
import type { SimState } from '../../src/sim/types';
import { B, emptyInput } from '../../src/sim/types';
import { createState, step } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { navPath } from '../../src/sim/nav';
import { NAV } from '../../src/world/world';
import { raycast } from '../../src/world/geom';
import { districtOf } from '../../src/sim/district';
import { unitPose, type Unit } from '../../src/sim/units';
import { makeRng, rand, randInt, hashString, type Rng } from '../../src/sim/rng';
import { enterHide, fits } from '../../src/sim/hide';
import { ALERT } from '../../src/sim/alert';
import { SCALE, GAME_PER_TICK } from '../../src/sim/clock';
import { startRun, START_CRATE } from '../../src/sim/run';
import { passTime } from '../../src/sim/body';
import { sleepUntil } from '../../src/sim/sleep';
import { eat, spoiled, shelfLeft } from '../../src/sim/food';
import { item } from '../../src/data/items';
import { openContainer, CONTAINER, type ContainerType } from '../../src/sim/containers';
import { grid, addItem, takeStack, type Stack } from '../../src/sim/inventory';
import type { Inter } from '../../src/world/world';

type V3 = { x: number; y: number; z: number };

/** The target bands (M9-01), and why. Detection is the first machine fully aware of him (Engaged), real seconds:
 *  careless (upright by day) he's had within a block or two, careful (crouched by night) he gets several times as
 *  far, lying low by night most trials see a minute out. Escapes: hard, not hopeless. */
export const BANDS = {
  /** median s to be had moving upright (a jog or a sprint) by day */
  careless: [4, 30],
  /** median s crouch-walking by night (unseen trials counted at the cap) */
  careful: [20, Infinity],
  /** the share of trials crouched still against a wall by night that go unseen to the cap */
  lyingLow: [0.5, 1],
  /** the share of pursuits a sensible player gets away from */
  escape: [0.3, 0.75],
} as const;

/** Each district's street points (the nav graph's, on a street stretch), made once. */
const streets = new WeakMap<World, Map<string, V3[]>>();
export function streetPts(w: World, d: string): V3[] {
  let m = streets.get(w);
  if (!m) {
    m = new Map();
    const nav = w.nav!;
    nav.pts.forEach((p, i) => { if (nav.adj[i].some(e => e[2] === NAV.street)) { const k = districtOf(p.x, p.z); if (!m!.has(k)) m!.set(k, []); m!.get(k)!.push(p); } });
    streets.set(w, m);
  }
  return m.get(d) ?? [];
}
export const DISTRICTS = ['jiefangbei', 'jiaochangkou', 'shibati', 'xiaoshizi', 'hongyadong', 'chaotianmen', 'yuzhong'];

/** A fresh state at a day or night hour, the sky clear. */
function fresh(w: World, seed: number, night: boolean, r: Rng): SimState {
  const s = createState(seed, w);
  s.flags.clear = true; s.weather = { fog: 0, rain: 0 };
  s.time = (night ? 22 + rand(r) * 4 : 10 + rand(r) * 6) * 3600;
  return s;
}

/** His legs, a tick at a time: facing the point, forward at the gait, sidestepping a while when he gets no nearer and
 *  hopping when he's stood (walker.ts's way, so the trial can watch the machines between ticks). */
function legs() {
  let best = Infinity, stall = 0, dodge = 0, way = 1, still = 0, last = { x: 0, z: 0 }, t = 0;
  return {
    reset() { best = Infinity; stall = 0; dodge = 0; t = 0; },
    step(s: SimState, w: World, q: V3, buttons: number) {
      const p = s.player.pos, dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
      if (d < best - 0.05) { best = d; stall = 0; } else if (++stall > 40 && dodge <= 0) { dodge = 30; way = -way; stall = 0; }
      const yaw = Math.atan2(-dx, -dz), hop = still > 30 && still % 40 < 2, side = dodge-- > 0 ? way : 0;
      tick(s, w, { yaw, my: 1, mx: side, buttons: buttons | (hop ? B.JUMP : 0), pressed: hop ? B.JUMP : 0 });
      if (Math.hypot(p.x - last.x, p.z - last.z) < 0.02) still++; else { still = 0; last = { x: p.x, z: p.z }; }
      t++;
      return t;
    },
  };
}
function tick(s: SimState, w: World, f: Partial<ReturnType<typeof emptyInput>> = {}) {
  step(s, w, { ...emptyInput(), yaw: s.player.yaw, pitch: s.player.pitch, ...f });
}

/** Along a way: one tick toward its next point, on to the one after once within 1.5 m (or after long enough held up). */
function follower(way: V3[], buttons: number) {
  const L = legs();
  let i = 0;
  return {
    done: () => i >= way.length,
    step(s: SimState, w: World) {
      if (i >= way.length) { tick(s, w, { buttons }); return; }
      const q = way[i], p = s.player.pos;
      const t = L.step(s, w, q, buttons);
      if ((Math.hypot(q.x - p.x, q.z - p.z) < 1.5 && Math.abs(q.y - p.y) < 2.5) || t > 60 * 8) { i++; L.reset(); }
    },
  };
}

/** A street way from a to somewhere from `near` to `far` m off (away from `from` if given), or null. */
function wayOut(w: World, r: Rng, a: V3, d: string, near: number, far: number, from?: V3): V3[] | null {
  const pts = streetPts(w, d).length > 50 ? streetPts(w, d) : streetPts(w, 'yuzhong');
  for (let k = 0; k < 40; k++) {
    const b = pts[randInt(r, pts.length)], L = Math.hypot(b.x - a.x, b.z - a.z);
    if (L < near || L > far) continue;
    if (from && k < 30 && ((b.x - a.x) * (from.x - a.x) + (b.z - a.z) * (from.z - a.z)) / (L * (Math.hypot(from.x - a.x, from.z - a.z) || 1)) > -0.2) continue;
    const p = navPath(w.nav!, a, b, 'street');
    if (p && p.length < far * 2) return p.pts;
  }
  return null;
}

/** A spot against a wall by a street point: 0.5 m off the nearest wall within 6 m round it, at chest height. */
function nook(w: World, a: V3): V3 | null {
  let best: V3 | null = null, bd = 6;
  for (let k = 0; k < 8; k++) {
    const dx = Math.sin((k * Math.PI) / 4), dz = Math.cos((k * Math.PI) / 4), h = raycast(w.index, a.x, a.y + 1, a.z, dx, 0, dz, 6);
    if (h && h.t < bd && h.t > 0.8) { bd = h.t; best = { x: a.x + dx * (h.t - 0.5), y: a.y + 0.05, z: a.z + dz * (h.t - 0.5) }; }
  }
  return best;
}

/** Whether some machine has him: fully aware, and it's seen him this think (a tenth of a second). */
function contact(s: SimState): Unit | null {
  for (const u of s.units) if ((u.aware ?? 0) >= ALERT.engaged && u.saw !== undefined && s.time - u.saw <= 7 * GAME_PER_TICK && !u.dead) return u;
  return null;
}

export type Gait = 'jog' | 'sprint' | 'crouch' | 'still';
const BTN: Record<Gait, number> = { jog: 0, sprint: B.SPRINT, crouch: B.CROUCH, still: B.CROUCH };

/** How long (real s) he goes unseen moving through a district, from a random street point along random street ways,
 *  or crouched still against a wall: null if no machine has him within the cap. Also the first one suspicious of him. */
export function detection(w: World, o: { district: string; night: boolean; gait: Gait; seed: number; cap: number }) {
  const r = makeRng(hashString(`det:${o.district}:${o.night}:${o.gait}:${o.seed}`)), s = fresh(w, o.seed, o.night, r), pts = streetPts(w, o.district);
  let at: V3 | null = null, way: V3[] | null = null;
  for (let k = 0; k < 30 && !(at && (way || o.gait === 'still')); k++) {
    const a = pts[randInt(r, pts.length)];
    if (o.gait === 'still') at = nook(w, a);
    else { at = a; way = wayOut(w, r, a, o.district, 80, 250); }
  }
  if (!at) return null;
  teleport(s.player, at.x, at.y + 0.05, at.z);
  for (let i = 0; i < 4; i++) tick(s, w, { buttons: BTN[o.gait] });
  let f = follower(way ?? [], BTN[o.gait]), sus: number | null = null;
  for (let i = 0; i < o.cap * 60; i++) {
    if (f.done() && o.gait !== 'still') f = follower(wayOut(w, r, s.player.pos, o.district, 80, 250) ?? [], BTN[o.gait]);
    f.step(s, w);
    const u = contact(s);
    if (sus === null && s.units.some(q => (q.aware ?? 0) >= ALERT.suspicious)) sus = i / 60;
    if (u || s.dead) return { t: i / 60, sus, by: u?.kind ?? 'killed', night: o.night, gait: o.gait, district: o.district };
  }
  return { t: null, sus, by: null, night: o.night, gait: o.gait, district: o.district };
}

export type Means = 'run' | 'hide' | 'jam';
export type Pursuer = 'quadruped' | 'humanoid' | 'drone' | 'camera';

/** The hiding place nearest him on the street (a nook, a crate, a dumpster, a car's boot) he can run to, not past what's
 *  after him: the way there and in, and which it is. */
function hideOut(w: World, at: V3, from: V3): { way: V3[]; hide: number } | null {
  const near = w.hides.map((h, i) => ({ h, i, c: { x: (h.inner.x0 + h.inner.x1) / 2, y: h.inner.y0, z: (h.inner.z0 + h.inner.z1) / 2 } }))
    .filter(({ h, i, c }) => h.kind !== 'wardrobe' && h.kind !== 'tank' && Math.abs(c.y - at.y) < 6 && Math.hypot(c.x - at.x, c.z - at.z) < 120 && fits(w, i))
    .map(e => {
      const dx = e.c.x - at.x, dz = e.c.z - at.z, L = Math.hypot(dx, dz) || 1, fx = from.x - at.x, fz = from.z - at.z;
      return { ...e, score: L + ((dx * fx + dz * fz) / (L * (Math.hypot(fx, fz) || 1)) > 0.3 ? 80 : 0) };
    }).sort((a, b) => a.score - b.score);
  for (const e of near.slice(0, 8)) {
    const p = navPath(w.nav!, at, e.c, 'street');
    if (!p || !p.pts.length) continue;
    const end = p.pts[p.pts.length - 1];
    // (Most are off the street, in an alley or a yard: a short way over open ground from its nearest point.)
    if (Math.hypot(end.x - e.c.x, end.z - e.c.z) > 16 || Math.abs(end.y - e.c.y) > 1.5) continue;
    const L = Math.hypot(end.x - e.c.x, end.z - e.c.z) || 1;
    return { way: [...p.pts, { x: e.c.x + ((end.x - e.c.x) / L) * 0.9, y: e.c.y, z: e.c.z + ((end.z - e.c.z) / L) * 0.9 }], hide: e.i };
  }
  return null;
}

/** A pursuit: a machine of the kind in the district has him at about `dist` m (by day or night), and a sensible player
 *  gets away by his means: sprints off the way he isn't being watched from and crouches still (run); to the nearest
 *  street hiding place and into it (hide); or the same with the jammer on until he's in (jam). The outcome: escaped
 *  (contact broken and the search over without finding him), found (had again after contact was broken), killed, or
 *  held (still on him at the cap); and when contact was broken (real s). `watch` cuts the search short: unfound after
 *  that long it counts as escaped (the fast test's). */
export function escape(w: World, o: { district: string; night: boolean; pursuer: Pursuer; dist: number; means: Means; seed: number; watch?: number; god?: boolean }) {
  const r = makeRng(hashString(`esc:${o.district}:${o.night}:${o.pursuer}:${o.dist}:${o.means}:${o.seed}`)), s = fresh(w, o.seed, o.night, r);
  const of = (u: Unit) => (o.pursuer === 'camera' ? u.cam !== undefined && ['camera', 'sweeper', 'lamppost'].includes(w.cameras[u.cam].kind) : u.kind === o.pursuer && u.patrol >= 0 && !u.extra && !u.reserve);
  const cands = s.units.filter(of).map(u => ({ u, q: unitPose(w, u, s.time) })).filter(({ q }) => q.active && !q.docked && districtOf(q.x, q.z) === o.district);
  const pts = streetPts(w, o.district);
  let pick: { u: Unit; at: V3 } | null = null;
  for (let k = 0; k < 40 && !pick && cands.length; k++) {
    const { u, q } = cands[randInt(r, cands.length)];
    const ok = pts.filter(p => Math.abs(Math.hypot(p.x - q.x, p.z - q.z) - o.dist) < 3 && Math.abs(p.y - q.y) < (o.pursuer === 'drone' || o.pursuer === 'camera' ? 15 : 3));
    if (ok.length) pick = { u, at: ok[randInt(r, ok.length)] };
  }
  if (!pick) return null;
  const { u } = pick, p = s.player;
  s.flags.god = !!o.god;
  teleport(p, pick.at.x, pick.at.y + 0.05, pick.at.z);
  for (let i = 0; i < 4; i++) tick(s, w);
  u.quiet = undefined; u.aware = 1.2; u.seen = { ...p.pos }; u.saw = s.time;
  const from = unitPose(w, u, s.time);
  // His plan.
  let plan = o.means === 'run' ? null : hideOut(w, p.pos, from);
  const way = plan?.way ?? wayOut(w, r, p.pos, o.district, 60, 160, from) ?? [];
  const means = plan ? o.means : 'run';
  if (means === 'jam') {
    addItem(s, s.inv.pack, 'jammer', 1, { charge: 100 });
    tick(s, w, { cmds: [{ c: 'use', uid: s.inv.pack.items.find(i => i.id === 'jammer')!.uid }] });
  }
  const f = follower(way, B.SPRINT);
  let last = s.time, lostAt = -1, hidden = false, tries = 0;
  const t0 = s.time, res = (outcome: string) => ({ outcome, t: (s.time - t0) / SCALE, lost: lostAt < 0 ? null : (lostAt - t0) / SCALE, means, pursuer: o.pursuer, dist: o.dist, night: o.night, district: o.district });
  for (let i = 0; i < 360 * 60; i++) {
    if (s.dead) return res(`killed: ${s.dead}`);
    if (!f.done()) f.step(s, w);
    else if (plan && !hidden && p.mode !== 'hidden') {
      // In at the end of the way (a second or two's try if he isn't quite at it).
      const b = w.hides[plan.hide].inner, reach = Math.hypot((b.x0 + b.x1) / 2 - p.pos.x, (b.z0 + b.z1) / 2 - p.pos.z) < 1.6 && Math.abs(b.y0 - p.pos.y) < 0.8;
      if (p.mode === 'ground' && reach && enterHide(s, w, plan.hide)) hidden = true; else if (++tries > 120) plan = null;
      tick(s, w);
    } else {
      // Off with the jammer once he's in (left on, it would be a beacon).
      if (s.jam && p.mode === 'hidden') { tick(s, w, { cmds: [{ c: 'use', uid: s.inv.pack.items.find(i => i.id === 'jammer')!.uid }] }); continue; }
      tick(s, w, { buttons: p.mode === 'hidden' ? 0 : B.CROUCH });
    }
    const c = contact(s);
    if (c) { if (lostAt >= 0) return res('found'); last = s.time; }
    else if (lostAt < 0 && (s.time - last) / SCALE >= 4) lostAt = s.time;
    if (lostAt >= 0) {
      const busy = Object.values(s.hive.districts).some(D => D.state === 'engaged' || D.state === 'searching');
      if (!busy && (s.time - lostAt) / SCALE > 20) return res('escaped');
      if (o.watch && (s.time - lostAt) / SCALE > o.watch) return res('escaped');
    }
  }
  return res('held');
}

/** The median of the times, unseen ones counted at the cap. */
export const median = (ts: (number | null)[], cap: number) => {
  const a = ts.map(t => t ?? cap).sort((x, y) => x - y);
  return a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : NaN;
};

/** A fresh run lived by a simple forager (the needs alone; what the machines do to him is the other two measures'):
 *  each day he's out from 07:00 for five game hours, searching the nearest container he hasn't (sites' and locked ones
 *  left alone), or with no water left the nearest running tap to fill his empty bottles, home in time; he eats and drinks whenever a
 *  need's under 60 (nothing spoiled or raw), keeps what he found in the stash, and sleeps 22:00 to 06:00 in the bed
 *  (or rough). He walks 2 m/s along ways 1.4 times the straight line, 3 m of way for each metre up or down. The days
 *  until he dies (null if he lives to the cap), and what he found and ate; and the real seconds a day he spent going
 *  from one building to another (legs over 12 m), the time a machine could see him. */
export function forage(w: World, seed: number, capDays = 30) {
  const s = createState(seed, w);
  startRun(s, w);
  const home = { ...s.player.pos }, d3 = (a: V3, b: V3) => Math.hypot(a.x - b.x, a.z - b.z) * 1.4 + Math.abs(a.y - b.y) * 3;
  const bed = w.inter.some(i => i.kind === 'mattress' && Math.hypot(i.x - home.x, i.y - home.y, i.z - home.z) < 15);
  const stash = s.containers[START_CRATE] ?? (s.containers[START_CRATE] = grid(10, 8));
  const pool: Inter[] = w.inter.filter(i => (i.kind === 'container' && !i.data?.tier && i.data?.lock !== 'locked' && i.id !== START_CRATE) || (i.kind === 'sink' && i.data?.running))
    .filter(i => Math.hypot(i.x - home.x, i.z - home.z) < 600);
  const done = new Set<string>();
  let found = 0, ate = 0, outside = 0, searched = 0;
  const pass = (realSecs: number) => { const h = (realSecs * SCALE) / 3600; passTime(s, h, false); s.time += h * 3600; };
  const edible = (st: Stack) => { const f = item(st.id).food; return !!f && st.id !== 'riverwater' && !f.raw && !spoiled(s, st); };
  const eatUp = () => {
    for (let k = 0; k < 20 && !s.dead; k++) {
      const b = s.body, all = [...s.inv.pack.items, ...(Math.hypot(s.player.pos.x - home.x, s.player.pos.z - home.z) < 5 ? stash.items : [])].filter(edible);
      const want = b.hydration < 60 ? all.filter(st => item(st.id).food!.hydration > 0).sort((a, c) => item(c.id).food!.hydration - item(a.id).food!.hydration)[0]
        : b.satiety < 60 ? all.filter(st => item(st.id).food!.satiety > 0).sort((a, c) => (shelfLeft(s, a) ?? 1e9) - (shelfLeft(s, c) ?? 1e9))[0] : undefined;
      if (!want) return;
      // (From the stash he takes it into his pack to eat: eat() eats from the pack.)
      if (stash.items.includes(want)) { takeStack(stash, want.uid); s.inv.pack.items.push(want); }
      eat(s, want); ate++;
    }
  };
  const go = (to: V3) => { const L = d3(s.player.pos, to), secs = L / 2; if (L > 12 * 1.4) outside += secs; pass(secs); Object.assign(s.player.pos, { x: to.x, y: to.y, z: to.z }); eatUp(); };
  for (let day = 1; day <= capDays; day++) {
    const atHome = (until: number) => { while (!s.dead && s.time < until) { pass(Math.min(60, ((until - s.time) / SCALE))); eatUp(); } };
    atHome((day - 1) * 86400 + 7 * 3600);
    const back = s.time + 5 * 3600;
    while (!s.dead) {
      // (Short of water with empty bottles on him, the nearest tap first.)
      const at = s.player.pos, bottles = s.inv.pack.items.some(i => i.id === 'bottle'), dry = bottles && ![...s.inv.pack.items, ...stash.items].some(i => i.id === 'water');
      let next: Inter | null = null, nd = Infinity;
      for (const i of pool) {
        if (done.has(i.id) || (i.kind === 'sink' && !bottles) || (dry && i.kind !== 'sink')) continue;
        const d = d3(at, i);
        if (d < nd) { nd = d; next = i; }
      }
      // (Home in time: there and back within the trip.)
      if (!next || s.time + ((nd + d3(next, home)) / 2 + 5) * SCALE > back) break;
      go(next);
      if (next.kind === 'sink') { for (const b of s.inv.pack.items) if (b.id === 'bottle') Object.assign(b, { id: 'water', made: s.time }); continue; }
      done.add(next.id); searched++;
      openContainer(s, next);
      pass(CONTAINER[(next.data?.type as ContainerType) in CONTAINER ? (next.data!.type as ContainerType) : 'crate'].time + 3);
      const g = s.containers[next.id];
      for (const st of [...g.items]) if (item(st.id).food || st.id === 'bottle') { if (!addItem(s, s.inv.pack, st.id, st.n, { made: st.made })) { takeStack(g, st.uid); found += st.n; } }
      s.openContainer = null;
      eatUp();
    }
    if (!s.dead) go(home);
    for (const st of [...s.inv.pack.items]) if (item(st.id).food && !addItem(s, stash, st.id, st.n, { made: st.made })) takeStack(s.inv.pack, st.uid);
    // At home till 22:00, then to bed.
    atHome((day - 1) * 86400 + 22 * 3600);
    if (!s.dead) sleepUntil(s, day * 86400 + 6 * 3600, bed ? 'bed' : 'rough');
    if (s.dead) return { days: (s.time - 6 * 3600) / 86400, cause: s.dead, found, ate, searched, outside: outside / day };
  }
  return { days: null, cause: null, found, ate, searched, outside: outside / capDays };
}
