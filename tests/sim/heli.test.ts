// M4-92 (U-067): the helicopter drop. Seen by three machines and then gone into a building, he brings the troop
// helicopter over its roof; its squad lands on the roof, goes down the stairs and visits every floor; the dogs and
// crawlers it brings go underground near it.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { unitPose } from '../../src/sim/units';
import { teleport } from '../../src/sim/player';
import { buildingAt, floorsOf, HELI } from '../../src/sim/heli';
import { run, secs } from './helpers';

const w = getWorld('yuzhong');

describe('helicopter drop (M4-92)', () => {
  it('drops a squad on his building that sweeps every floor, and sends dogs and crawlers underground', () => {
    const s = createState(1, w);
    s.flags.god = true; s.flags.clear = true; s.time = 14 * 3600;
    // A building he's in: a tall enough one, inside on its second landing.
    const b = w.plots.findIndex(p => !p.far && p.route && p.route.length >= 6);
    const route = w.plots[b].route!, inside = route[2];
    teleport(s.player, inside.x, inside.y + 0.05, inside.z);
    run(s, w, 2);
    expect(buildingAt(w, s.player.pos)).toBe(b);
    // Three machines have just seen him.
    for (const u of s.units.filter(u => u.kind === 'humanoid' && !u.reserve).slice(0, 3)) u.saw = s.time;
    run(s, w, 6);
    expect(s.hive.heli?.plot).toBe(b);
    // It comes in over the roof.
    const roof = route[route.length - 1], heli = s.units.find(u => u.kind === 'heli')!;
    let over = false;
    for (let i = 0; i < 90 && !over; i++) { run(s, w, secs(1)); const q = unitPose(w, heli, s.time); over = Math.hypot(q.x - roof.x, q.z - roof.z) < HELI.circle + 3 && q.y > roof.y + 8; }
    expect(over).toBe(true);
    run(s, w, secs(2));
    expect(s.hive.heli?.phase).toBe('sweep');
    // The squad down from the roof, every landing visited; the dogs and crawlers underground.
    const squad = s.units.filter(u => u.reserve?.drop && u.kind === 'humanoid'), seen = new Set<number>(), down = route.slice().reverse(), stops = floorsOf(down);
    const dogs = s.units.filter(u => u.reserve?.drop && (u.kind === 'quadruped' || u.kind === 'crawler'));
    let under = 0;
    // (He steps out of their way: off to a roof far off, so they sweep without finding him.)
    teleport(s.player, roof.x + 400, roof.y + 50, roof.z + 400);
    for (let i = 0; i < 180; i++) {
      run(s, w, secs(1));
      for (const u of squad) { const q = unitPose(w, u, s.time); down.forEach((p, k) => { if (Math.hypot(q.x - p.x, q.z - p.z) < 2.5 && Math.abs(q.y - p.y) < 1.5) seen.add(k); }); }
      for (const u of dogs) { const q = unitPose(w, u, s.time); if (u.trip && q.y < roof.y - (route[route.length - 1].y - route[0].y) - 2) under++; }
    }
    expect(stops.length).toBeGreaterThanOrEqual(2);
    expect(stops.filter(k => !seen.has(k)).map(k => down[k].y.toFixed(1)), 'floors never visited').toEqual([]);
    expect(under).toBeGreaterThan(0);
  });
});
