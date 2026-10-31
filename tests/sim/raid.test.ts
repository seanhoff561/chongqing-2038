// M4-24 (U-013, DESIGN section 9): the raid. A hideout given away is raided that night at a seeded time between 01:00
// and 04:00; asleep there he wakes to them breaking in, with 10 s before they're in. Unprepared, he dies; out by a
// second way he opened beforehand (the start hideout's rubble fall cleared with a crowbar, the old vent past it), or
// with an EMP trap rigged on the way in, he lives. Away, it's raided without him.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { startRun } from '../../src/sim/run';
import { teleport } from '../../src/sim/player';
import { addItem } from '../../src/sim/inventory';
import { raidTime } from '../../src/sim/raid';
import { RAID } from '../../src/data/units';
import { SCALE, GAME_PER_TICK } from '../../src/sim/clock';
import { free } from '../../src/sim/physics';
import { run, secs, aim, LMB } from './helpers';
import { B, type SimState } from '../../src/sim/types';

const w = getWorld('yuzhong'), bed = w.inter.find(i => i.id === 'airraid-mattress')!, plug = w.inter.find(i => i.id === 'airraid-plug')!;
const home = w.teleports.find(t => t.name.startsWith("Friends' hideout"))!, route = w.features.filter(f => f.kind === 'homeExit').sort((a, b) => a.group - b.group);
const hour = (t: number) => (t / 3600) % 24;

/** A run begun, the start hideout given away (he came home with a tag on), at 23:00. */
function givenAway() {
  const s = createState(3, w), p = s.player;
  startRun(s, w);
  const spawn = { ...p.pos };
  p.tag = true;
  teleport(p, spawn.x + 40, spawn.y + 10, spawn.z);
  run(s, w, 1);
  teleport(p, spawn.x, spawn.y, spawn.z);
  run(s, w, 1);
  const h = s.shelters[0];
  expect(h.compromised).toBe(true);
  p.tag = false;
  s.time = Math.floor(s.time / 86400) * 86400 + 23 * 3600;
  return { s, h, spawn };
}
/** To the bed, and to sleep till 06:00. */
function sleep(s: SimState) {
  teleport(s.player, home.x, home.y, home.z);
  run(s, w, 20);
  aim(s, bed.x, bed.y, bed.z);
  run(s, w, 2);
  expect(s.target).toBe(bed.id);
  run(s, w, 1, { cmds: [{ c: 'act', name: 'sleep', arg: 6 }] } as never);
}
/** Sprint to a point. */
function goTo(s: SimState, q: { x: number; z: number }) {
  for (let i = 0; i < secs(6) && Math.hypot(q.x - s.player.pos.x, q.z - s.player.pos.z) > 0.4; i++) run(s, w, 1, { yaw: Math.atan2(-(q.x - s.player.pos.x), -(q.z - s.player.pos.z)), my: 1, buttons: B.SPRINT });
}

describe('the hideout raid (M4-24)', () => {
  it('comes between 01:00 and 04:00, a new hour each night', () => {
    const s = createState(1, w), hours = new Set<number>();
    for (let d = 0; d < 20; d++) {
      s.time = d * 86400 + 12 * 3600;
      const t = raidTime(s, 'bed');
      expect(t).toBeGreaterThan(s.time);
      expect(hour(t)).toBeGreaterThanOrEqual(RAID.from);
      expect(hour(t)).toBeLessThan(RAID.to);
      hours.add(Math.floor(hour(t) * 4));
    }
    expect(hours.size).toBeGreaterThan(5);
  });
  it('wakes him with 10 s before they are in; unprepared, he dies; they came in down the shaft', () => {
    const { s, h } = givenAway();
    sleep(s);
    // (Woken in the tick he lay down in, at their time.)
    expect(s.time - h.raid!).toBeGreaterThanOrEqual(0);
    expect(s.time - h.raid!).toBeLessThan(2 * GAME_PER_TICK);
    expect(hour(s.time)).toBeGreaterThanOrEqual(1);
    expect(hour(s.time)).toBeLessThan(4);
    expect(s.raid).toBeDefined();
    expect(s.events.some(e => e.t === 'msg' && /found the hideout/.test(e.text))).toBe(true);
    // He runs for the old passage: the rubble's still across it, and he's in their sweep when they come.
    goTo(s, route[0]);
    goTo(s, route[1]);
    expect(Math.hypot(route[1].x - s.player.pos.x, route[1].z - s.player.pos.z)).toBeGreaterThan(1.5);
    run(s, w, Math.max(0, Math.round((s.raid!.at - s.time) / GAME_PER_TICK) - 30));
    expect(s.dead).toBeFalsy();
    run(s, w, 60);
    expect(s.dead).toBe('raid');
    // The nearest garage's humanoids, come in at the foot of the grate's shaft.
    const grate = w.inter.find(i => i.id === 'airraid-grate')!, them = s.units.filter(u => u.trip && u.sent !== undefined && Math.hypot(u.trip.pos.x - grate.x, u.trip.pos.z - grate.z) < 2.5);
    expect(them.length).toBeGreaterThanOrEqual(1);
    expect(them.every(u => u.kind === 'humanoid' && Math.abs(u.trip!.pos.y - bed.y) < 1.5)).toBe(true);
  });
  it('prepared, he clears the rubble beforehand and gets out by the old passage when they come: he lives', () => {
    const { s, h } = givenAway();
    // The rubble at the end of the passage stub: no way through it, and with a crowbar 15 s of loud work.
    expect(s.wstate.open[plug.id]).toBeFalsy();
    teleport(s.player, route[0].x, route[0].y, route[0].z);
    run(s, w, 20);
    aim(s, plug.x, plug.y, plug.z);
    run(s, w, 2);
    expect(s.target).toBe(plug.id);
    run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT });
    expect(s.task).toBeNull();
    addItem(s, s.inv.pack, 'crowbar');
    run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT });
    expect(s.task?.id).toBe(plug.id);
    run(s, w, secs(RAID.clear + 0.2), { buttons: B.INTERACT });
    expect(s.wstate.open[plug.id]).toBe(true);
    // Asleep in his bed when they come: up and out along the old passage, past the jog.
    sleep(s);
    run(s, w, 1);
    const t0 = s.time;
    for (const q of route) goTo(s, q);
    expect((s.time - t0) / SCALE).toBeLessThan(RAID.warn);
    run(s, w, secs(RAID.warn + 15));
    expect(s.dead).toBeFalsy();
    expect(h.raided).toBe(true);
    // The old vent's way up: clear up its shaft to the manhole, its rungs all the way.
    const ex = w.inter.find(i => i.id === 'airraid-exit')!, last = route[route.length - 1];
    const lad = w.climbables.find(c => c.kind === 'ladder' && Math.hypot(c.x - ex.x, c.z - ex.z) < 1.5)!;
    expect(lad.y0).toBeLessThan(last.y + 0.1);
    expect(lad.y1).toBeGreaterThan(ex.y + 0.5);
    for (let y = last.y + 2.5; y < ex.y - 2; y += 1) expect(free(w.index, ex.x, y, ex.z, 0.9, 0.25), `shaft at ${y.toFixed(1)}`).toBe(true);
    expect(ex.data?.manhole).toBe(true);
  });
  it('an EMP trap rigged in the hideout downs them as they come: he lives', () => {
    const { s, h } = givenAway();
    addItem(s, s.inv.pack, 'emp');
    s.inv.hotbar[0] = s.inv.pack.items.find(i => i.id === 'emp')!.uid; s.inv.held = 1;
    run(s, w, 1, { pressed: LMB, buttons: LMB });
    expect(h.trap).toBe(true);
    sleep(s);
    run(s, w, secs(RAID.warn + 1));
    expect(s.dead).toBeFalsy();
    const them = s.units.filter(u => u.sent === s.units.find(v => v.sent !== undefined && v.trip)?.sent);
    expect(them.length).toBeGreaterThanOrEqual(1);
    for (const u of them) expect(u.off).toBeGreaterThan(s.time);
  });
  it('away from it that night, it is raided without him', () => {
    const { s, h, spawn } = givenAway();
    teleport(s.player, spawn.x + 80, spawn.y + 10, spawn.z);
    s.time = h.raid! + 1;
    run(s, w, 2);
    expect(h.raided).toBe(true);
    expect(s.raid).toBeUndefined();
    expect(s.dead).toBeFalsy();
  });
});
