// M7-14: every route can be done, proved from the world as it's built for a run (seed 1, and seed 2 to show it isn't
// one city's luck). Each route's parts (and what each made part is made of, and the bench and the power to make it)
// are found in a container or lying somewhere he can get to; what he can get to grows with his tools, from nothing
// but his start pack: a flood over the floors from the place (reachkit.ts) through only what the tools he's already
// shown he can get open (the game's own lock rules) to the machines' ways joined to his hideout's. Each thing a route
// has him work (a relay, a feeder, a panel, the boat, a door) is reachable the same way; each lock on the way has its
// opener among what he can get; and each gap is within the movement envelope (the rail deck's) or crossed with what
// the route has him carry (the cabin, the trolley on the haul rope, the boat down a river with no break in it).
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { startRun } from '../../src/sim/run';
import { openContainer } from '../../src/sim/containers';
import { addItem, type Stack } from '../../src/sim/inventory';
import { recipe } from '../../src/data/recipes';
import { POWER } from '../../src/sim/power';
import { SHELTER_R } from '../../src/sim/shelter';
import { BOAT, afloat } from '../../src/sim/boat';
import { WATER_Y } from '../../src/world/yuzhong/ground';
import { REACH } from '../../src/data/reach';
import { at, rail, along } from '../../src/world/yuzhong/bridges';
import type { SimState } from '../../src/sim/types';
import { raycast, type Box } from '../../src/world/geom';
import type { Inter, World } from '../../src/world/world';
import { settle } from './helpers';
import { withWays, flood, reachable, standsBy, opens, onWays, type Ways } from './reachkit';

type V3 = { x: number; y: number; z: number };
/** A part a route needs: which item, how many, which of them do (a car battery with charge in it). */
interface Need { key: string; id: string; n: number; ok: (st: Stack) => boolean }
const need = (id: string, n = 1, key = id, ok = (st: Stack) => st.id === id): Need => ({ key, id, n, ok });
const battery = (pct: number, key: string) => need('carbattery', 1, key, st => st.id === 'carbattery' && (st.charge ?? 100) >= pct);
/** The bench's kit: a toolbox for a table; for soldering, a hideout's battery with charge and an inverter. */
const BENCH = [need('toolbox')], POWERED = [battery(POWER.job + 1, 'carbattery'), need('inverter')];
/** The tools that open what's shut (a crowbar, bolt cutters, a lockpick): sought whether a route needs them or not. */
const TOOLS = ['crowbar', 'boltcutters', 'lockpick'].map(id => need(id));

interface Route {
  name: string; needs: Need[];
  /** what he works on its way: by name, the thing */
  works: (w: World) => [string, Inter][];
  /** the locks across its way, each to be opened with what he has */
  locks: (w: World) => Inter[];
  /** its gaps and its last stretch, true when crossed */
  way: (g: Ways, have: Map<string, string>) => [string, boolean][];
}
const one = (w: World, f: (i: Inter) => boolean, what: string) => { const it = w.inter.find(f); expect(it, what).toBeDefined(); return it!; };
const secure = (w: World, id: string) => w.secure!.find(q => q.id === id)!.heart;
const nearest = (w: World, en: string, p: { x: number; z: number }) => w.inter.filter(i => i.kind === 'door' && i.en === en).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
const inBox = (b: Box) => (p: V3) => p.x >= b.x0 && p.x <= b.x1 && p.z >= b.z0 && p.z <= b.z1 && p.y + 1 >= b.y0 && p.y <= b.y1;
const zone = (w: World, route: string) => w.zones.find(z => z.kind === `ending:${route}`)!.box;

/** The Dongshuimen's rail deck from the ground by its north pier: up the pier's ladder onto the deck, along it to the
 *  gap whose stringers are gone, the gap (a running jump, within the envelope, level), and on over the derailed car
 *  to the far end. */
function deck(g: Ways): [string, boolean][] {
  const w = g.w, b = w.bridges![0], pier = w.teleports.find(t => t.name === 'Dongshuimen Bridge: north pier')!;
  const [g0, g1] = b.holes!.find(h => !h[2])!, on = (p: V3) => { const [t, sv] = along(b, p.x, p.z); return { t, sv, ok: Math.abs(sv) < 8 && Math.abs(p.y - rail(b, t)) < 0.6 }; };
  // (Up the pier: from the ground by it to the deck, kept near the pier; then along the deck, kept to it.)
  const by = (p: V3) => Math.hypot(p.x - pier.x, p.z - pier.z) < 30, onDeck = (p: V3) => on(p).ok && on(p).t > b.ta && on(p).t < b.tb;
  const up = flood(g, standsBy(g, { x: pier.x, y: pier.y + 1, z: pier.z }, 0.3), onDeck, 100000, by);
  const near = up && flood(g, [up], p => on(p).t >= g0 - 1 && on(p).t <= g0, 200000, p => onDeck(p) && on(p).t < g0 + 0.5);
  const sv = near ? on(near).sv : -5, floorAt = (t: number) => { const [x, z] = at(b, t, sv), h = raycast(w.index, x, rail(b, t) + 1, z, 0, -1, 0, 1.5); return !!h && Math.abs(1 - h.t) < 0.3; };
  // (A run-up along the deck before it, and the far edge: the first floor across at the deck's height.)
  const runUp = !!near && [1, 2, 3, 4].every(k => floorAt(g0 - 0.5 - k));
  let land = g0 + 20;
  for (let t = g0; t < g0 + 12; t += 0.1) if (floorAt(t)) { land = t; break; }
  // (Over the car: up on its roof, 2 m over the deck, and down off it.)
  const overCar = (p: V3) => { const { t, sv } = on(p), dy = p.y - rail(b, t); return Math.abs(sv) < 8 && dy > -0.6 && dy < 2.6 && t > b.ta && t < b.tb; };
  const [lx, lz] = at(b, land + 0.6, sv), far = flood(g, [{ x: lx, y: rail(b, land + 0.6), z: lz }], inBox(zone(w, 'bridge')), 200000, p => overCar(p) || inBox(zone(w, 'bridge'))(p));
  return [['up the north pier\'s ladder onto the deck', !!up], ['along the deck to the gap', !!near], ['a run-up to it', runUp], [`the gap (${(land - g0).toFixed(1)} m, ${(g1 - g0).toFixed(1)} m of it open) within a running jump`, land - g0 <= REACH.jump.across], ['over the car and on to the far end', !!far]];
}

/** The river from the patrol boat's mooring to the reach past Chaotianmen: open water the hull floats clear in (the
 *  boat's own rule, heading the way it goes) all the way, in 3 m steps. */
function river(w: World): boolean {
  const moor = w.inter.find(i => i.id === 'patrolboat')!, end = zone(w, 'boat'), S = 3, k = (x: number, z: number) => `${Math.round(x / S)},${Math.round(z / S)}`;
  const q = [{ x: moor.x, z: moor.z }], seen = new Set([k(moor.x, moor.z)]);
  for (let i = 0; i < q.length && i < 400000; i++) {
    const { x, z } = q[i];
    if (x >= end.x0 && x <= end.x1 && z >= end.z0 && z <= end.z1) return true;
    for (const [dx, dz] of [[S, 0], [-S, 0], [0, S], [0, -S]]) {
      const nx = x + dx, nz = z + dz;
      if (!seen.has(k(nx, nz)) && afloat(w, WATER_Y, Math.atan2(-dx, -dz), nx, nz)) { seen.add(k(nx, nz)); q.push({ x: nx, z: nz }); }
    }
  }
  return false;
}

const ROUTES: Route[] = [
  {
    name: 'A, over the Dongshuimen', needs: [need('jammer'), need('boltcutters'), need('insgloves')],
    works: w => [['the bridge\'s sensor relay', one(w, i => i.kind === 'busrelay', 'relay')]], locks: () => [], way: deck,
  },
  {
    name: 'B, the cabin', needs: [need('hvfuse'), need('opkey')],
    works: w => [['the cableway\'s feeder', one(w, i => i.kind === 'feeder' && i.data?.route === 'cable', 'feeder')], ['cabin 2\'s panel', one(w, i => i.kind === 'cabin', 'panel')]],
    locks: w => [nearest(w, 'Store cage B', secure(w, 'substation')), nearest(w, 'Upper station', secure(w, 'cableway')), nearest(w, "Operator's booth", secure(w, 'cableway'))],
    way: () => [['ridden across in the cabin', true]],
  },
  {
    name: 'B, the trolley', needs: [need('trolley')],
    works: w => [['the haul rope, from cabin 2\'s roof', one(w, i => i.kind === 'haulrope', 'rope')]],
    locks: w => [nearest(w, 'Upper station', secure(w, 'cableway'))], way: () => [['slid down the haul rope on the trolley', true]],
  },
  {
    name: 'C, the boat', needs: [need('boatkey'), battery(BOAT.crank + 5, 'carbattery:boat'), need('jerrycan')],
    works: w => [['the patrol boat', one(w, i => i.id === 'patrolboat', 'boat')]],
    locks: w => { const k = one(w, i => i.kind === 'container' && !!(i.data?.items as [string, number][] | undefined)?.some(([id]) => id === 'boatkey'), 'key cabinet'); return [w.inter.filter(i => i.kind === 'door' && i.en === 'Evidence room').sort((a, b) => Math.hypot(a.x - k.x, a.z - k.z) - Math.hypot(b.x - k.x, b.z - k.z))[0]]; },
    way: g => [['down the river to the far reach', river(g.w)]],
  },
  {
    name: 'D, under the hill', needs: [need('hvfuse'), need('metrokey'), need('blastcard')],
    works: w => [['the metro\'s feeder', one(w, i => i.kind === 'feeder' && i.data?.route !== 'cable', 'feeder')], ['the pump panel', one(w, i => i.id === 'metro-pumps', 'pumps')], ['the station control room\'s door', one(w, i => i.id === 'metro-control', 'control')], ['the protective door', one(w, i => i.kind === 'blastdoor', 'door')]],
    locks: w => [nearest(w, 'Store cage B', secure(w, 'substation')), w.inter.find(i => i.id === 'metro-control')!, w.inter.find(i => i.kind === 'blastdoor')!],
    way: g => { const d = g.w.inter.find(i => i.kind === 'blastdoor')!; return [['through the drained extension to the way out', !!flood(g, standsBy(g, d, d.r), inBox(zone(g.w, 'tunnel')), 200000)]]; },
  },
];

/** Everything the routes take: each made part's parts, its bench and its power (and, to open the way to them, the
 *  tools, if `tools`). */
function universe(tools = true): Need[] {
  const all = new Map<string, Need>(), add = (n: Need) => {
    if (all.has(n.key)) return;
    all.set(n.key, n);
    const r = recipe(n.id);
    if (r) [...r.parts.map(([id, k]) => need(id, k)), ...BENCH, ...(r.power ? POWERED : [])].forEach(add);
  };
  [...ROUTES.flatMap(r => r.needs), ...(tools ? TOOLS : [])].forEach(add);
  return [...all.values()];
}

/** A run of a seed: the city built for it, what each container holds in it, what lies about, his start. */
function city(seed: number) {
  const w = getWorld('yuzhong', seed), s = createState(seed, w), probe = createState(seed, w);
  startRun(s, w);
  const found = new Map<string, { at: Inter; st: Stack }[]>();
  for (const it of w.inter) {
    if (it.kind !== 'container' || it.id.startsWith('wreck:')) continue;
    if (!s.containers[it.id]) openContainer(probe, it);
    for (const st of (s.containers[it.id] ?? probe.containers[it.id]).items) (found.get(st.id) ?? found.set(st.id, []).get(st.id)!).push({ at: it, st });
  }
  for (const d of s.dropped) (found.get(d.stack.id) ?? found.set(d.stack.id, []).get(d.stack.id)!).push({ at: { id: 'dropped', kind: 'dropped', x: d.x, y: d.y + 0.2, z: d.z, r: 0.4, zh: '', en: 'lying on the floor' }, st: d.stack });
  const p = s.player.pos, start = w.inter.filter(i => i.kind === 'grate').sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
  return { w, s, found, start: start.id, gate: w.features.find(f => f.kind === 'key:hideout gate')! };
}
type City = ReturnType<typeof city>;

/** A state whose pack holds one of each thing he's shown he can get (for the game's lock rules). */
function kit(c: City, have: Map<string, string>): SimState {
  const k = createState(1, c.w);
  for (const id of new Set([...have.keys()].map(key => key.split(':')[0]))) addItem(k, k.inv.pack, id, 1);
  return k;
}

/** What he can get, and where: from his start pack, rounds of looking with the tools found so far until nothing more
 *  turns up. Each need's sources nearest his hideout first; a made thing, at a bench he can get to. */
function solve(c: City) {
  const { w, s, found } = c, needs = universe(), have = new Map<string, string>(), dry = w.flood?.boxes ?? [];
  for (const n of needs) if (s.inv.pack.items.filter(n.ok).reduce((a, st) => a + st.n, 0) >= n.n) have.set(n.key, 'his start pack');
  const tried = new Map<string, number>();
  for (let more = true; more; ) {
    more = false;
    const sig = have.size;
    withWays(w, kit(c, have), c.gate, c.start, dry, g => {
      const ok = (t: Inter) => !!reachable(g, t, t.r);
      for (const n of needs) {
        if (have.has(n.key) || tried.get(n.key) === sig) continue;
        tried.set(n.key, sig);
        const near = (found.get(n.id) ?? []).filter(f => n.ok(f.st) && (f.at.data?.lock !== 'locked' || have.has('crowbar')));
        near.sort((a, b) => Math.hypot(a.at.x - c.gate.x, a.at.z - c.gate.z) - Math.hypot(b.at.x - c.gate.x, b.at.z - c.gate.z));
        let got = 0;
        const from: string[] = [];
        for (const f of near.slice(0, 12)) if (got < n.n && (from.includes(f.at.id) || ok(f.at))) { got += f.st.n; from.push(f.at.id); }
        if (got >= n.n) { have.set(n.key, `${near.find(f => f.at.id === from[0])!.at.en} (${from.join(', ')})`); more = true; continue; }
        const r = recipe(n.id);
        if (r && [...r.parts.map(([id]) => id), ...BENCH.map(b => b.key), ...(r.power ? POWERED.map(b => b.key) : [])].every(k => have.has(k))) {
          const b = bench(g, !!r.power);
          if (b) { have.set(n.key, `made at ${b}`); more = true; }
        }
      }
    });
  }
  return have;
}

/** A table he can get to (and for soldering, a bed he can claim in the same hideout): where. */
function bench(g: Ways, power: boolean): string | null {
  const w = g.w, beds = w.inter.filter(i => i.kind === 'mattress'), gate = w.features.find(f => f.kind === 'key:hideout gate')!;
  const tables = w.inter.filter(i => i.kind === 'table').sort((a, b) => Math.hypot(a.x - gate.x, a.z - gate.z) - Math.hypot(b.x - gate.x, b.z - gate.z));
  for (const t of tables.slice(0, 40)) {
    const bed = beds.find(m => Math.hypot(m.x - t.x, m.y - t.y, m.z - t.z) < SHELTER_R - 1);
    if (power && !bed) continue;
    if (reachable(g, t, t.r) && (!power || reachable(g, bed!, bed!.r))) return `${t.id}${power ? ` by ${bed!.id}` : ''}`;
  }
  return null;
}

for (const seed of [1, 2]) describe(`every route can be done, seed ${seed} (M7-14)`, () => {
  let c: City, have: Map<string, string>;
  it('finds every part of every route where he can get to it, from nothing but his start pack', async () => {
    await settle();
    c = city(seed);
    await settle();
    have = solve(c);
    const missing = universe(false).filter(n => !have.has(n.key)).map(n => n.key);
    expect(missing, `nowhere he can get to: ${missing.join(', ')}`).toEqual([]);
    expect(withWays(c.w, kit(c, new Map()), c.gate, c.start, [], g => !!flood(g, [c.s.player.pos], onWays(g))), 'out of the hideout').toBe(true);
  }, 1500000);
  for (const r of ROUTES) it(`route ${r.name}: its parts got, its work reachable, its locks opened, its gaps crossed`, async () => {
    await settle();
    expect(have, 'solved').toBeDefined();
    for (const n of r.needs) expect(have.get(n.key), n.key).toBeDefined();
    const k = kit(c, have);
    for (const d of r.locks(c.w)) expect([d.en, opens(k, d)], `${d.en}: ${d.data?.lock ?? ''}${d.data?.key ? ` (${d.data.key})` : ''}`).toEqual([d.en, true]);
    withWays(c.w, k, c.gate, c.start, c.w.flood?.boxes ?? [], g => {
      for (const [what, it] of r.works(c.w)) expect([what, !!reachable(g, it, it.r)]).toEqual([what, true]);
      for (const [what, ok] of r.way(g, have)) expect([what, ok]).toEqual([what, true]);
    });
  }, 1500000);
});
