// M10-39 (U-104): his sister's trail. A run's seed picks the exit Xiaoyu has gone to; her notes lie in order at the
// places on her way there from the family flat, each where he can stand and pick it up and read it, each pointing to
// the next place without naming everything; she waits at the exit, and he can leave with her or without her.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { startRun } from '../../src/sim/run';
import { B, type SimState } from '../../src/sim/types';
import { run, aim } from './helpers';
import { free } from '../../src/sim/physics';
import { raycast } from '../../src/world/geom';
import { TRAILS, NOTES } from '../../src/data/sister';
import { ROUTES, sisterRoute, layTrail, place } from '../../src/sim/sister';
import { endRun } from '../../src/sim/escape';
import { item } from '../../src/data/items';
import { lookTarget } from '../../src/sim/interact';

const w = getWorld('yuzhong'), flat = w.teleports.find(t => t.name === 'Li family flat')!;

/** What in each note points him on: to the next place, the last to where she is. */
const NEXT: Record<string, RegExp[]> = {
  bridge: [/buys dead drones/, /Dad's work/, /Line 6 comes up out of the hill at Xiaoshizi/],
  cable: [/hotpot place in the old air-raid shelter/, /substation on Xinhua Road/, /cable car station/],
  boat: [/police station down on the riverside road/, /river police pier/, /steps below Chaotianmen/],
  tunnel: [/where it meets the metro/, /Jiefangbei station/, /tunnel going east/],
};

/** Stand within reach of a point (on the floor round it, room to stand a step up off it, as on a slope; nothing between
 *  his eyes and it), look at it. */
function standBy(s: SimState, x: number, y: number, z: number): boolean {
  for (const r of [0.7, 1, 1.3]) for (let k = 0; k < 16; k++) {
    const px = x + Math.sin((k * Math.PI) / 8) * r, pz = z + Math.cos((k * Math.PI) / 8) * r, dn = raycast(w.index, px, y + 0.3, pz, 0, -1, 0, 3);
    if (!dn) continue;
    const fy = y + 0.3 - dn.t, ey = fy + 1.62, d = Math.hypot(x - px, y - ey, z - pz);
    if (!free(w.index, px, fy + 0.3, pz, 1.75)) continue;
    const see = raycast(w.index, px, ey, pz, (x - px) / d, (y - ey) / d, (z - pz) / d, d);
    if (see && see.t < d - 0.5) continue;
    teleport(s.player, px, fy + 0.3, pz);
    run(s, w, 40);
    aim(s, x, y, z);
    run(s, w, 2);
    return true;
  }
  return false;
}

const seedFor = (route: string) => { let seed = 1; while (sisterRoute(seed) !== route) seed++; return seed; };

describe("his sister's trail (M10-39)", () => {
  it('her exit comes from the run\'s seed on a stream of its own, each exit in some runs', () => {
    const picks = new Set(Array.from({ length: 60 }, (_, i) => sisterRoute(i + 1)));
    expect([...picks].sort()).toEqual([...ROUTES].sort());
    const s = createState(7, w), rng = s.rng.s;
    layTrail(s, w);
    expect(s.rng.s, 'no other draw moved').toBe(rng);
    expect(s.sister?.route).toBe(sisterRoute(7));
    // Every note is a document read in the backpack.
    for (const n of NOTES) expect([item(n.id).cat, item(n.id).desc]).toEqual(['doc', n.text]);
  }, 300000);

  for (const route of ROUTES) it(`to ${route}: her notes in order from the flat, each picked up and read, each pointing on; she's at the exit`, () => {
    const seed = seedFor(route), s = createState(seed, w), T = TRAILS[route];
    s.flags.god = true;
    startRun(s, w);
    expect(s.sister?.route).toBe(route);
    // Only this exit's notes lie in the world.
    const lying = s.dropped.filter(d => d.stack.id.startsWith('xy-'));
    expect(lying.map(d => d.stack.id)).toEqual(T.notes.map(n => n.id));
    const bad: string[] = [];
    T.notes.forEach((n, i) => {
      const d = lying[i];
      // The first on her desk in the flat; the rest at their place.
      if (n.at === 'desk') { if (Math.hypot(d.x - flat.x, d.z - flat.z) > 16 || d.y < flat.y - 1.5 + 0.6) bad.push(`${n.id} not on her desk`); }
      else { const t = place(w, n.at); if (!t || Math.hypot(d.x - t.x, d.z - t.z) > 1.5) bad.push(`${n.id} not at ${n.at}`); }
      if (i > 0 && n.at === T.notes[i - 1].at) bad.push(`${n.id} at the same place as the last`);
      // He can get to it, pick it up, and read in it where she went next.
      if (!standBy(s, d.x, d.y + 0.1, d.z)) { bad.push(`${n.id}: nowhere to stand by it`); return; }
      if (lookTarget(s, w)?.id !== `drop:${d.stack.uid}`) { bad.push(`${n.id}: not looked at (${lookTarget(s, w)?.id})`); return; }
      run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT });
      const got = s.inv.pack.items.find(x => x.id === n.id);
      if (!got) bad.push(`${n.id} not picked up`);
      else if (!NEXT[route][i].test(item(got.id).desc)) bad.push(`${n.id} doesn't point on`);
      // A clue, not the whole answer: no note names the exit's last step.
      if (/\b(jammer|relay|bolt cutters|operator key|hotwire|oxygen)\b/i.test(n.text)) bad.push(`${n.id} gives too much away`);
    });
    expect(bad).toEqual([]);
    // She waits at the exit's place, where he can stand by her.
    const t = place(w, T.waits)!;
    expect(Math.hypot(s.sister!.x - t.x, s.sister!.z - t.z)).toBeLessThan(1.5);
    expect(standBy(s, s.sister!.x, s.sister!.y + 0.7, s.sister!.z), 'room to stand by her').toBe(true);
    expect(lookTarget(s, w)?.id).toBe('sister');
  }, 600000);

  it('at her exit he can leave with her, or without her', () => {
    const route = ROUTES[0], seed = seedFor(route);
    const meet = () => { const s = createState(seed, w); s.flags.god = true; startRun(s, w); standBy(s, s.sister!.x, s.sister!.y + 0.7, s.sister!.z); return s; };
    const press = (s: SimState) => { const said: string[] = []; run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT }, x => { for (const e of x.events) if (e.t === 'msg') said.push(e.text); }); return said; };
    const ending = (s: SimState, r: string) => { endRun(s, r); return s.events.find(e => e.t === 'ending'); };
    // E on her: she'll come; the run ends at her exit with her.
    const a = meet();
    expect(press(a)).toEqual(['Xiaoyu will come']);
    expect(a.sister!.with).toBe(true);
    expect(ending(a, route)).toEqual({ t: 'ending', route, sister: true });
    expect(a.ended).toMatchObject({ route, sister: true });
    // E again: she stays; he leaves without her.
    const b = meet();
    press(b);
    run(b, w, 2);
    expect(press(b)).toEqual(['Xiaoyu stays']);
    expect(ending(b, route)).toEqual({ t: 'ending', route, sister: false });
    // Never asked, or out by another exit: without her.
    const c = meet();
    expect(ending(c, route)).toEqual({ t: 'ending', route, sister: false });
    const d = meet();
    press(d);
    expect(ending(d, ROUTES[1])).toEqual({ t: 'ending', route: ROUTES[1], sister: false });
  }, 300000);
});
