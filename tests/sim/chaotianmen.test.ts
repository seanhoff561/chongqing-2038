// M6-04 (U-108): Chaotianmen and Raffles City. The square at the tip, its deck out over the falling ground and its
// great stair down to the road round the tip; the eight towers at their real heights (T3N and T4N 350 m, the rest
// 250 m); The Crystal laid across the middle four about 250 m up; the green Jialing and the brown Yangtze meeting
// past the tip. And he walks there from Xiaoshizi on his own legs.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { navPath } from '../../src/sim/nav';
import { raycast } from '../../src/world/geom';
import { RAFFLES, TOWERS } from '../../src/world/yuzhong/raffles';
import { jialingShare } from '../../src/render/rivers';
import { walkPath } from './walker';
import { run } from './helpers';

const w = getWorld('yuzhong'), F = (k: string) => w.features.find(f => f.kind === k)!;
const floorAt = (x: number, y: number, z: number) => { const h = raycast(w.index, x, y + 1, z, 0, -1, 0, 3); return h ? y + 1 - h.t : null; };

describe('Chaotianmen and Raffles City (M6-04)', () => {
  it('has the square at the tip, its stair down to the road round it', () => {
    const sq = F('chaotianmen:plaza'), head = F('chaotianmen:stair'), foot = F('chaotianmen:foot');
    expect(floorAt(sq.x, RAFFLES.deck, sq.z), 'the deck').toBeCloseTo(RAFFLES.deck, 1);
    // The stair: down from the deck's head to the road at its foot, a step every metre or so all the way.
    for (let f = 0; f <= 1; f += 0.1) {
      const z = foot.z + 2 + (head.z - 2 - foot.z - 2) * f, want = foot.y + (RAFFLES.deck - foot.y) * f, y = floorAt(head.x, want + 1, z);
      expect(y, `stair at ${f.toFixed(1)}`).not.toBeNull();
      expect(Math.abs(y! - want), `stair at ${f.toFixed(1)}`).toBeLessThan(1.5);
    }
    expect(RAFFLES.deck - foot.y, 'its prow over the road').toBeGreaterThan(15);
  });

  it('has the eight towers at their real heights and The Crystal across the middle four, 250 m up', () => {
    const tops = TOWERS.map(t => w.plots.find(p => Math.hypot(p.corners.reduce((a, c) => a + c[0], 0) / 4 - t.obb.cx, p.corners.reduce((a, c) => a + c[1], 0) / 4 - t.obb.cz) < 2)!);
    expect(tops.every(Boolean)).toBe(true);
    TOWERS.forEach((t, i) => { if (!t.crystal) expect(tops[i].top - tops[i].base, t.name).toBeCloseTo(t.name.endsWith('N') ? 350 : 250, 0); });
    const c = F('crystal'), feet = TOWERS.map((t, i) => (t.crystal ? tops[i].base : NaN)).filter(v => !Number.isNaN(v));
    expect(Math.abs(c.y - feet.reduce((a, b) => a + b, 0) / feet.length - 250), 'about 250 m up').toBeLessThan(1);
    // Its floor over each of the four (off the middle, where a way up comes through it), and its roof over that.
    TOWERS.forEach((t, i) => { if (t.crystal) { const o = t.obb, x = o.cx - Math.sin(o.yaw) * o.hd * 0.6, z = o.cz + Math.cos(o.yaw) * o.hd * 0.6; expect(tops[i].top, t.name).toBeCloseTo(c.y, 1); expect(floorAt(x, c.y, z), t.name).toBeCloseTo(c.y, 1); } });
    const [g0, g1] = w.features.filter(f => f.kind === 'crystal:glass');
    expect(raycast(w.index, (g0.x + g1.x) / 2, c.y + 2, (g0.z + g1.z) / 2, 0, 1, 0, 40)?.t, 'its roof').toBeCloseTo(RAFFLES.tall - 2, 0);
  });

  it('has the Jialing and the Yangtze meeting past the tip', () => {
    expect(jialingShare(1500, 500), 'the Jialing off Hongyadong').toBe(1);
    expect(jialingShare(2100, 1300), 'the Yangtze off Dongshuimen').toBe(0);
    // Past the tip, side by side: the Jialing's north of their line, the Yangtze's south.
    expect(jialingShare(2200, 160)).toBeGreaterThan(0.7);
    expect(jialingShare(2200, 280)).toBeLessThan(0.3);
  });

  it('is walked to from Xiaoshizi', () => {
    const s = createState(5, w), from = w.teleports.find(t => t.name === 'xiaoshizi')!, sq = F('chaotianmen:plaza');
    s.flags.god = true; s.flags.clear = true; s.time = 12 * 3600; s.units.length = 0;
    // (From the street at Xiaoshizi, clear of the station's glass entrance at its landmark.)
    const way = navPath(w.nav!, from, sq, 'street')!;
    expect(way).toBeTruthy();
    const k = way.pts.findIndex(q => Math.hypot(q.x - from.x, q.z - from.z) > 12);
    teleport(s.player, way.pts[k].x, way.pts[k].y + 0.1, way.pts[k].z);
    run(s, w, 3);
    const pts = way.pts.slice(k + 1).concat([{ x: sq.x, y: sq.y, z: sq.z }]), r = walkPath(s, w, pts);
    expect(r.reached, `stopped at ${r.at.x.toFixed(0)},${r.at.y.toFixed(0)},${r.at.z.toFixed(0)}, point ${r.reached} of ${pts.length}`).toBe(pts.length);
    expect(s.player.pos.y).toBeCloseTo(RAFFLES.deck, 0);
  }, 600000);
});
