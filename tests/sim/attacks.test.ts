// M10-46 (U-104): every enemy attacks like it means it. Each kind fights him in a cycle it shows (sim/combat.ts
// ATTACK): it winds up before every strike, strikes only in its strike (its rounds, its prod, its dive, its drop),
// recovers after, repositions, and holds its distance: never inside his body, a gunner never nearer than its range.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { solid, type Solid } from '../../src/world/geom';
import { unitPose, type Unit } from '../../src/sim/units';
import { leave } from '../../src/sim/alert';
import { ATTACK } from '../../src/sim/combat';
import { BODY } from '../../src/sim/damage';
import { movement as M } from '../../src/data/movement';
import type { Patrol } from '../../src/world/world';
import type { UnitKind } from '../../src/data/units';
import type { SimState } from '../../src/sim/types';

const FLY = new Set<UnitKind>(['drone', 'hunter']);
const stand = (unit: Patrol['unit'], z: number, y: number): Patrol => ({ kind: FLY.has(unit) ? 'drone' : 'street', unit, pts: [{ x: 0, y, z }, { x: 0, y, z: z + 0.01 }], dwell: [600, 600], hours: [0, 24] });

type Tick = { ph?: string; x: number; y: number; z: number; hit: boolean };
/** Its fight, `secs` long: him standing at the origin (unhurt), it `z` m off (and `y` up), fully aware of him. */
function fightOf(kind: UnitKind, z: number, long: number, y = 0, more: Solid[] = []) {
  const under = kind === 'crawler' ? [{ kind: 'under', lit: true, box: { x0: -100, y0: -10, z0: -100, x1: 100, y1: 10, z1: 100 } }] : [];
  const { world, state } = setup([floor(0, 300), ...more], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [stand(kind, z, y)], zones: under });
  state.time = 12 * 3600; state.flags.god = true; state.flags.clear = true; state.weather = { fog: 0, rain: 0 };
  const u = state.units.find(q => q.kind === kind && !q.extra)!;
  u.aware = 1.5; u.seen = { ...state.player.pos };
  return { u, log: record(state, world, u, long) };
}

function record(state: SimState, world: Parameters<typeof unitPose>[0], u: Unit, long: number, hit = (s: SimState) => s.events.some(e => e.t === 'shot' || (e.t === 'hurt' && e.cause === 'prod'))) {
  const log: Tick[] = [];
  // (Where it is from him: a blast throws him.)
  run(state, world, secs(long), {}, s => { const p = unitPose(world, u, s.time), P = s.player.pos; log.push({ ph: u.atk?.ph, x: p.x - P.x, y: p.y - P.y, z: p.z - P.z, hit: hit(s) }); s.body.hp = 100; s.player.stun = 0; });
  return log;
}

/** Its phases in the order it went through them, each once a time. */
const phases = (log: Tick[]) => log.map(t => t.ph).filter((p, i, a) => p && p !== a[i - 1]) as string[];

/** Every strike came straight after a wind-up, every recovery straight after a strike; at least `n` strikes; what it
 *  does to him only while striking, and the first of it after a wind-up. */
function cycles(log: Tick[], n: number) {
  const ps = phases(log);
  ps.forEach((p, i) => { if (p === 'strike') expect(ps[i - 1]).toBe('windup'); if (p === 'recover') expect(ps[i - 1]).toBe('strike'); if (p === 'windup' && i) expect(ps[i - 1]).toBe('move'); });
  expect(ps.filter(p => p === 'strike').length).toBeGreaterThanOrEqual(n);
  expect(ps.filter(p => p === 'recover').length).toBeGreaterThanOrEqual(n);
  const hits = log.filter(t => t.hit);
  expect(hits.length).toBeGreaterThan(0);
  for (const t of hits) expect(t.ph).toBe('strike');
  expect(log.findIndex(t => t.ph === 'windup')).toBeLessThan(log.findIndex(t => t.hit));
}

/** Its body's edge from his (m, less than 0 inside it), across the ground. */
const gap = (kind: UnitKind, t: Tick) => Math.hypot(Math.max(Math.abs(t.x) - M.width / 2, 0), Math.max(Math.abs(t.z) - M.width / 2, 0)) - BODY[kind][2];
const dist = (t: Tick) => Math.hypot(t.x, t.z);

describe('every enemy attacks like it means it (M10-46)', () => {
  it('a quadruped stalks round him, crouches, lunges in to prod him and backs off', () => {
    const { log } = fightOf('quadruped', 8, 12);
    cycles(log, 3);
    for (const t of log) expect(gap('quadruped', t)).toBeGreaterThan(-0.01);
    // Backed off out of reach once each recovery's done, and the lunge took it from there to arm's length.
    const A = ATTACK.quadruped!;
    log.forEach((t, i) => { if (t.ph === 'move' && log[i - 1]?.ph === 'recover') expect(dist(t)).toBeGreaterThan(A.near - 0.5); });
    log.forEach((t, i) => { if (t.ph === 'windup' && log[i - 1]?.ph === 'move') expect(dist(t)).toBeGreaterThan(2); });
  });
  it('a crawler skitters off to the side, rears and pounces, and backs off', () => {
    const { log } = fightOf('crawler', 6, 12);
    cycles(log, 3);
    for (const t of log) expect(gap('crawler', t)).toBeGreaterThan(-0.01);
    // Each time it came at him from another side than the last.
    const from = log.filter((t, i) => t.ph === 'windup' && log[i - 1]?.ph === 'move').map(t => Math.atan2(t.z, t.x));
    expect(new Set(from.map(a => Math.round(a * 2))).size).toBeGreaterThan(1);
  });
  it('a humanoid sets, fires its bursts standing, and moves between them, never nearer than 8 m', () => {
    const { u, log } = fightOf('humanoid', 25, 16);
    cycles(log, 4);
    // Standing still from its wind-up to the end of its recovery; on the move between.
    log.forEach((t, i) => { const q = log[i - 1]; if (q && (t.ph === 'strike' || t.ph === 'recover') && (q.ph === 'strike' || q.ph === 'windup' || q.ph === 'recover')) expect(Math.hypot(t.x - q.x, t.z - q.z)).toBeLessThan(0.02); });
    expect(log.filter(t => t.ph === 'move').some((t, i, a) => i && Math.hypot(t.x - a[i - 1].x, t.z - a[i - 1].z) > 0.02)).toBe(true);
    expect(Math.min(...log.map(dist))).toBeGreaterThan(ATTACK.humanoid!.near - 1);
    expect(u.state).toBe('engaged');
  });
  it('a humanoid that finds him too near backs off to its range between volleys', () => {
    const { log } = fightOf('humanoid', 4, 8);
    cycles(log, 2);
    expect(dist(log[log.length - 1])).toBeGreaterThan(ATTACK.humanoid!.near);
  });
  for (const [kind, z] of [['heavy', 30], ['spider', 40], ['colossus', 35]] as const) it(`a ${kind} plants, fires, recovers and shifts along, holding its range`, () => {
    const { log } = fightOf(kind, z, 16);
    cycles(log, 2);
    const A = ATTACK[kind]!;
    expect(Math.min(...log.map(dist))).toBeGreaterThan(A.near - 1);
    // Shifted between volleys: somewhere else at the second wind-up than at the first.
    const ups = log.filter((t, i) => t.ph === 'windup' && log[i - 1]?.ph === 'move');
    expect(ups.length).toBeGreaterThanOrEqual(2);
    expect(Math.hypot(ups[1].x - ups[0].x, ups[1].z - ups[0].z)).toBeGreaterThan(0.5);
  });
  it('a walker holds its ground on a ledge rather than step off it to shift along', () => {
    // A heavy on a raised strip 3 m wide, 3 m up, him down on the street 30 m off: its step aside would take it off.
    // (Up there throughout: him thrown up a little by its rockets.)
    const { log } = fightOf('heavy', 30, 12, 3, [solid(-1.5, 0, 20, 1.5, 3, 60)]);
    cycles(log, 2);
    for (const t of log) { expect(t.y).toBeGreaterThan(1.5); expect(Math.abs(t.x)).toBeLessThan(1.5 + BODY.heavy[2]); }
  });
  it('a patrol drone hangs, makes a run in past his side and pulls away up and out, never over him', () => {
    const { log } = fightOf('drone', 20, 14, 9);
    // (Unarmed: its run is the strike, nothing fired.)
    const ps = phases(log);
    ps.forEach((p, i) => { if (p === 'strike') expect(ps[i - 1]).toBe('windup'); if (p === 'recover') expect(ps[i - 1]).toBe('strike'); });
    expect(ps.filter(p => p === 'strike').length).toBeGreaterThanOrEqual(2);
    expect(Math.min(...log.map(dist))).toBeGreaterThan(ATTACK.drone!.near - 2);
    // Nearer at the end of its run than when it began it, and out again after its recovery.
    const ends = (a: string, b: string) => log.filter((t, i) => t.ph === b && log[i - 1]?.ph === a).map(dist);
    expect(Math.max(...ends('strike', 'recover'))).toBeLessThan(Math.min(...ends('recover', 'move')));
  });
  it('a hunter drone makes attack runs, firing its bursts only on the run in, and pulls away', () => {
    const { log } = fightOf('hunter', 15, 14, 8);
    cycles(log, 3);
    expect(Math.min(...log.map(dist))).toBeGreaterThan(ATTACK.hunter!.near - 2);
    const ends = (a: string, b: string) => log.filter((t, i) => t.ph === b && log[i - 1]?.ph === a).map(dist);
    expect(Math.max(...ends('strike', 'recover'))).toBeLessThan(Math.min(...ends('recover', 'move')));
  });
  it('a kamikaze brakes and hangs before it dives, and is spent', () => {
    const { world, state } = setup([floor(0, 300)], { x: 0, y: 0, z: 0, yaw: 0 }, { docks: [{ x: 40, y: 10, z: 0 }] });
    state.time = 12 * 3600; state.flags.god = true; state.flags.clear = true; state.weather = { fog: 0, rain: 0 };
    const u = state.units.find(q => q.kind === 'fpv')!;
    leave(state, world, u, 'hunt', { ...state.player.pos }); u.sent = state.time; u.aware = 1.5; u.state = 'engaged'; u.seen = { ...state.player.pos };
    const log: Tick[] = [];
    let boom = -1;
    run(state, world, secs(8), {}, (s, i) => { if (s.events.some(e => e.t === 'blast') && boom < 0) boom = i; if (u.trip) { const p = u.trip.pos, P = s.player.pos; log.push({ ph: u.atk?.ph, x: p.x - P.x, y: p.y - P.y, z: p.z - P.z, hit: false }); } });
    expect(phases(log)).toEqual(['windup', 'strike']);
    const hang = log.filter(t => t.ph === 'windup');
    expect(hang.length).toBeGreaterThanOrEqual(secs(ATTACK.fpv!.windup) - 1);
    expect(Math.hypot(hang[hang.length - 1].x - hang[0].x, hang[hang.length - 1].z - hang[0].z)).toBeLessThan(1);
    expect(dist(hang[0])).toBeGreaterThan(4);
    expect(boom).toBeGreaterThan(log.findIndex(t => t.ph === 'windup'));
    expect(u.dead).toBe(true);
  });
  it('a bomb dropper steadies over him, drops, slides off aside and comes back, high over him', () => {
    const { world, state } = setup([floor(0, 300)], { x: 0, y: 0, z: 0, yaw: 0 }, { docks: [{ x: 30, y: 10, z: 0 }] });
    state.time = 12 * 3600; state.flags.god = true; state.flags.clear = true; state.weather = { fog: 0, rain: 0 };
    const u = state.units.find(q => q.kind === 'bomber')!;
    leave(state, world, u, 'hunt', { ...state.player.pos }); u.sent = state.time; u.aware = 1.5; u.state = 'engaged'; u.seen = { ...state.player.pos };
    const log = record(state, world, u, 16, s => s.events.some(e => e.t === 'sfx' && e.id === 'drop'));
    cycles(log, 2);
    for (const t of log) expect(t.y).toBeGreaterThan(8);
    // Off aside after each drop, then back over him for the next.
    const outs = log.filter((t, i) => t.ph === 'move' && log[i - 1]?.ph === 'recover').map(dist), ups = log.filter((t, i) => t.ph === 'windup' && log[i - 1]?.ph === 'move').map(dist);
    expect(Math.min(...outs)).toBeGreaterThan(4);
    expect(Math.max(...ups)).toBeLessThan(3);
  });
});
