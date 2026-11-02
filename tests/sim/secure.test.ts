// M6-11 to M6-13: the hospital, the police station and the electronics market, each in a building of the city
// (yuzhong/secure.ts): every way in taken (its card, the crowbar, the bolt cutters, or just shoved: each opened from
// where he'd stand), its loot its own, and its hazard set off: the pharmacy's pressure plate and the wards' motion
// sensors, the armoury's ceiling turret, the shop floors' acoustic arrays.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { syncWorld } from '../../src/sim/doors';
import { addItem } from '../../src/sim/inventory';
import { raycast } from '../../src/world/geom';
import { free } from '../../src/sim/physics';
import { B } from '../../src/sim/types';
import { run, secs, aim } from './helpers';
import type { Inter } from '../../src/world/world';
import { GAS } from '../../src/sim/gas';
import { RELAY, relayDown } from '../../src/sim/relay';
import { districtOf } from '../../src/sim/district';

const w = getWorld('yuzhong');
const site = (id: string) => w.secure!.find(q => q.id === id)!;
const inter = (id: string) => w.inter.find(i => i.id === id)!;

/** A run with the tools to hand, stood in front of a way in on its floor, looking at it; null if there's nowhere. */
function before(it: Inter) {
  // (Off a grate's rim: further out.)
  const radii = it.kind === 'grate' ? [1.4, 1.8, 2.2] : [0.9, 1.4];
  for (let k = 0; k < 8 * radii.length; k++) {
    const a = (k * Math.PI) / 4, r = radii[k >> 3], x = it.x + Math.sin(a) * r, z = it.z + Math.cos(a) * r, on = ((it.data?.half as number) ?? 1.2) + 0.65;
    if (it.kind === 'grate' && Math.abs(x - it.x) < on && Math.abs(z - it.z) < on) continue;
    for (const top of [it.y + 0.6, it.y - 0.4]) {
      const down = raycast(w.index, x, top, z, 0, -1, 0, 3);
      if (!down) continue;
      const y = top - down.t + 0.02;
      if (!free(w.index, x, y, z, 0.5)) continue;
      const s = createState(3, w);
      s.flags.clear = true; s.flags.god = true; s.time = 12 * 3600;
      for (const u of s.units) u.off = Infinity;
      syncWorld(s, w);
      for (const id of ['hospcard', 'policecard', 'telcard', 'badge', 'crowbar', 'boltcutters']) addItem(s, s.inv.pack, id, 1);
      teleport(s.player, x, y, z);
      run(s, w, 5);
      aim(s, it.x, it.y, it.z);
      run(s, w, 2);
      if (s.target === it.id) return s;
      // (A vent's opening low down: from a crouch.)
      run(s, w, 10, { buttons: B.CROUCH });
      aim(s, it.x, it.y, it.z);
      run(s, w, 2, { buttons: B.CROUCH });
      if (s.target === it.id) return s;
    }
  }
  return null;
}

/** Hold E on it until it gives (or 15 s). */
const said: string[] = [];
function work(s: ReturnType<typeof createState>, it: Inter) {
  const crouch = s.player.posture === 'crouch' ? B.CROUCH : 0;
  aim(s, it.x, it.y, it.z);
  said.length = 0;
  run(s, w, 1, { buttons: B.INTERACT | crouch, pressed: B.INTERACT }, st => { for (const e of st.events) if (e.t === 'msg') said.push(e.text); });
  for (let i = 0; i < secs(15) && !s.wstate.open[it.id]; i++) { aim(s, it.x, it.y, it.z); run(s, w, 1, { buttons: B.INTERACT | crouch }); }
  return !!s.wstate.open[it.id];
}

describe('high-security sites in the city (M6-11, M6-12, M6-13)', () => {
  for (const [id, n] of [['hospital', 4], ['police', 4], ['market', 4], ['telecom', 4], ['substation', 4]] as const) {
    it(`the ${id}: ${n} ways in, each taken`, () => {
      const S = site(id);
      expect(S, id).toBeTruthy();
      expect(S.ways.length, S.ways.map(q => q.kind).join(',')).toBeGreaterThanOrEqual(n);
      const failed: string[] = [];
      for (const way of S.ways) {
        const it = inter(way.id), s = before(it);
        if (!s) { failed.push(`${way.kind}: nowhere to stand`); continue; }
        if (!work(s, it)) failed.push(`${way.kind}: didn't open (${it.data?.lock ?? 'shut'}; ${said.join('/')}; target ${s.target}, at ${(s.player.pos.y - it.y).toFixed(1)})`);
      }
      expect(failed).toEqual([]);
      // Its containers roll from its own table.
      const boxes = w.inter.filter(i => i.kind === 'container' && i.data?.site === id);
      expect(boxes.length).toBeGreaterThan(10);
    }, 300000);
  }

  /** A run near a site with every machine away but its sensors. */
  const near = (x: number, y: number, z: number) => {
    const s = createState(3, w);
    s.flags.clear = true; s.flags.god = true; s.time = 12 * 3600;
    for (const u of s.units) if (u.cam === undefined) u.off = Infinity;
    syncWorld(s, w);
    teleport(s.player, x, y, z);
    return s;
  };
  const sensor = (kind: string, id: string, max = 60) => w.cameras.map((c, i) => ({ c, i })).filter(({ c }) => c.kind === kind && Math.hypot(c.x - site(id).x, c.z - site(id).z) < max);
  /** A free spot on the floor in front of a sensor (within its view, d m out), or under it. */
  const spot = (c: { x: number; y: number; z: number; yaw: number }, ds = [3, 2, 4, 1.5], all = false) => {
    for (const d of ds) for (const turn of all ? [0, 1, 2, 3, 4, 5, 6, 7].map(k => (k * Math.PI) / 4) : [0, 0.4, -0.4, 0.8, -0.8]) {
      const a = c.yaw + turn, x = c.x + Math.sin(a) * d, z = c.z + Math.cos(a) * d, down = raycast(w.index, x, c.y - 0.2, z, 0, -1, 0, 5);
      if (!down) continue;
      const y = c.y - 0.2 - down.t + 0.02;
      if (free(w.index, x, y, z, 1.8) && !raycast(w.index, c.x, c.y, c.z, x - c.x, y + 1 - c.y, z - c.z, 0.999)) return { x, y, z };
    }
    return null;
  };
  /** Moving about where he stands: the first way he can go, a few steps there and back. */
  const moveAbout = (s: ReturnType<typeof createState>, n: number, buttons = 0) => {
    for (let k = 0; k < 8; k++) {
      s.player.yaw = (k * Math.PI) / 4;
      const p0 = { ...s.player.pos };
      run(s, w, 20, { yaw: s.player.yaw, my: 1, buttons });
      if (Math.hypot(s.player.pos.x - p0.x, s.player.pos.z - p0.z) > 0.5) { for (let t = 0; t < n; t += 40) { run(s, w, 20, { yaw: s.player.yaw, my: -1, buttons }); run(s, w, 20, { yaw: s.player.yaw, my: 1, buttons }); } return true; }
    }
    return false;
  };

  it("the hospital's pharmacy plate and its wards' motion sensors give him away", () => {
    const plate = sensor('tripwire', 'hospital').find(({ c }) => c.w)!;
    expect(plate, 'the plate').toBeTruthy();
    const s = near((plate.c.x + plate.c.to!.x) / 2, plate.c.y - 0.02, (plate.c.z + plate.c.to!.z) / 2);
    run(s, w, 10);
    expect(s.units.find(u => u.cam === plate.i)!.aware ?? 0).toBeGreaterThanOrEqual(1);
    const pirs = sensor('pir', 'hospital');
    expect(pirs.length, 'wards with motion sensors').toBeGreaterThanOrEqual(2);
    // Walking about a ward in front of one.
    const tripped = pirs.filter(({ c, i }) => { const at = spot(c); if (!at) return false; const t = near(at.x, at.y, at.z); run(t, w, 3); moveAbout(t, secs(2)); return (t.units.find(u => u.cam === i)!.aware ?? 0) >= 1; });
    expect(tripped.length).toBeGreaterThanOrEqual(1);
  });

  it("the police armoury's ceiling turret opens up on him", () => {
    const tur = sensor('turret', 'police');
    expect(tur.length, 'the turret').toBeGreaterThanOrEqual(1);
    const { c, i } = tur[0], at = spot(c, [3, 2, 4, 1.5])!;
    expect(at, 'a place in the armoury').toBeTruthy();
    const s = near(at.x, at.y, at.z);
    let shots = 0;
    run(s, w, secs(8), {}, st => { for (const e of st.events) if (e.t === 'shot' || e.t === 'hurt') shots++; });
    expect(s.units.find(u => u.cam === i)!.state).toBe('engaged');
    expect(shots).toBeGreaterThan(0);
  });

  it("the market's acoustic arrays hear him on the shop floor", () => {
    const ears = sensor('acoustic', 'market');
    expect(ears.length, 'acoustic arrays').toBeGreaterThanOrEqual(2);
    const heard = ears.filter(({ c, i }) => { const at = spot(c); if (!at) return false; const s = near(at.x, at.y, at.z); run(s, w, 3); moveAbout(s, secs(3), B.SPRINT); return (s.units.find(u => u.cam === i)!.aware ?? 0) > 0; });
    expect(heard.length).toBeGreaterThanOrEqual(1);
  });

  it("the telecom exchange (M6-14): a camera mesh round it, its server hall's gas, its terminal and the district's relay", () => {
    expect(sensor('camera', 'telecom', 50).length, 'the camera mesh').toBeGreaterThanOrEqual(6);
    const hall = w.gas!.find(g => g.id === 'telecom-hall')!;
    expect(hall, 'the server hall').toBeTruthy();
    const mid = { x: (hall.box.x0 + hall.box.x1) / 2, y: hall.box.y0 + 0.05, z: (hall.box.z0 + hall.box.z1) / 2 };
    // Seen in the hall, the gas comes down; staying, he suffocates; out within 8 s, he lives.
    for (const leave of [false, true]) {
      const s = near(mid.x, mid.y, mid.z);
      s.flags.god = false;
      const u = s.units.find(q => q.cam === hall.sensor)!;
      u.aware = 1.2;
      run(s, w, 2);
      expect(s.gas?.['telecom-hall'], 'gas set off').toBeDefined();
      if (leave) { run(s, w, secs(5)); teleport(s.player, hall.box.x1 + 6, mid.y, mid.z); }
      run(s, w, secs(GAS.secs + 2));
      if (leave) expect(s.dead, 'got out').toBeFalsy(); else expect(s.dead, 'stayed').toBe('gas');
    }
    // The terminal and the relay; the relay cut with bolt cutters, and the district's word goes nowhere.
    const term = w.inter.find(i => i.id === 'telecom-terminal')!, relay = w.inter.find(i => i.id === 'telecom-relay')!;
    expect(term.kind).toBe('exchange');
    const s = before(relay)!;
    expect(s, 'somewhere to stand at the rack').toBeTruthy();
    run(s, w, 1, { buttons: B.INTERACT, pressed: B.INTERACT });
    for (let i = 0; i < secs(RELAY.cut + 1); i++) { aim(s, relay.x, relay.y, relay.z); run(s, w, 1, { buttons: B.INTERACT }); }
    expect(relayDown(s, districtOf(relay.x, relay.z))).toBe(true);
  });

  it("the substation (M6-15): its busbars hum, an arc kills him standing under them, keeping low he passes; the spare fuse in its relay cabinet", () => {
    expect(w.hv!.length, 'busbars').toBeGreaterThanOrEqual(3);
    const b = w.hv![1], mid = { x: (b.a.x + b.b.x) / 2, z: (b.a.z + b.b.z) / 2 }, down = raycast(w.index, mid.x, b.a.y - 0.3, mid.z, 0, -1, 0, 4)!, y = b.a.y - 0.3 - down.t + 0.02;
    // Two metres off, the hum; under it standing, the arc.
    const s = near(mid.x, y, mid.z + 2.5);
    s.flags.god = false;
    const heard: string[] = [];
    run(s, w, secs(3), {}, st => { for (const e of st.events) if (e.t === 'sfx') heard.push(e.id); });
    expect(heard, 'the hum').toContain('hum');
    expect(s.dead).toBeFalsy();
    teleport(s.player, mid.x, y, mid.z);
    run(s, w, 3);
    expect(s.dead).toBe('shock');
    // Crawling under it, alive.
    const t = near(mid.x, y, mid.z);
    t.flags.god = false;
    t.player.posture = 'crawl';
    run(t, w, 3, { buttons: B.CRAWL });
    expect(t.dead).toBeFalsy();
    // The single spare HV fuse, in the relay cabinet.
    expect(w.inter.some(i => i.en === 'Relay cabinet' && (i.data?.items as [string, number][] | undefined)?.some(([id]) => id === 'hvfuse'))).toBe(true);
  });
});
