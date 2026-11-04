// M10-43 (U-104): the crawlers stay in the sewers. Over a whole day, with the network told of him on the streets over
// their heads, one after him down its run and him gone up a manhole, and the helicopter's drop, no crawler is ever
// above ground (underground the way the game has it: an 'under' zone, or deep under the ground).
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { unitPose } from '../../src/sim/units';
import { teleport } from '../../src/sim/player';
import { layerAt } from '../../src/sim/automap';
import { heightAt } from '../../src/world/heightfield';
import type { SimState } from '../../src/sim/types';
import { run, secs } from './helpers';

const w = getWorld('yuzhong');

describe('crawlers only in the sewers (M10-43)', () => {
  it('no crawler comes above ground over a day', () => {
    const s = createState(1, w), crawlers = s.units.filter(u => u.kind === 'crawler');
    s.flags.god = true; s.flags.clear = true;
    const beat = crawlers.filter(u => !u.reserve && !u.extra), day0 = s.time - (s.time % 86400) + 86400;
    const up: string[] = [];
    let trips = 0, chased = 0, dropped = 0;
    // (A reserve at home in its garage isn't out: not drawn, nowhere.)
    const check = (st: SimState, t = st.time) => {
      for (const u of crawlers) {
        const q = unitPose(w, u, t);
        if (q.docked) continue;
        if (u.trip) { trips++; if (u.reserve?.drop) dropped++; }
        if (layerAt(w, q.x, q.y + 0.2, q.z) !== -1 && up.length < 10) up.push(`#${u.id} at ${q.x.toFixed(0)},${q.y.toFixed(1)},${q.z.toFixed(0)} h${((t - day0) / 3600).toFixed(2)}`);
      }
    };
    for (let h = 0; h < 24; h++) {
      // On their beats, a pure function of the time: every minute of the hour.
      for (let m = 0; m < 60; m++) check(s, day0 + h * 3600 + m * 60);
      // Every three hours, seen on the street right over one, fully aware: it tells the network, which tells the rest.
      if (h % 3) continue;
      s.time = day0 + h * 3600;
      const u = beat[(h * 7) % beat.length], q = unitPose(w, u, s.time), g = heightAt(w.ground!, q.x, q.z);
      if (g !== null) Object.assign(u, { aware: 1.2, seen: { x: q.x, y: g, z: q.z }, saw: s.time });
      // Every six hours he's down in a run ahead of one; it goes for him; he's up the manhole and away on the street.
      if (h % 6 === 3) {
        const c = beat[h % beat.length], p = unitPose(w, c, s.time), at = { x: p.x + Math.sin(p.yaw) * 4, y: p.y, z: p.z + Math.cos(p.yaw) * 4 };
        teleport(s.player, at.x, at.y + 0.05, at.z);
        run(s, w, secs(4), {}, st => { if (st.tick % 30 === 0) check(st); });
        if (c.trip) chased++;
        const top = heightAt(w.ground!, at.x, at.z);
        if (top !== null) teleport(s.player, at.x, top + 0.05, at.z);
      }
      run(s, w, secs(10), {}, st => { if (st.tick % 30 === 0) check(st); });
    }
    // And next afternoon the helicopter's drop: seen by three and gone into a building, its dogs and crawlers sent below round it.
    s.time = day0 + 38 * 3600;
    const b = w.plots.findIndex(p => !p.far && p.route && p.route.length >= 6), inside = w.plots[b].route![2];
    teleport(s.player, inside.x, inside.y + 0.05, inside.z);
    for (const u of s.units.filter(u => u.kind === 'humanoid' && !u.reserve).slice(0, 3)) u.saw = s.time;
    run(s, w, 8);
    // (Its flight in over the roofs skipped: there over the roof, it drops its team.)
    const heli = s.units.find(u => u.kind === 'heli')!, ht = heli.trip!;
    expect(s.hive.heli?.phase).toBe('fly');
    Object.assign(ht, { i: ht.path.length, pos: { ...ht.path[ht.path.length - 1] } });
    run(s, w, secs(30), {}, st => { if (st.tick % 30 === 0) check(st); });
    expect(s.hive.heli?.phase).toBe('sweep');
    expect(dropped, 'crawlers dropped below').toBeGreaterThan(0);
    expect(chased, 'went for him down its run').toBeGreaterThan(0);
    expect(trips).toBeGreaterThan(0);
    expect(up, 'crawlers above ground').toEqual([]);
  });
});
