// M10-29 (U-104): never stuck in a window's corner. A wall with an opening like the city's (sill 0.9 m), turned to
// any yaw: he runs, jumps, climbs and edges into its corners from both sides and many angles, never ends up inside
// the wall, and walks away each time.
import { describe, it, expect } from 'vitest';
import { setup, run, secs, floor } from './helpers';
import { solid, turn, overlaps } from '../../src/world/geom';
import { boxAt } from '../../src/sim/physics';
import { heightOf } from '../../src/sim/move';
import { B, type SimState } from '../../src/sim/types';
import type { World } from '../../src/world/world';

const OPENINGS = [[1.4, 1.5], [1.0, 1.2]] as const, YAWS = [0, 0.5, -1.1], SILL = 0.9;

/** The wall along local x at z -0.25..0 (outside +z), its opening w wide and h high, turned by yaw about the origin. */
function scene(w: number, h: number, yaw: number, spawn: { x: number; z: number }) {
  const a = w / 2, wall = [solid(-6, 0, -0.25, -a, 7, 0), solid(a, 0, -0.25, 6, 7, 0), solid(-a, 0, -0.25, a, SILL, 0), solid(-a, SILL + h, -0.25, a, 7, 0)];
  const s = local(yaw, spawn.x, spawn.z);
  return setup([floor(), ...(yaw ? turn(wall, yaw, 0, 0) : wall)], { x: s.x, y: 0, z: s.z, yaw: 0 });
}
/** A local point (or, with yaw, a direction) in the world. */
const local = (yaw: number, x: number, z: number) => ({ x: Math.cos(yaw) * x - Math.sin(yaw) * z, z: Math.sin(yaw) * x + Math.cos(yaw) * z });
/** The player's yaw for a local heading (dx, dz). */
const heading = (yaw: number, dx: number, dz: number) => { const d = local(yaw, dx, dz); return Math.atan2(-d.x, -d.z); };

/** His box (a hair smaller) is inside a solid, outside a scripted move. */
function inWall(state: SimState, world: World) {
  const p = state.player;
  return p.mode !== 'action' && overlaps(world.index, boxAt(p.pos.x, p.pos.y + 1e-3, p.pos.z, heightOf(p.posture) - 2e-3, 0.249));
}

/** Let go of everything, then walk off along `yaw` for 1.5 s: how far he got. */
function walkAway(state: SimState, world: World, yaw: number) {
  const p = state.player;
  run(state, world, secs(0.3), { yaw });
  const b = { ...p.pos };
  run(state, world, secs(1.5), { yaw, my: 1 });
  return Math.hypot(p.pos.x - b.x, p.pos.z - b.z);
}

describe('window corners (M10-29)', () => {
  it('runs, jumps and climbs into its corners from both sides and many angles, and walks away each time', () => {
    const fails: string[] = [];
    for (const [w, h] of OPENINGS) for (const yaw of YAWS) for (const side of [1, -1]) for (const corner of [1, -1])
      for (const ang of [0, Math.PI / 6, Math.PI / 3, -Math.PI / 6]) for (const how of ['run', 'jump', 'jump held', 'hands']) {
        // At the corner, heading into the wall `ang` off square, outward past the corner when ang > 0.
        const tx = corner * w / 2, tz = side > 0 ? 0 : -0.25, dx = Math.sin(ang) * corner, dz = -side * Math.cos(ang);
        const pyaw = heading(yaw, dx, dz), T = local(yaw, tx, tz);
        const { world, state } = scene(w, h, yaw, { x: tx - dx * 3, z: tz - dz * 3 });
        const p = state.player;
        run(state, world, 3, { yaw: pyaw });
        let bad = '';
        for (let i = 0; i < secs(2.5); i++) {
          const near = how !== 'run' && Math.hypot(p.pos.x - T.x, p.pos.z - T.z) < 1;
          const press = near && i % (how === 'hands' ? 20 : 30) === 0 ? B.JUMP : 0, held = near && how !== 'jump' ? B.JUMP : 0;
          const buttons = (how === 'run' ? 0 : how === 'hands' ? B.USE | B.AIM : B.SPRINT) | held | press;
          run(state, world, 1, { yaw: pyaw, pitch: how === 'hands' ? 0.3 : 0, my: 1, buttons, pressed: press });
          if (!bad && inWall(state, world)) bad = `in the wall at ${i} (${p.mode})`;
        }
        const moved = walkAway(state, world, pyaw + Math.PI);
        if (!bad && moved < 0.8) bad = `stuck (moved ${moved.toFixed(2)} m, ${p.mode})`;
        if (bad) fails.push(`${w}x${h} yaw ${yaw} side ${side} corner ${corner} angle ${ang.toFixed(2)} ${how}: ${bad}`);
      }
    expect(fails).toEqual([]);
  });

  it('crouched in the opening, he edges out into its corners with Ctrl held and never into the wall', () => {
    const fails: string[] = [];
    for (const [w, h] of OPENINGS) for (const yaw of YAWS) for (const x of [0, w / 2 - 0.3, -(w / 2 - 0.3)])
      for (const out of [1, -1]) for (const ang of [Math.PI / 6, Math.PI / 3, 1.4]) for (const corner of [1, -1]) {
        const { world, state } = scene(w, h, yaw, { x, z: 1.5 });
        const p = state.player;
        // In through the window: up onto the sill, crouched in the opening.
        for (let i = 0; i < secs(2) && p.pos.y < SILL - 0.1; i++) run(state, world, 1, { yaw: heading(yaw, 0, -1), my: 1, buttons: B.JUMP, pressed: i % 10 === 0 ? B.JUMP : 0 });
        run(state, world, secs(0.6), { yaw: heading(yaw, 0, -1) });
        if (p.pos.y < SILL - 0.01 || p.posture !== 'crouch') { fails.push(`${w}x${h} yaw ${yaw} x ${x.toFixed(2)}: not up in the window`); continue; }
        // Ctrl held, off the sill's edge (outside or in) slantwise toward a jamb.
        const pyaw = heading(yaw, Math.sin(ang) * corner, -out * Math.cos(ang));
        let bad = '';
        for (let i = 0; i < secs(1.5); i++) {
          run(state, world, 1, { yaw: pyaw, my: 1, buttons: B.CROUCH, pressed: i === 0 ? B.CROUCH : 0 });
          if (!bad && inWall(state, world)) bad = `in the wall at ${i}`;
        }
        const moved = walkAway(state, world, heading(yaw, 0, -out));
        if (!bad && moved < 0.5) bad = `stuck (moved ${moved.toFixed(2)} m)`;
        if (bad) fails.push(`${w}x${h} yaw ${yaw} x ${x.toFixed(2)} ${out > 0 ? 'out' : 'in'} angle ${ang.toFixed(2)} corner ${corner}: ${bad}`);
      }
    expect(fails).toEqual([]);
  });

  it('crouched in the opening, his hands on its sill let him down, never wedged under the lintel', () => {
    for (const [w, h] of OPENINGS) for (const yaw of YAWS) for (const out of [1, -1]) {
      const { world, state } = scene(w, h, yaw, { x: 0, z: 1.5 });
      const p = state.player;
      for (let i = 0; i < secs(2) && p.pos.y < SILL - 0.1; i++) run(state, world, 1, { yaw: heading(yaw, 0, -1), my: 1, buttons: B.JUMP, pressed: i % 10 === 0 ? B.JUMP : 0 });
      run(state, world, secs(0.6), { yaw: heading(yaw, 0, -1) });
      expect(p.posture).toBe('crouch');
      // Looking down at one edge, backing off it, he grabs it and lets the arms out: down that side of the wall.
      const pyaw = heading(yaw, 0, out > 0 ? 1 : -1) + Math.PI, y0 = p.pos.y;
      run(state, world, secs(0.6), { yaw: pyaw, pitch: -1.2, my: -1, buttons: B.USE | B.AIM });
      run(state, world, secs(1.5), { yaw: pyaw, pitch: -1.2, my: -1, buttons: B.USE | B.AIM }, s => expect(inWall(s, world)).toBe(false));
      expect(p.pos.y).toBeLessThan(y0 - 0.5);
      expect(walkAway(state, world, pyaw)).toBeGreaterThan(0.8);
    }
  });
});
