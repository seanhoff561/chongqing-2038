// M9-07: every scenario survives two minutes of seeded random input (60 Hz): moving, looking, every button, the hotbar,
// and the commands the UI sends (the backpack, the laptop's acts, the map's marks). Each tick nothing throws, and
// nothing in him, his body or the machines (their poses too) goes NaN or infinite; every second, nothing in the whole
// state does. Run like a player mashing everything, from where each scenario starts.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { step } from '../../src/sim/sim';
import { startScenario } from '../../src/sim/scenario';
import { scenarios, type Scenario } from '../../src/data/scenarios';
import type { World } from '../../src/world/world';
import { unitPose, type Unit } from '../../src/sim/units';
import { B, emptyInput, type InputFrame, type SimState } from '../../src/sim/types';
import { makeRng, rand, randInt, chance, type Rng } from '../../src/sim/rng';
import { RECIPES } from '../../src/data/recipes';
import { TAB_LINES } from '../../src/data/dialogue';
import type { Cmd } from '../../src/sim/commands';
import { settle } from './helpers';

const TICKS = 120 * 60;
const BITS = Object.values(B);
// (Where Infinity is a value: a fracture unsplinted heals never.)
const MAY_BE_INFINITE = new Set(['legHealAt', 'armHealAt']);

/** The first number in it that's NaN, or infinite where it shouldn't be: its path. */
function bad(o: unknown, path: string, seen = new Set<object>()): string | null {
  if (typeof o === 'number') return Number.isNaN(o) || (!Number.isFinite(o) && !MAY_BE_INFINITE.has(path.slice(path.lastIndexOf('.') + 1))) ? `${path} = ${o}` : null;
  if (!o || typeof o !== 'object' || seen.has(o)) return null;
  seen.add(o);
  for (const [k, v] of Object.entries(o)) { const b = bad(v, `${path}.${k}`, seen); if (b) return b; }
  return null;
}

const pick = <T>(r: Rng, a: T[]): T => a[randInt(r, a.length)];

/** A command such as the UI sends, on what he has (or on nothing). */
function randomCmd(r: Rng, s: SimState): Cmd {
  const uids = [...s.inv.pack.items, ...(s.openContainer ? s.containers[s.openContainer]?.items ?? [] : [])].map(i => i.uid);
  const uid = uids.length && chance(r, 0.9) ? pick(r, uids) : randInt(r, 50);
  const grids = ['pack', ...(s.openContainer ? [s.openContainer] : [])];
  switch (randInt(r, 13)) {
    case 0: return { c: 'bind', slot: randInt(r, 6) - 1, uid: chance(r, 0.2) ? null : uid };
    case 1: case 2: return { c: 'use', uid };
    case 3: return { c: 'drop', uid };
    case 4: return { c: 'move', from: pick(r, grids), to: pick(r, grids), uid, x: randInt(r, 10) - 1, y: randInt(r, 8) - 1, rot: chance(r, 0.5) };
    case 5: return { c: 'quick', from: pick(r, grids), uid };
    case 6: return { c: 'fit', uid, onto: chance(r, 0.8) && uids.length ? pick(r, uids) : randInt(r, 50) };
    case 7: return { c: 'strip', uid };
    case 8: return { c: 'takeall' };
    case 9: return { c: 'mark', ...(chance(r, 0.7) ? { add: { x: (rand(r) - 0.5) * 4000, z: (rand(r) - 0.5) * 4000, ...(chance(r, 0.3) ? { x2: rand(r) * 100, z2: rand(r) * 100 } : {}), ...(chance(r, 0.3) ? { text: 'x'.repeat(randInt(r, 60)) } : {}) } } : { del: randInt(r, 6) - 1 }) };
    default: {
      const name = pick(r, ['craft', 'focus', 'focus', 'laptop', 'laptop', 'launch', 'land', 'loop', 'map', 'notes', 'scanpack', 'search', 'sleep', 'tab']);
      const arg = name === 'craft' ? pick(r, RECIPES).id : name === 'tab' ? pick(r, Object.keys(TAB_LINES)) : name === 'notes' ? 'n'.repeat(randInt(r, 5000))
        : name === 'sleep' ? randInt(r, 24) : name === 'map' ? randInt(r, 2) : name === 'loop' || name === 'scanpack' ? randInt(r, 60) - 5 : undefined;
      return { c: 'act', name, ...(arg !== undefined ? { arg } : {}) };
    }
  }
}

/** A machine the sim has done anything to (not just walking its beat, a function of the time): checked every tick. */
const busy = (u: Unit) => u.state !== 'unaware' || !!(u.trip || u.crash || u.stop || u.aware || u.atk || u.hits || u.seen);

/** Two minutes of input held a while at a time, as hands on keys are: what's held and where he looks, changing. Dead,
 *  three seconds more of it, and the scenario starts over (as the game's test scenes do). Returns how it went. */
function fuzz(sc: Scenario, w: World, seed: number) {
  const r = makeRng(seed);
  let s = startScenario(sc, w, seed), hold = 0, held = emptyInput(), prev = 0, turn = 0, yaw = s.player.yaw, pitch = 0, deadFor = 0, deaths = 0, cmds = 0, went = 0;
  for (let t = 0; t < TICKS; t++) {
    if (hold-- <= 0) {
      hold = 6 + randInt(r, 120);
      const axis = () => (chance(r, 0.3) ? rand(r) * 2 - 1 : randInt(r, 3) - 1);
      let buttons = 0;
      for (const b of BITS) if (chance(r, b === B.SLEEP ? 0.04 : 0.18)) buttons |= b;
      held = { ...emptyInput(), mx: axis(), my: chance(r, 0.6) ? 1 : axis(), buttons };
      turn = chance(r, 0.15) ? (rand(r) - 0.5) * 0.6 : (rand(r) - 0.5) * 0.05;
      pitch = (rand(r) - 0.5) * 3.2;
    }
    yaw += turn;
    // (Now and then a key tapped on its own for a tick, and a flick of the mouse.)
    const tap = chance(r, 0.03) ? pick(r, BITS) : 0;
    if (chance(r, 0.005)) yaw += (rand(r) - 0.5) * 20;
    const buttons = held.buttons | tap;
    const f: InputFrame = { ...held, yaw, pitch, buttons, pressed: buttons & ~prev, slot: chance(r, 0.01) ? randInt(r, 7) - 1 : -1 };
    if (chance(r, 0.03)) { f.cmds = Array.from({ length: 1 + randInt(r, 3) }, () => randomCmd(r, s)); cmds += f.cmds.length; }
    prev = buttons;
    const at = { ...s.player.pos };
    try { step(s, w, f); } catch (e) { throw new Error(`tick ${t}: ${(e as Error).stack}`); }
    went += Math.hypot(s.player.pos.x - at.x, s.player.pos.z - at.z);
    const p = bad(s.player, 'player') ?? bad(s.body, 'body');
    if (p) throw new Error(`tick ${t}: ${p}`);
    const all = t % 60 === 0;
    for (const u of s.units) {
      if (!all && !busy(u)) continue;
      const q = unitPose(w, u, s.time), b = [q.x, q.y, q.z, q.yaw].some(v => !Number.isFinite(v)) ? `pose ${JSON.stringify(q)}` : bad(u, `unit ${u.id} ${u.kind}`);
      if (b) throw new Error(`tick ${t}: ${b}`);
    }
    if (all) { const b = bad(s, 'state'); if (b) throw new Error(`tick ${t}: ${b}`); }
    if (s.dead && ++deadFor > 180) { s = startScenario(sc, w, seed + ++deaths); deadFor = 0; yaw = s.player.yaw; }
  }
  return { deaths, cmds, went };
}

describe('fuzz: seeded random input from every scenario (M9-07)', () => {
  for (const [k, sc] of scenarios.entries()) {
    it(sc.name, async () => {
      await settle();
      const w = getWorld(sc.world), how = fuzz(sc, w, 1000 + k);
      // (And it was played: he got about, never stood walled in where it put him; the UI's commands went in.)
      expect(how.went, JSON.stringify(how)).toBeGreaterThan(20);
      expect(how.cmds, JSON.stringify(how)).toBeGreaterThan(100);
    });
  }
});
