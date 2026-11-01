// M4-101 (U-089): every machine can be shot dead with the pistol, aimed at its weak spot (a walker's head, a drone's
// rotors, the giants' heads, the helicopter's rotors), and its wreck searched for what's still good in it. A head hit
// does clearly more than a body hit; the machines fire a little slower than they did, and the drones fly slower.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs, LMB, RMB } from './helpers';
import { addItem, grid } from '../../src/sim/inventory';
import { unitPose } from '../../src/sim/units';
import { allInters } from '../../src/sim/interact';
import { rollLoot } from '../../src/sim/loot';
import { UNITS, WEAPONS, type UnitKind } from '../../src/data/units';
import type { Patrol } from '../../src/world/world';

/** A machine of a kind d m in front of him, facing him, `up` m off the ground, held there; he has the pistol and plenty
 *  of rounds. */
function range(kind: UnitKind, d: number, up = 0) {
  const beat: Patrol = { kind: 'street', unit: kind, pts: [{ x: 0, y: up, z: -d }, { x: 0, y: up, z: -d + 0.01 }], dwell: [600, 600], hours: [0, 24] };
  const { world, state } = setup([floor(0, 300)], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [beat] });
  state.time = 12 * 3600; state.flags.clear = true; state.flags.god = true;
  addItem(state, state.inv.pack, 'pistol', 1, { charge: 15 });
  state.inv.hotbar[0] = state.inv.pack.items.find(i => i.id === 'pistol')!.uid; state.inv.held = 1;
  // (Held where it stands, so it's shot at rather than closed with.)
  const u = state.units[0];
  u.stop = { x: 0, y: up, z: -d, yaw: 0, t: 0 };
  return { world, state, u };
}
/** Aimed rounds at the point `at` m up its body (`fwd` m out its front) until it's dead or `max` are spent. */
function kill(t: ReturnType<typeof range>, at: number, max: number, fwd = 0) {
  let n = 0;
  while (!t.u.dead && !t.u.crash && n < max) {
    const q = unitPose(t.world, t.u, t.state.time), p = t.state.player.pos, hx = q.x + Math.sin(q.yaw) * fwd, hz = q.z + Math.cos(q.yaw) * fwd, d = Math.hypot(hx - p.x, hz - p.z);
    const pitch = Math.atan2(q.y + at - p.y - 1.62, d), yaw = Math.atan2(-(hx - p.x), -(hz - p.z));
    t.state.inv.pack.items.find(i => i.id === 'pistol')!.charge = 15;
    run(t.state, t.world, secs(0.4), { pitch, yaw, buttons: RMB });
    run(t.state, t.world, 1, { pitch, yaw, pressed: LMB, buttons: LMB | RMB });
    n++;
  }
  // (A machine brought down out of the air falls, and is a wreck where it lands.)
  for (let i = 0; i < secs(20) && !t.u.dead; i++) run(t.state, t.world, 1);
  run(t.state, t.world, secs(1.5));
  return n;
}

describe('combat (M4-101)', () => {
  it('kills every kind of machine with the pistol, and each wreck holds parts', () => {
    // [kind, metres off, metres up, aimed this high on it, out its front, the most rounds it should take]
    const KINDS: [UnitKind, number, number, number, number, number][] = [
      ['quadruped', 10, 0, 0.8, 0.55, 4], ['humanoid', 12, 0, 1.75, 0, 6], ['heavy', 15, 0, 2.85, 0, 25], ['crawler', 6, 0, 0.2, 0, 6],
      ['delivery', 8, 0, 0.4, 0, 6], ['carrier', 10, 0, 1, 0, 40], ['drone', 10, 4, 0.1, 0, 3], ['hunter', 10, 4, 0.12, 0, 4],
      ['fpv', 8, 3, 0, 0, 3], ['bomber', 10, 5, 0.12, 0, 4], ['spider', 40, 0, 25.3, 0, 110], ['colossus', 30, 0, 8.6, 0, 80], ['heli', 30, 12, 1.2, 0, 20],
    ];
    for (const [kind, d, up, at, fwd, most] of KINDS) {
      const t = range(kind, d, up), n = kill(t, at, most + 20, fwd);
      expect(t.u.dead, `${kind} dead`).toBe(true);
      expect(n, `${kind}: rounds`).toBeLessThanOrEqual(most);
      const wreck = allInters(t.state, t.world).find(i => i.id === `wreck:${t.u.id}`);
      expect(wreck, `${kind} wreck`).toBeDefined();
      t.state.containers[wreck!.id] = grid(6, 6);
      rollLoot(t.state, wreck!);
      expect(t.state.containers[wreck!.id].items.length, `${kind} wreck's parts`).toBeGreaterThan(0);
    }
  });
  it('hits harder in the head; the machines fire slower and the drones fly slower than they did', () => {
    const hit = (at: number) => { const t = range('humanoid', 12); const hp = UNITS.humanoid.hp; kill(t, at, 1); return hp - (t.u.hp ?? hp); };
    expect(hit(1.75)).toBeGreaterThanOrEqual(10 * hit(0.9));
    expect(WEAPONS.rifle.every).toBeGreaterThan(1.2); expect(WEAPONS.smg.every).toBeGreaterThan(0.8); expect(WEAPONS.cannon.every).toBeGreaterThan(2);
    expect(UNITS.drone.patrol).toBeLessThan(5); expect(UNITS.drone.chase).toBeLessThan(8); expect(UNITS.hunter.chase).toBeLessThan(12);
  });
});
