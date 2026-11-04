// M5-22: the telescoping ladder. Stood against a 6 m wall it's climbable to 4 m; laid from a roof's edge across a 3 m
// gap to the next roof he crosses it, held to a crouch's pace on it; a 5 m gap is too far. Dropped, it's heard 30 m.
import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs, aim, hspeed, LMB, RMB } from './helpers';
import { solid, turn, overlaps, raycast, type Solid } from '../../src/world/geom';
import type { World, Climbable } from '../../src/world/world';
import { addItem } from '../../src/sim/inventory';
import { B, type SimState } from '../../src/sim/types';
import { LADDER, RAIL, DEPTH } from '../../src/sim/ladder';
import { movement as M } from '../../src/data/movement';
import * as THREE from 'three';
import { Rigs } from '../../src/render/rigs';

const hold = (s: ReturnType<typeof setup>['state']) => {
  addItem(s, s.inv.pack, 'ladder', 1);
  s.inv.hotbar[0] = s.inv.pack.items.find(i => i.id === 'ladder')!.uid; s.inv.held = 1;
};

describe('the telescoping ladder (M5-22)', () => {
  it('stands against a wall, climbable to 4 m', () => {
    const { world: w, state: s } = setup([floor(), solid(-5, 0, -30, 5, 6, -3)], { x: 0, y: 0, z: -2, yaw: 0 });
    run(s, w, 3); hold(s);
    run(s, w, 1, { pressed: LMB, buttons: LMB, pitch: 0 });
    expect(s.ropes).toHaveLength(1);
    expect(s.ropes![0].kind).toBe('ladder');
    expect(s.ropes![0].y1 - s.ropes![0].y0).toBeCloseTo(LADDER.wall, 2);
    // Up it hand over hand to its top.
    const bits: number[] = [LMB, RMB];
    let hand = 0, high = 0;
    for (let step = 0; step < 10; step++) {
      const p = s.player, y = Math.min(LADDER.wall - 0.05, p.pos.y + 2.2), holding = p.hands.map((h, i) => (h.grip ? bits[i] : 0)).reduce((a, b) => a | b, 0);
      aim(s, 0, y, -2.9);
      run(s, w, 2, { buttons: holding | bits[hand] });
      run(s, w, secs(1), { buttons: bits[hand], my: 1 }, st => { high = Math.max(high, st.player.pos.y); });
      hand = 1 - hand;
    }
    expect(high).toBeGreaterThan(LADDER.wall - 2.3);
    expect(s.player.mode).toBe('grip');
  });
  it('lays across a 3 m gap, crossed at a crouch pace; not across 5 m', () => {
    const roofs = (gap: number) => setup([floor(), solid(-5, 0, -10, 5, 8, 0), solid(-5, 0, -30, 5, 8, -10 - gap)], { x: 0, y: 8, z: -9.5, yaw: 0 });
    const far = roofs(5);
    run(far.state, far.world, 3); hold(far.state);
    run(far.state, far.world, 1, { pressed: LMB, buttons: LMB, pitch: -0.4 });
    expect(far.state.planks ?? []).toHaveLength(0);
    const { world: w, state: s } = roofs(3);
    run(s, w, 3); hold(s);
    run(s, w, 1, { pressed: LMB, buttons: LMB, pitch: -0.4 });
    expect(s.planks).toHaveLength(1);
    let fast = 0;
    run(s, w, secs(3.6), { my: 1, buttons: B.SPRINT }, st => { if (st.player.pos.z < -10.5 && st.player.pos.z > -12.5) fast = Math.max(fast, hspeed(st)); });
    expect(s.player.pos.z).toBeLessThan(-13);
    expect(s.player.pos.y).toBeCloseTo(8, 1);
    expect(fast).toBeLessThanOrEqual(M.speed.crouch + 0.05);
  });
  it('clatters when dropped', () => {
    const { world: w, state: s } = setup([floor()], { x: 0, y: 0, z: 0, yaw: 0 });
    run(s, w, 3); hold(s);
    let r = 0;
    run(s, w, 1, { cmds: [{ c: 'drop', uid: s.inv.pack.items.find(i => i.id === 'ladder')!.uid }] }, st => { for (const e of st.events) if (e.t === 'noise') r = Math.max(r, e.r); });
    expect(r).toBe(30);
  });
});

// M10-24 (U-104): stood against a wall at any yaw (turned solids too), it stands wholly in front of the face, rails and
// rungs from foot to top, near enough to rest on it; past a sill it stands out, under a balcony it stops below.
describe('the ladder stands in front of its wall (M10-24)', () => {
  /** A 6 m wall 3 m north of him turned by a (deg) about him (axis-aligned at right angles), what else is on it, him
   *  1 m back from its face looking at it from `off` degrees aside; the ladder stood. */
  const stand = (a: number, extra: Solid[] = [], off = 0) => {
    const r = a * Math.PI / 180, c = Math.cos(r), sn = Math.sin(r), at = (x: number, z: number) => [c * x - sn * z, sn * x + c * z];
    const solids = turn([solid(-5, 0, -3.4, 5, 6, -3), ...extra], r, 0, 0);
    if (a % 90 === 0) for (const q of solids) delete q.rot;
    const o = (off * Math.PI) / 180, [sx, sz] = at(0, -2), [fx, fz] = at(Math.tan(o), -3);
    const { world: w, state: s } = setup([floor(), ...solids], { x: sx, y: 0, z: sz, yaw: 0 });
    run(s, w, 3); hold(s);
    aim(s, fx, 1.6, fz);
    run(s, w, 1, { pressed: LMB, buttons: LMB });
    expect(s.ropes, `${a} deg`).toHaveLength(1);
    return { w, s, q: s.ropes![0], wallN: at(0, 1) };
  };
  /** As it's drawn (render/rigs.ts), every corner of its rails and rungs from foot to top, and points every 5 cm up
   *  its rails' corners: none in anything (a 1 cm box round each). */
  const clear = (w: World, s: SimState, q: Climbable) => {
    const scene = new THREE.Scene();
    new Rigs(scene).update(s);
    scene.updateMatrixWorld();
    const m = scene.children.filter((c): c is THREE.Mesh => c instanceof THREE.Mesh && c.visible);
    expect(m).toHaveLength(1);
    const a = m[0].geometry.getAttribute('position'), v = new THREE.Vector3(), pts: THREE.Vector3[] = [];
    for (let i = 0; i < a.count; i++) pts.push(v.fromBufferAttribute(a, i).applyMatrix4(m[0].matrixWorld).clone());
    const tx = -q.nz, tz = q.nx;
    for (let y = q.y0 + 0.01; y <= q.y1; y += 0.05) for (const u of [-RAIL, RAIL]) for (const d of [-DEPTH / 2, DEPTH / 2]) pts.push(new THREE.Vector3(q.x + tx * u + q.nx * d, y, q.z + tz * u + q.nz * d));
    // (The drawn ladder spans its foot to its top, and no wider than its rails.)
    expect(Math.min(...pts.map(p => p.y))).toBeCloseTo(q.y0, 3);
    expect(Math.max(...pts.map(p => p.y))).toBeCloseTo(q.y1, 3);
    for (const p of pts) expect(Math.abs((p.x - q.x) * q.nx + (p.z - q.z) * q.nz)).toBeLessThanOrEqual(DEPTH / 2 + 1e-4);
    return pts.every(p => !overlaps(w.index, { x0: p.x - 0.005, y0: p.y + 0.001, z0: p.z - 0.005, x1: p.x + 0.005, y1: p.y + 0.01, z1: p.z + 0.005 }));
  };
  /** How far its back is off the nearest thing behind it, at a height. */
  const gap = (w: World, q: Climbable, y: number) => (raycast(w.index, q.x, y, q.z, -q.nx, 0, -q.nz, 2)?.t ?? 2) - DEPTH / 2;

  it('stands clear of walls at 0, 30, 45, 90 and 160 degrees, resting on them, faced square or not', () => {
    for (const [a, off] of [[0, 0], [30, 0], [45, 25], [90, 0], [160, -30]]) {
      const { w, s, q, wallN } = stand(a, [], off);
      expect(q.nx * wallN[0] + q.nz * wallN[1], `${a} deg faces out`).toBeCloseTo(1, 3);
      expect(clear(w, s, q), `${a} deg`).toBe(true);
      for (const y of [q.y0 + 0.2, (q.y0 + q.y1) / 2, q.y1 - 0.05]) expect(gap(w, q, y), `${a} deg at ${y}`).toBeLessThan(0.25);
      expect(q.y1 - q.y0).toBeCloseTo(LADDER.wall, 2);
    }
  });
  it('stands out past a sill, and stops below a balcony', () => {
    // A sill 15 cm out at 2 m; a balcony 1.2 m out at 3.2 m.
    const { w, s, q } = stand(30, [solid(-1, 1.9, -3, 1, 2, -2.85), solid(-2, 3.2, -3, 2, 3.4, -1.8)]);
    expect(clear(w, s, q)).toBe(true);
    expect(gap(w, q, 1.95)).toBeLessThan(0.05);
    expect(gap(w, q, 1)).toBeLessThan(0.25);
    expect(q.y1).toBeLessThan(3.2);
    expect(q.y1).toBeGreaterThan(2.9);
  });
  it('is climbed as it stands, against a turned wall', () => {
    const { w, s, q } = stand(30);
    const bits: number[] = [LMB, RMB], gx = q.x + q.nx * 0.08, gz = q.z + q.nz * 0.08;
    let hand = 0, high = 0;
    for (let step = 0; step < 10; step++) {
      const p = s.player, holding = p.hands.map((h, i) => (h.grip ? bits[i] : 0)).reduce((a, b) => a | b, 0);
      aim(s, gx, Math.min(q.y1 - 0.05, p.pos.y + 2.2), gz);
      run(s, w, 2, { buttons: holding | bits[hand] });
      run(s, w, secs(1), { buttons: bits[hand], my: 1 }, st => { high = Math.max(high, st.player.pos.y); });
      hand = 1 - hand;
    }
    expect(high).toBeGreaterThan(LADDER.wall - 2.3);
    expect(s.player.mode).toBe('grip');
  });
});
