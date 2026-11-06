// M9-03 / M10-45: no machine stands frozen in a crowd. Two dozen quadrupeds and humanoids sent by the network to the
// one place he was given away, in a corner (him long gone): the first there take it, and those held off it by the
// bodies already round it look about where they got to, and then go home; none stands on its way for good. And two
// sent opposite ways down an alley too narrow for two to pass don't hold each other there for ever: each gives up
// where they meet, looks about and turns back. Nor does one whose next point is round a corner, straight through a wall,
// nor one the network keeps telling where he is when it has no way up to him.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { solid } from '../../src/world/geom';
import { leave } from '../../src/sim/alert';
import { unitPose } from '../../src/sim/units';
import type { Patrol } from '../../src/world/world';

const beat = (unit: Patrol['unit'], x: number, z: number): Patrol => ({ kind: 'street', unit, pts: [{ x, y: 0, z }, { x: x + 0.5, y: 0, z }], dwell: [5, 5], hours: [0, 24] });

/** Every one sent to its place, Engaged (but seeing nothing), for `long` s: whether each moved over the last `last` s
 *  of it, and whether each got to the end of its way out (or turned back) at some point. */
function sendAll(beats: Patrol[], to: (k: number) => { x: number; y: number; z: number }, long: number, last: number, walls = [floor(0, 100)]) {
  const { world, state } = setup(walls, { x: 0, y: 0, z: -90, yaw: 0 }, { patrols: beats });
  state.time = 12 * 3600; state.flags.god = true; state.weather = { fog: 0, rain: 0 };
  const units = state.units.filter(u => !u.extra && !u.reserve && u.patrol >= 0);
  expect(units.length).toBe(beats.length);
  units.forEach((u, k) => { u.blind = true; u.state = 'engaged'; leave(state, world, u, 'hunt', to(k)); });
  const there = units.map(() => false);
  run(state, world, secs(long - last), {}, () => units.forEach((u, k) => { if (!u.trip || u.trip.back || u.trip.i >= u.trip.path.length) there[k] = true; }));
  const from = units.map(u => unitPose(world, u, state.time));
  run(state, world, secs(last), {}, () => units.forEach((u, k) => { if (!u.trip || u.trip.back || u.trip.i >= u.trip.path.length) there[k] = true; }));
  const moved = units.map((u, k) => { const q = unitPose(world, u, state.time); return Math.hypot(q.x - from[k].x, q.z - from[k].z) >= 0.05; });
  return { units, there, moved };
}

describe('no machine stands frozen in a crowd (M9-03)', () => {
  it('two dozen sent to one place: those held off it look about and go home', () => {
    const N = 24, beats = Array.from({ length: N }, (_, k) => {
      const a = (k / N) * Math.PI * 0.5, R = 14 + (k % 3) * 3;
      return beat(k % 2 ? 'humanoid' : 'quadruped', Math.cos(a) * R, Math.sin(a) * R);
    });
    // (The place in a corner: walls on two sides of it.)
    const walls = [floor(0, 100), solid(-3, 0, -3, -0.8, 3, 30), solid(-3, 0, -3, 30, 3, -0.8)];
    const { units, there, moved } = sendAll(beats, () => ({ x: 0, y: 0, z: 0 }), 40, 25, walls);
    const stuck = units.filter((u, k) => !there[k] || (u.trip && !u.trip.back && !moved[k])).map(u => `${u.kind}#${u.id}`);
    expect(stuck, 'never got there, or stood on its way the last 25 s').toEqual([]);
  });

  it('two sent opposite ways down an alley too narrow to pass give up where they meet and turn back', () => {
    // (An alley 1 m wide, 30 m long, along z.)
    const walls = [floor(0, 100), solid(-3, 0, -15, -0.5, 3, 15), solid(0.5, 0, -15, 3, 3, 15)];
    const { there } = sendAll([beat('humanoid', 0, -17), beat('humanoid', 0, 17)], k => ({ x: 0, y: 0, z: k ? -17 : 17 }), 40, 20, walls);
    expect(there).toEqual([true, true]);
  });

  it('one whose next point is straight through a wall (put off its way round a corner) looks about and goes home', () => {
    const { world, state } = setup([floor(0, 100), solid(-3, 0, 4, 3, 3, 5)], { x: 0, y: 0, z: -90, yaw: 0 }, { patrols: [beat('humanoid', 0, 0)] });
    state.time = 12 * 3600; state.flags.god = true;
    const u = state.units.find(q => !q.extra && q.patrol >= 0)!;
    u.blind = true; u.state = 'engaged'; leave(state, world, u, 'hunt', { x: 0, y: 0, z: 10 });
    // (The way's next point behind the wall, and on from there.)
    u.trip!.path = [{ x: 0, y: 0, z: 8 }, { x: 0, y: 0, z: 10 }];
    run(state, world, secs(15));
    expect(!u.trip || u.trip.back).toBe(true);
  });

  it('one the network keeps telling of him up where it has no way to him looks about and goes home', () => {
    // (Him on top of a block 5 m high, 6 m off: no way up it for a dog.)
    const { world, state } = setup([floor(0, 100), solid(4, 0, -2, 8, 5, 2)], { x: 0, y: 0, z: -90, yaw: 0 }, { patrols: [beat('quadruped', 0, 0)] });
    state.time = 12 * 3600; state.flags.god = true;
    const u = state.units.find(q => !q.extra && q.patrol >= 0)!, him = { x: 6, y: 5, z: 0 };
    u.blind = true; u.state = 'engaged'; leave(state, world, u, 'hunt', him);
    expect(u.trip!.path).toEqual([]);
    // (Told again every tick: home, it's sent again, and so on.)
    let home = false;
    run(state, world, secs(15), {}, s => { s.hive.lkp = { ...him, t: s.time, hx: 0, hz: 0, ax: him.x, az: him.z }; u.told = s.time; home ||= !u.trip || u.trip.back; });
    expect(home).toBe(true);
  });
});
