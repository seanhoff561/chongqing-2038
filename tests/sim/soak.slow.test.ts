// M9-03: a stability soak. Three game days in Yuzhong with every unit out: every four game hours he's somewhere else in
// the city (each teleport in turn) running about for half a minute of real ticks, the hours between skipped the way
// sleep skips them (the machines on their beats by the clock). Nothing goes NaN, no walker or drone stands frozen
// off its beat, and no list in the state keeps growing.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { unitPose, isOff } from '../../src/sim/units';
import { run, secs } from './helpers';
import { B } from '../../src/sim/types';
import { STATIC } from '../../src/data/units';

const w = getWorld('yuzhong');

/** The length of every array in the state, by its path (two levels down). */
function lists(o: unknown, path = 's', out: Record<string, number> = {}, depth = 0) {
  if (!o || typeof o !== 'object' || depth > 2) return out;
  if (Array.isArray(o)) { out[path] = o.length; return out; }
  for (const [k, v] of Object.entries(o)) lists(v, `${path}.${k}`, out, depth + 1);
  return out;
}

describe('stability soak (M9-03)', () => {
  it('three game days with every unit: no NaN, no frozen units, no growing lists', () => {
    const s = createState(7, w);
    s.flags.god = true;
    const windows = 18, live = secs(30), sizes: Record<string, number>[] = [], bad: string[] = [];
    for (let k = 0; k < windows; k++) {
      const tp = w.teleports[k % w.teleports.length];
      teleport(s.player, tp.x, tp.y, tp.z);
      const from = new Map(s.units.filter(u => !isOff(s, u)).map(u => [u.id, unitPose(w, u, s.time)]));
      // Running about: forward at a sprint, turning as he goes, jumping now and then.
      for (let j = 0; j < live; j += 120) run(s, w, 120, { my: 1, buttons: B.SPRINT | B.JUMP, pressed: B.JUMP }, st => { st.player.yaw += 0.004; });
      const p = s.player.pos;
      if (![p.x, p.y, p.z, s.player.vel.x, s.player.vel.y, s.player.vel.z, s.body.hp].every(Number.isFinite)) bad.push(`window ${k}: him NaN`);
      let frozen = 0, nan = 0, ex = '';
      for (const u of s.units) {
        if (isOff(s, u) || u.reserve || u.cam !== undefined) continue;
        const q = unitPose(w, u, s.time);
        if (![q.x, q.y, q.z, q.yaw].every(Number.isFinite)) { nan++; continue; }
        const a = from.get(u.id);
        if (a && !STATIC.has(u.kind) && Math.hypot(q.x - a.x, q.y - a.y, q.z - a.z) < 0.05 && u.state === 'engaged') { frozen++; ex ||= `${u.kind}#${u.id}`; }
      }
      if (nan) bad.push(`window ${k}: ${nan} units NaN`);
      if (frozen) bad.push(`window ${k}: ${frozen} engaged units frozen (${ex})`);
      sizes.push(lists(s));
      // The rest of the four hours skipped, as asleep.
      s.time += 4 * 3600 - live / 60 * (86400 / (36 * 60));
    }
    expect(bad).toEqual([]);
    expect(s.time / 86400).toBeGreaterThan(3);
    const early = sizes[3], late = sizes[windows - 1], grew = Object.keys(late).filter(k => late[k] > 2 * (early[k] ?? 0) + 64).map(k => `${k} ${early[k] ?? 0}>${late[k]}`);
    expect(grew, 'growing lists').toEqual([]);
  }, 900000);
});
