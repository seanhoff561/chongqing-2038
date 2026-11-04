// M10-48 (U-104): machines take fewer hits. Pistol rounds to kill each kind, counted by the game's own hurtUnit:
// dogs and humanoids about half what they took, the other ground machines about a third fewer, drones as they were.
import { describe, it, expect } from 'vitest';
import { setup, floor } from './helpers';
import { hurtUnit } from '../../src/sim/damage';
import type { Unit } from '../../src/sim/units';
import { PISTOL, STATIC, type UnitKind } from '../../src/data/units';
import type { Camera, Patrol } from '../../src/world/world';

/** One machine of a kind, at noon. */
function one(kind: UnitKind) {
  const mounted = STATIC.has(kind);
  const patrols: Patrol[] = mounted ? [] : [{ kind: 'street', unit: kind, pts: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -30 }], dwell: [600, 5], hours: [0, 24] }];
  const cameras: Camera[] = mounted ? [{ kind: kind as Camera['kind'], x: 0, y: 4, z: 0, yaw: 0, ...(kind === 'tripwire' ? { to: { x: 3, y: 4, z: 0 } } : {}) }] : [];
  const { world, state } = setup([floor(0, 200)], { x: 0, y: 0, z: 10, yaw: 0 }, { patrols, cameras });
  state.time = 12 * 3600; state.flags.god = true;
  return { world, state, u: state.units[0] as Unit };
}
/** Pistol rounds to a place on it until it's destroyed. */
function hits(kind: UnitKind, zone = 'body') {
  const t = one(kind);
  let n = 0;
  while (!t.u.dead && n < 10000) { hurtUnit(t.state, t.world, t.u, zone, PISTOL.damage); n++; }
  return n;
}

// Rounds to the body before U-104 (quadruped 150 hp, humanoid 300, heavy 900, spider 4000, colossus 3000, delivery
// 80, carrier 200, turret 500), and now.
const BEFORE: Partial<Record<UnitKind, number>> = { quadruped: 30, humanoid: 120, heavy: 720, spider: 3200, colossus: 4000, delivery: 4, carrier: 27, turret: 400 };
const NOW: Partial<Record<UnitKind, number>> = { quadruped: 15, humanoid: 60, heavy: 480, spider: 2160, colossus: 2667, delivery: 3, carrier: 18, turret: 268 };
// The drones (and the crawler drone): as they were.
const DRONES: Partial<Record<UnitKind, number>> = { drone: 1, hunter: 4, fpv: 1, bomber: 2, heli: 334, crawler: 3 };

describe('pistol rounds to kill each machine (M10-48, U-104)', () => {
  it('takes half the rounds for dogs and humanoids, about a third fewer for the other ground machines', () => {
    for (const k of Object.keys(NOW) as UnitKind[]) {
      expect(hits(k), k).toBe(NOW[k]);
      const cut = 1 - NOW[k]! / BEFORE[k]!;
      expect(cut, k).toBeGreaterThanOrEqual(k === 'quadruped' || k === 'humanoid' ? 0.5 : 0.25);
    }
  });
  it('leaves the drones as they were', () => {
    for (const k of Object.keys(DRONES) as UnitKind[]) expect(hits(k), k).toBe(DRONES[k]);
    expect(hits('drone', 'rotors')).toBe(1);
  });
  it('keeps the weak points: a head shot is worth many to the body', () => {
    expect([hits('humanoid', 'head'), hits('quadruped', 'head'), hits('heavy', 'head'), hits('turret', 'head')]).toEqual([2, 2, 12, 7]);
  });
});
