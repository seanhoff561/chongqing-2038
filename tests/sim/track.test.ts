// M4-23 (U-013): followed home. Coming into a hideout's area (within 25 m of its bed) within 10 s of a machine
// having him in sight, or with a tracking tag on him, or seen while there, gives it away: the shelter is marked
// compromised. A clean way home leaves it safe. M10-20 (U-104): no raids; tracked (tagged, or at a hideout given
// away), his position goes to the network and the machines come hunting him where he is; asleep, he wakes to them.
import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs } from './helpers';
import { claimBed } from '../../src/sim/shelter';
import { TRACK } from '../../src/data/units';
import { B } from '../../src/sim/types';
import type { Inter } from '../../src/world/world';
import type { Patrol } from '../../src/world/world';
import { SCALE } from '../../src/sim/clock';
import { existsSync } from 'fs';

const BED: Inter = { id: 'bed', kind: 'mattress', x: 35, y: 0.3, z: 0, r: 0.8, zh: '床', en: 'Bed' };

/** He starts 35 m from his bed (10 m outside its area), a camera 8 m off looking at him if `seen`. */
function home(seen: boolean, camAt = { x: 0, z: -8 }) {
  const { world, state } = setup([floor(0, 200)], { x: 0, y: 0, z: 0, yaw: 0 }, {
    inter: [BED], cameras: seen ? [{ kind: 'camera', x: camAt.x, y: 2.5, z: camAt.z, yaw: 0 }] : [],
  });
  state.time = 12 * 3600; state.flags.god = true;
  claimBed(state, world.inter[0]);
  state.player.yaw = -Math.PI / 2;
  const h = state.shelters[0];
  return { world, state, h };
}
/** Until the camera's had him in sight, then it's shut down: nothing sees him after. */
function seenThenBlind(t: ReturnType<typeof home>) {
  const cam = t.state.units[0];
  for (let i = 0; i < secs(5) && cam.saw === undefined; i++) run(t.state, t.world, 1);
  expect(cam.saw).toBeDefined();
  cam.dead = true;
}
/** East to his bed, sprinting, until he's in its area. */
function goHome(t: ReturnType<typeof home>) {
  const start = t.state.time;
  for (let i = 0; i < secs(20) && Math.hypot(t.state.player.pos.x - BED.x, t.state.player.pos.z - BED.z) > TRACK.near - 1; i++) run(t.state, t.world, 1, { my: 1, buttons: B.SPRINT });
  run(t.state, t.world, 2);
  return t.state.time - start;
}

describe('tracking home (M4-23)', () => {
  it('a clean return, seen by nothing, leaves the hideout safe', () => {
    const t = home(false);
    goHome(t);
    expect(t.h.near).toBe(true);
    expect(t.h.compromised).toBe(false);
  });
  it('coming home within 10 s of being seen gives it away', () => {
    const t = home(true);
    seenThenBlind(t);
    goHome(t);
    expect(t.h.compromised).toBe(true);
  });
  it('seen more than 10 s before he comes in, it stays safe', () => {
    const t = home(true);
    seenThenBlind(t);
    run(t.state, t.world, secs(TRACK.after + 2));
    goHome(t);
    expect(t.h.near).toBe(true);
    expect(t.h.compromised).toBe(false);
  });
  it('a tagged return gives it away, unseen', () => {
    const t = home(false);
    t.state.player.tag = true;
    goHome(t);
    expect(t.h.compromised).toBe(true);
  });
  it('seen while he is there gives it away too', () => {
    const t = home(false);
    goHome(t);
    expect(t.h.compromised).toBe(false);
    // A camera looking at him where he stands, inside the area.
    const s = home(true, { x: t.state.player.pos.x, z: -8 });
    Object.assign(s.state.player.pos, t.state.player.pos);
    run(s.state, s.world, 1);
    expect(s.h.near).toBe(true);
    seenThenBlind(s);
    run(s.state, s.world, 1);
    expect(s.h.compromised).toBe(true);
  });
});

describe('tracked, hunted where he is (M10-20, U-104)', () => {
  /** A quadruped walking a beat 120 m off; him at his hideout (given away or not), tagged or not. */
  function hunted(tag: boolean, given: boolean) {
    const beat: Patrol = { kind: 'street', unit: 'quadruped', pts: [{ x: 35, y: 0, z: 120 }, { x: 40, y: 0, z: 120 }], dwell: [600, 600], hours: [0, 24] };
    const { world, state } = setup([floor(0, 300)], { x: 35, y: 0, z: 2, yaw: 0 }, { inter: [BED], patrols: [beat] });
    state.time = 12 * 3600; state.flags.god = true;
    claimBed(state, world.inter[0]);
    state.player.tag = tag;
    if (given) state.shelters[0].compromised = true;
    run(state, world, 2);
    const dog = state.units.find(u => u.kind === 'quadruped')!;
    let nearest = Infinity;
    // An hour of game time at the hideout.
    for (let i = 0; i < secs(3600 / SCALE); i += 30) {
      run(state, world, 30);
      const q = dog.trip?.pos ?? { x: 37, z: 120 };
      nearest = Math.min(nearest, Math.hypot(q.x - state.player.pos.x, q.z - state.player.pos.z));
    }
    return { state, nearest, dog };
  }
  it('tagged at his hideout, they come for him there within the hour', () => {
    const { state, nearest } = hunted(true, false);
    expect(state.hive.lkp).toBeTruthy();
    expect(Math.hypot(state.hive.lkp!.x - 35, state.hive.lkp!.z - 2)).toBeLessThan(5);
    expect(nearest).toBeLessThan(20);
  });
  it('at a hideout given away, they come too, tag or no tag', () => {
    const { nearest } = hunted(false, true);
    expect(nearest).toBeLessThan(20);
  });
  it('untracked, nobody comes', () => {
    const { state, nearest } = hunted(false, false);
    expect(state.hive.lkp).toBeFalsy();
    expect(nearest).toBeGreaterThan(80);
  });
  it('asleep tracked, he wakes to them; and the raid is gone', () => {
    const t = home(false);
    t.state.player.tag = true;
    t.state.player.pos = { x: 35, y: 0, z: 1 };
    t.state.target = null;
    run(t.state, t.world, 2);
    const t0 = t.state.time;
    run(t.state, t.world, 1, { cmds: [{ c: 'act', name: 'sleep', arg: 6 }] });
    expect(t.state.dead).toBeFalsy();
    expect(t.state.time - t0).toBeLessThanOrEqual(TRACK.ping + 60);
    expect(existsSync('src/sim/raid.ts')).toBe(false);
  });
});
