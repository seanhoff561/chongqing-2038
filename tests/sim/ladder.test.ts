// M5-22: the telescoping ladder. Stood against a 6 m wall it's climbable to 4 m; laid from a roof's edge across a 3 m
// gap to the next roof he crosses it, held to a crouch's pace on it; a 5 m gap is too far. Dropped, it's heard 30 m.
import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs, aim, hspeed, LMB, RMB } from './helpers';
import { solid } from '../../src/world/geom';
import { addItem } from '../../src/sim/inventory';
import { B } from '../../src/sim/types';
import { LADDER } from '../../src/sim/ladder';
import { movement as M } from '../../src/data/movement';

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
