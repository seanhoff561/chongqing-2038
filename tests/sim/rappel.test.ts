// M5-21: rope and rappel. On a 15 m roof, at its edge looking down, the rope's anchored and hangs to the ground; he
// rappels down it (crouch held) to the ground, and it's still there after, a fixed line; taken down from the foot, it's
// back in his pack. Off a 30 m roof it's too short.
import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs, aim, LMB, RMB } from './helpers';
import { solid } from '../../src/world/geom';
import { addItem } from '../../src/sim/inventory';
import { B } from '../../src/sim/types';

const roof = (H: number) => {
  const r = setup([floor(), solid(-5, 0, -30, 5, H, -6)], { x: 0, y: H, z: -6.4, yaw: Math.PI });
  run(r.state, r.world, 5);
  addItem(r.state, r.state.inv.pack, 'rope', 1);
  r.state.inv.hotbar[0] = r.state.inv.pack.items.find(i => i.id === 'rope')!.uid; r.state.inv.held = 1;
  return r;
};

describe('rope and rappel (M5-21)', () => {
  it('anchors at an edge, is rappelled to the ground, stays, and is taken down', () => {
    const H = 15, { world: w, state: s } = roof(H);
    run(s, w, 1, { pressed: LMB, buttons: LMB, pitch: -0.9, yaw: Math.PI });
    expect(s.ropes).toHaveLength(1);
    const r = s.ropes![0];
    expect(r.y1).toBeCloseTo(H + 0.9, 1); expect(r.y0).toBeCloseTo(0, 1);
    // (Crouched at the edge, to take hold of it low.)
    run(s, w, secs(0.5), { buttons: B.CROUCH });
    aim(s, r.x, H + 0.5, r.z);
    run(s, w, 2, { buttons: LMB | RMB | B.CROUCH });
    expect(s.player.mode).toBe('grip');
    // Rappelling: crouch held, both hands on it, down to the ground; then let go.
    let low = Infinity;
    run(s, w, secs(H / 2.5 + 1.5), { buttons: LMB | RMB | B.CROUCH }, st => { if (st.player.mode === 'grip') low = Math.min(low, st.player.pos.y); });
    expect(low).toBeLessThan(1.5); // (down it on the rope, not dropped off it)
    run(s, w, secs(2));
    expect(s.player.pos.y).toBeLessThan(0.5);
    expect(s.dead).toBeFalsy();
    expect(s.ropes).toHaveLength(1);
    // Taken down from its foot.
    aim(s, r.x + r.nx * 0.3, 1.1, r.z + r.nz * 0.3);
    run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT });
    expect(s.ropes).toHaveLength(0);
    expect(s.inv.pack.items.some(i => i.id === 'rope')).toBe(true);
  });
  it("won't reach down 30 m", () => {
    const { world: w, state: s } = roof(30);
    run(s, w, 1, { pressed: LMB, buttons: LMB, pitch: -0.9, yaw: Math.PI });
    expect(s.ropes ?? []).toHaveLength(0);
  });
});
