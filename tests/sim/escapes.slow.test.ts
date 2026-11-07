// M9-09: one pursuit escape in each district, scripted as a sensible player would go about it there. He's had by the
// district's machines where they'd have him (the district Engaged), gets away by a means that fits the place, and
// the machines lose him (Searching), look, and give up (Heightened or calm again) without finding him.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState, step } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { startPursuit, type Pursuer } from '../../src/sim/pursuit';
import { navPath } from '../../src/sim/nav';
import { unitPose, type Unit } from '../../src/sim/units';
import { districtOf } from '../../src/sim/district';
import { enterHide } from '../../src/sim/hide';
import { addItem } from '../../src/sim/inventory';
import { GRATE, bagsId } from '../../src/sim/grate';
import { doorSolid } from '../../src/sim/doors';
import { free } from '../../src/sim/physics';
import { raycast } from '../../src/world/geom';
import { WATER_Y } from '../../src/world/yuzhong/ground';
import { NAV } from '../../src/world/world';
import { movement as M } from '../../src/data/movement';
import { TAG } from '../../src/data/units';
import { B, emptyInput, type InputFrame, type SimState } from '../../src/sim/types';
import { glider, escapeRoute } from './difficulty';
import { settle, secs } from './helpers';

type V3 = { x: number; y: number; z: number };
const w = getWorld('yuzhong');
const tp = (name: string) => { const t = w.teleports.find(q => q.name === name); if (!t) throw new Error(`no teleport ${name}`); return t; };
const tick = (s: SimState, f: Partial<InputFrame> = {}) => step(s, w, { ...emptyInput(), yaw: s.player.yaw, pitch: s.player.pitch, ...f });
const near = (a: V3, b: V3) => Math.hypot(a.x - b.x, a.z - b.z);
/** Along a way at his sprint (difficulty.ts's glider, as M4-32's escapes go). */
function go(s: SimState, way: V3[]) {
  const f = glider([{ ...s.player.pos }, ...way]);
  for (let i = 0; i < secs(240) && !f.done(); i++) f.step(s, w);
}
/** The way a walker would go (stairs and tunnels too). */
const walk = (a: V3, b: V3) => navPath(w.nav!, a, b, 'humanoid')?.pts ?? [];
/** The machines on the move he can see from where he stands, and what's after him: what a sensible player keeps clear of. */
function eyes(s: SimState, u: Unit): V3[] {
  const p = s.player.pos;
  return [unitPose(w, u, s.time), ...s.units.filter(q => q !== u && !q.dead && !q.reserve && q.cam === undefined).map(q => unitPose(w, q, s.time)).filter(q => q.active && !q.docked && near(q, p) < 80)];
}
/** A tag from a dog's launcher on him gives him away wherever he goes (U-104): picked off with his dongle. */
function pickOff(s: SimState) {
  if (!s.inv.pack.items.some(i => i.id === 'sdr')) addItem(s, s.inv.pack, 'sdr', 1);
  for (let k = 0; k < 10 && s.player.tag; k++) {
    for (let i = 0; i < 300 && (s.player.mode !== 'ground' || s.task); i++) tick(s);
    tick(s, { cmds: [{ c: 'use', uid: s.inv.pack.items.find(i => i.id === 'sdr')!.uid }] });
    for (let i = 0; i < secs(TAG.remove + 0.3); i++) tick(s);
  }
  expect(s.player.tag, 'the tag picked off').toBe(false);
}
/** In at the nearest street door away from what's after him, up its stairs (`rise` m or more), into a wardrobe
 *  (M4-32's way). */
function inside(s: SimState, u: Unit, rise = 0) {
  const r = escapeRoute(w, s.player.pos, unitPose(w, u, s.time), eyes(s, u), rise);
  expect(r.hide, 'a door and a wardrobe up its stairs').toBeGreaterThanOrEqual(0);
  go(s, r.way);
  pickOff(s);
  expect(enterHide(s, w, r.hide), 'in the wardrobe').toBe(true);
}

interface Plan {
  district: string; pursuer: Pursuer; hour?: number;
  /** where he's had */
  at: () => V3;
  /** his getaway, run tick by tick; what he holds while he waits (nothing: still) */
  flee: (s: SimState, u: Unit) => ((s: SimState) => Partial<InputFrame>) | void;
}

const PLANS: Record<string, Plan> = {
  // Shibati: a dog coming for him by the alleys at the top of the Eighteen Stairs: down its steps to the friends'
  // hideout's grate in its alley, under it and shut behind him (M4-32's).
  shibati: {
    district: 'shibati', pursuer: 'quadruped', at: () => tp('shibati'),
    flee: s => {
      pickOff(s);
      const grate = w.inter.find(i => i.id === 'airraid-grate')!, by = { x: grate.x + 1.6, y: grate.y, z: grate.z };
      go(s, [...(navPath(w.nav!, s.player.pos, by, 'street')?.pts ?? []), by]);
      const o = s.wstate.open, bed = w.inter.find(i => i.id === 'airraid-table')!;
      o[grate.id] = true; o[bagsId(grate)] = true; w.index.off[doorSolid(grate)] = 1;
      for (let i = 0; i < secs(GRATE.lift); i++) tick(s);
      teleport(s.player, bed.x + 1.2, bed.y - 0.2, bed.z);
      for (let i = 0; i < 10; i++) tick(s);
      pickOff(s);
      o[grate.id] = false; o[bagsId(grate)] = false; w.index.off[doorSolid(grate)] = 0;
      for (let i = 0; i < secs(GRATE.shut); i++) tick(s);
    },
  },
  // Jiaochangkou: a camera has him at the junction: off out of its sight and in at a door, up and into a wardrobe.
  jiaochangkou: { district: 'jiaochangkou', pursuer: 'camera', at: () => tp('jiaochangkou'), flee: inside },
  // Xiaoshizi: a camera over Xinhua Road has him in the night: off out of its sight and in at a door, a floor or more
  // up its stairs and into a wardrobe (its streets crawl with dogs and humanoids: nothing near the street would do).
  xiaoshizi: { district: 'xiaoshizi', pursuer: 'camera', hour: 1, at: () => tp('xiaoshizi'), flee: (s, u) => inside(s, u, 3) },
  // Jiefangbei: a drone over the walking streets has him: the jammer on (it hovers blind, its word cut), in at the
  // nearest door and up into a wardrobe, the jammer off once he's in (left on, it's a beacon).
  jiefangbei: {
    district: 'jiefangbei', pursuer: 'drone', at: () => tp('jiefangbei'),
    flee: (s, u) => {
      addItem(s, s.inv.pack, 'jammer', 1, { charge: 100 });
      const jam = () => tick(s, { cmds: [{ c: 'use', uid: s.inv.pack.items.find(i => i.id === 'jammer')!.uid }] });
      jam();
      inside(s, u);
      for (let i = 0; i < 60; i++) tick(s);
      jam();
      expect(s.jam, 'the jammer off').toBeUndefined();
    },
  },
  // Hongyadong: a camera has him on its 30 m terrace: in through the stilt houses' insides, up their stairs toward
  // Cangbai Road, and into a wardrobe in a room off the way up.
  hongyadong: {
    district: 'hongyadong', pursuer: 'camera', at: () => tp('hongyadong'),
    flee: s => {
      const way = walk(s.player.pos, tp('Hongyadong top (Cangbai Road)'));
      for (let k = Math.floor(way.length / 3); k < way.length; k++) {
        const q = way[k], h = w.hides.map((h, i) => ({ h, i, c: { x: (h.inner.x0 + h.inner.x1) / 2, y: q.y, z: (h.inner.z0 + h.inner.z1) / 2 } }))
          .find(({ h, c }) => (h.kind === 'wardrobe' || h.kind === 'crate') && Math.abs(h.inner.y0 - q.y) < 0.8 && near(c, q) < 20);
        if (!h) continue;
        const d = near(q, h.c) || 1;
        go(s, [...way.slice(0, k + 1), { x: h.c.x + ((q.x - h.c.x) / d) * 1, y: q.y, z: h.c.z + ((q.z - h.c.z) / d) * 1 }]);
        pickOff(s);
        expect(enterHide(s, w, h.i), 'in the wardrobe').toBe(true);
        return;
      }
      throw new Error('no wardrobe off the way up');
    },
  },
  // Chaotianmen: a drone has him on the river steps at the tip, by the water: on down them into the Yangtze, under, and along the
  // bank under water as far as a breath goes, up for air with only his head out, under again; then still, so.
  chaotianmen: {
    district: 'chaotianmen', pursuer: 'drone',
    at: () => { const f = steps(), d = (f.y - WATER_Y - 1) * 2; return { x: f.x + f.nx! * d, y: WATER_Y + 1.3, z: f.z + f.nz! * d }; },
    flee: s => {
      // (Down the steps to where they end 2 m under, and on off their end into deep water.)
      const f = steps(), L = (f.y - (WATER_Y - 2)) * 2 + 3;
      go(s, [{ x: f.x + f.nx! * L, y: WATER_Y - 1.5, z: f.z + f.nz! * L }]);
      // (Out from the steps a while, then along the bank: within the sonar's reach of it, M6-27. Under, he holds
      // 2 m down; up for air every 40 s or so.)
      const out = Math.atan2(-f.nx!, -f.nz!), along = Math.atan2(f.nz!, -f.nx!);
      let i = 0;
      return () => {
        const under = i++ % secs(45) < secs(36), on = i < secs(120);
        return { yaw: i < secs(12) ? out : along, my: on ? 1 : 0, buttons: (under && s.player.pos.y > WATER_Y - 2.3 ? B.CROUCH : 0) | (on ? B.SPRINT : 0) };
      };
    },
  },
  // The rest of Yuzhong: a dog coming down the street for him: off down an alley and up a ladder or drainpipe on a
  // building's wall to its roof (where no dog climbs), away from the edge, and crouched still there.
  yuzhong: {
    district: 'yuzhong', pursuer: 'quadruped', at: () => { const l = ladder(); return walkTo(l.street, 25); },
    flee: s => {
      pickOff(s);
      const l = ladder();
      go(s, [...walk(s.player.pos, l.street), l.street, l.foot, { ...l.foot, y: l.top.y }, l.top]);
      for (let i = 0; i < 20; i++) tick(s);
      return () => ({ buttons: B.CROUCH });
    },
  },
};

/** The river steps at Chaotianmen. */
const steps = () => w.features.find(f => f.kind === 'river:steps' && districtOf(f.x, f.z) === 'chaotianmen')!;
/** A street point about d m from a place by the ways there. */
function walkTo(to: V3, d: number): V3 {
  const pts = w.nav!.pts.filter((q, i) => w.nav!.adj[i].some(e => e[2] === NAV.street) && Math.abs(near(q, to) - d) < 15).sort((a, b) => Math.abs(near(a, to) - d) - Math.abs(near(b, to) - d));
  const p = pts.find(q => walk(q, to).length > 1);
  expect(p, `a street ${d} m from ${to.x.toFixed(0)},${to.z.toFixed(0)}`).toBeDefined();
  return { x: p!.x, y: p!.y + 0.05, z: p!.z };
}
/** A ladder or a drainpipe in the rest of Yuzhong 5 to 20 m up a wall to a flat roof he can stand on, its foot down
 *  an alley clear to it off a street: the street there, its foot, and the roof 5 m in from its top. */
function ladder() {
  for (const c of w.climbables) {
    if ((c.kind !== 'ladder' && c.kind !== 'pipe') || c.y1 - c.y0 < 5 || c.y1 - c.y0 > 20 || districtOf(c.x, c.z) !== 'yuzhong') continue;
    const foot = { x: c.x + c.nx * 0.6, y: c.y0 + 0.05, z: c.z + c.nz * 0.6 }, roof = (k: number) => { const x = c.x - c.nx * k, z = c.z - c.nz * k, h = raycast(w.index, x, c.y1 + 1.5, z, 0, -1, 0, 3); return h ? { x, y: c.y1 + 1.55 - h.t, z } : null; };
    const top = roof(2), far = roof(5);
    if (!top || !far || Math.abs(top.y - far.y) > 0.5 || !free(w.index, foot.x, foot.y, foot.z, M.height.stand) || !free(w.index, far.x, far.y, far.z, M.height.stand)) continue;
    // (Off a street, down an alley clear to it.)
    const i = w.nav!.pts.findIndex((q, i) => near(q, foot) < 25 && Math.abs(q.y - foot.y) < 1.5 && w.nav!.adj[i].some(e => e[2] === NAV.street) && !raycast(w.index, q.x, q.y + 1, q.z, (foot.x - q.x) / near(q, foot), 0, (foot.z - q.z) / near(q, foot), near(q, foot)));
    if (i >= 0) return { street: { ...w.nav!.pts[i] }, foot, top: far };
  }
  throw new Error('no ladder or pipe up to a roof');
}

describe('pursuit escapes across the city (M9-09)', () => {
  for (const [name, P] of Object.entries(PLANS)) {
    it(name, async () => {
      await settle();
      const s = createState(1, w), at = P.at();
      s.time = (P.hour ?? 14) * 3600; s.flags.god = true; s.flags.clear = true; s.weather = { fog: 0, rain: 0 };
      teleport(s.player, at.x, at.y, at.z);
      for (let i = 0; i < 30; i++) tick(s);
      expect(districtOf(s.player.pos.x, s.player.pos.z)).toBe(P.district);
      const u = startPursuit(s, w, P.pursuer)!;
      expect(u, 'a pursuer near').not.toBeNull();
      const D = () => s.hive.districts[P.district]?.state ?? 'unaware', busy = () => Object.values(s.hive.districts).some(q => q.state === 'engaged' || q.state === 'searching');
      for (let i = 0; i < secs(30) && D() !== 'engaged'; i++) tick(s);
      expect(D(), 'had').toBe('engaged');
      const hold = P.flee(s, u) ?? (() => ({}));
      const states: string[] = [];
      let lost = false, found = '';
      for (let i = 0; i < secs(300); i++) {
        tick(s, hold(s));
        const now = Object.entries(s.hive.districts).filter(([, q]) => q.state === 'engaged' || q.state === 'searching').map(([k, q]) => `${k}:${q.state}`).join(',') || 'calm';
        if (now !== states[states.length - 1]) states.push(now);
        if (D() === 'searching') lost = true;
        if (lost && !found && Object.values(s.hive.districts).some(q => q.state === 'engaged')) {
          const p = s.player.pos;
          found = s.units.filter(q => q.state === 'engaged').map(q => `${q.kind}@${Math.round(near(unitPose(w, q, s.time), p))}m`).join(',') + ` he at ${p.x.toFixed(0)},${p.y.toFixed(0)},${p.z.toFixed(0)} ${s.player.mode}`;
        }
        if (lost && !busy()) break;
      }
      const log = states.slice(-6).join(' > ');
      expect(lost, `lost him: ${log}`).toBe(true);
      expect(found, `found again: ${log}`).toBe('');
      expect(busy(), `the search over: ${log}`).toBe(false);
      expect(['heightened', 'unaware'], log).toContain(D());
    });
  }
});
