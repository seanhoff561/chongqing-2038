// M6-10: the construction site (yuzhong/site.ts, siteways.ts, sim/sitehaz.ts): its four ways in, each taken on his
// own legs and hands from the street (the gate with his site card, the scaffold over the hoarding, the crawl under it
// along the ditch, the drop from the next roof onto the hoist and the ride down), its tier 2 tool stores and the
// crane cab's pulley block, and its two hazards set off (a loose plank run onto, the crane's load swung into him).
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { syncWorld } from '../../src/sim/doors';
import { addItem } from '../../src/sim/inventory';
import { B } from '../../src/sim/types';
import { SITEHAZ } from '../../src/sim/sitehaz';
import { sitePoly } from '../../src/world/yuzhong/site';
import { inside } from '../../src/world/yuzhong/shapes';
import { walkPath } from './walker';
import { climbPole } from './climbbot';
import { run, secs, aim, LMB, RMB } from './helpers';

const w = getWorld('yuzhong'), f = (k: string) => w.features.filter(q => q.kind === k), one = (k: string) => f(k)[0];
const poly = sitePoly()!, base = w.teleports.find(t => t.name === 'Construction site')!.y - 0.05;
type S = ReturnType<typeof createState>;
/** A run with the machines away (but cameras), him at a spot, the site's things as the run has them. */
const at = (x: number, y: number, z: number, yaw = 0) => {
  const s = createState(4, w);
  s.flags.clear = true; s.flags.god = true; s.time = 12 * 3600;
  for (const u of s.units) if (u.cam === undefined) u.off = Infinity;
  syncWorld(s, w);
  teleport(s.player, x, y, z);
  s.player.yaw = yaw;
  run(s, w, 30);
  return s;
};
const tp = (name: string) => { const t = w.teleports.find(q => q.name === name)!; return at(t.x, t.y, t.z, t.yaw); };
const inSite = (s: S) => inside(poly, s.player.pos.x, s.player.pos.z) && s.player.pos.y < base + 0.8 && !s.dead;
const where = (s: S) => `at ${s.player.pos.x.toFixed(1)},${s.player.pos.y.toFixed(1)},${s.player.pos.z.toFixed(1)} (${s.player.mode}, ${s.player.posture})`;
/** On up over the top of a climbable until he's standing (as tests/sim/pier.test.ts). */
function over(s: S, l: { x: number; z: number; y1: number; nx: number; nz: number }) {
  const bits: number[] = [LMB, RMB];
  let hand = 0;
  for (let step = 0; step < 20 && s.player.mode !== 'ground'; step++) {
    const p = s.player, held = p.hands.map((h, i) => (h.grip ? bits[i] : 0)).reduce((a, b) => a | b, 0);
    aim(s, l.x - l.nx * 0.3, Math.min(l.y1 - 0.05, p.pos.y + 2.2), l.z - l.nz * 0.3);
    run(s, w, 2, { buttons: held | bits[hand] });
    run(s, w, secs(1), { buttons: bits[hand], my: 1 });
    hand = 1 - hand;
    if (p.mode === 'action') run(s, w, secs(1));
  }
}
/** Hold E on it until it's done (or `t` s). */
function work(s: S, id: string, t = 15) {
  const it = w.inter.find(i => i.id === id)!;
  aim(s, it.x, it.y, it.z);
  run(s, w, 1, { buttons: B.INTERACT, pressed: B.INTERACT });
  for (let i = 0; i < secs(t) && s.task; i++) { aim(s, it.x, it.y, it.z); run(s, w, 1, { buttons: B.INTERACT }); }
}

describe('the construction site (M6-10)', () => {
  it('has its four ways in, its tool stores and its hazards', () => {
    const gate = w.inter.find(i => i.id === 'site-gate')!;
    expect(gate.data).toMatchObject({ lock: 'locked', key: 'sitecard' });
    expect(w.cameras.some(c => c.box && Math.hypot(c.x - gate.x, c.z - gate.z) < 8), 'the gate camera').toBe(true);
    for (const k of ['site:scaffold', 'site:ditch', 'site:hoist', 'crane:pick', 'crane:drop', 'crane:high']) expect(f(k).length, k).toBe(1);
    expect(f('site:plank').length, 'loose planks').toBe(2);
    expect(w.inter.find(i => i.id.startsWith('site-box'))?.data?.items, 'the steel hook').toEqual([['hook', 1]]);
    expect(w.inter.filter(i => i.id.startsWith('site-box') && i.data?.loot === 'construction').length, 'tool stores').toBeGreaterThanOrEqual(1);
    expect(w.inter.find(i => i.id === 'site-cab')?.data?.items).toEqual([['pulley', 1]]);
    expect(w.features.some(q => q.kind === 'li:sitecard'), 'his site card at home').toBe(true);
  });

  it('is walked into through the gate with his site card', () => {
    const s = tp('Construction site: gate');
    addItem(s, s.inv.pack, 'sitecard', 1);
    work(s, 'site-gate');
    expect(s.wstate.open['site-gate'], 'the gate open').toBe(true);
    walkPath(s, w, [one('site:gateIn')], false);
    expect(inSite(s), where(s)).toBe(true);
  });

  it('is climbed into over the hoarding by the scaffold, and down its steps', () => {
    const o = one('site:scaffold'), s = tp('Construction site: scaffold');
    const l = w.climbables.filter(c => c.kind === 'ladder').sort((a, b) => Math.hypot(a.x - o.x, a.z - o.z) - Math.hypot(b.x - o.x, b.z - o.z))[0];
    walkPath(s, w, [{ x: l.x + l.nx * 0.6, y: l.y0, z: l.z + l.nz * 0.6 }], false);
    expect(climbPole(s, w, l, 0.6), 'up the scaffold ladder').toBe(true);
    over(s, l);
    const r = walkPath(s, w, [one('site:scaffoldWalk'), one('site:scaffoldEnd'), one('site:scaffoldIn')], false);
    expect(r.reached, where(s)).toBe(3);
    expect(inSite(s), where(s)).toBe(true);
    // (Walked, the loose planks held.)
    expect(Object.keys(s.wstate.open).filter(k => k.startsWith('site-plank'))).toEqual([]);
  });

  it('is crawled into under the hoarding along the ditch', () => {
    const q = one('site:ditchIn');
    // (Standing, he can't get under; then from where he started, crawling: the walker sidesteps along the hoarding.)
    expect(walkPath(tp('Construction site: ditch'), w, [q], false).reached).toBe(0);
    const s = tp('Construction site: ditch');
    run(s, w, 10, { buttons: B.CRAWL, pressed: B.CRAWL });
    for (let t = 0; t < secs(25) && Math.hypot(q.x - s.player.pos.x, q.z - s.player.pos.z) > 1; t++) {
      const yaw = Math.atan2(-(q.x - s.player.pos.x), -(q.z - s.player.pos.z));
      s.player.yaw = yaw;
      run(s, w, 1, { yaw, my: 1, buttons: B.CRAWL });
    }
    expect(s.player.posture).toBe('crawl');
    expect(inSite(s), where(s)).toBe(true);
  });

  it('is dropped into from the next roof onto the hoist, and ridden down', () => {
    const s = tp('Construction site: hoist'), land = one('site:hoist');
    // To the corner of the roof, then on at the landing, jumping (Space held) up over the parapet and off.
    expect(walkPath(s, w, [one('site:hoistRoof')], false).reached, where(s)).toBe(1);
    let held = 0;
    for (let t = 0; t < secs(6) && !s.dead && !(s.player.mode === 'ground' && s.player.pos.y < land.y + 1); t++) {
      const p = s.player.pos, yaw = Math.atan2(-(land.x - p.x), -(land.z - p.z));
      if (held <= 0 && s.player.mode === 'ground') held = 20;
      s.player.yaw = yaw;
      run(s, w, 1, { yaw, my: 1, buttons: held-- > 0 ? B.JUMP : 0, pressed: held === 19 ? B.JUMP : 0 });
    }
    run(s, w, secs(1));
    expect(Math.abs(s.player.pos.y - land.y), `on the hoist's landing: ${where(s)}`).toBeLessThan(0.3);
    expect(s.dead).toBeFalsy();
    // Along it to the cage, and down in it.
    const cage = w.inter.find(i => i.id === 'site-hoist')!;
    walkPath(s, w, [{ x: cage.x, y: land.y, z: cage.z }], false);
    work(s, 'site-hoist', SITEHAZ.ride + 2);
    run(s, w, 2);
    expect(inSite(s), where(s)).toBe(true);
  });

  it('drops a loose plank out from under him if he runs onto it', () => {
    const a = one('site:scaffoldWalk'), b = one('site:scaffoldEnd'), s = at(a.x, a.y + 0.05, a.z);
    s.flags.god = false;
    walkPath(s, w, [b], true);
    expect(Object.keys(s.wstate.open).some(k => k.startsWith('site-plank')), 'a plank gone').toBe(true);
    run(s, w, secs(3));
    expect(s.player.pos.y, where(s)).toBeLessThan(a.y - 1);
  });

  it("swings the crane's load into him on the top slab", () => {
    const d = one('crane:drop'), s = at(d.x, d.y - 0.6 + 0.05, d.z);
    s.flags.god = false;
    let hit = false;
    for (let i = 0; i < secs(SITEHAZ.cycle.reduce((a, b) => a + b, 0) + 5) && !hit; i++) run(s, w, 1, {}, st => { for (const e of st.events) if (e.t === 'hurt' && e.cause === 'crane') hit = true; });
    expect(hit).toBe(true);
  });
});
