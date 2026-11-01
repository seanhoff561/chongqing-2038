// M5-20: the grappling hook. Thrown at a 12 m wall's top, it catches; its rope hangs to the ground and he climbs it hand
// over hand and pulls over the top; from the top he takes it down into his pack. Thrown at the wall's foot it doesn't
// catch, and stays his.
import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs, aim, LMB, RMB } from './helpers';
import { solid } from '../../src/world/geom';
import { addItem } from '../../src/sim/inventory';
import { B } from '../../src/sim/types';

describe('the grappling hook (M5-20)', () => {
  it('hooks a 12 m wall, is climbed, and taken down', () => {
    const H = 12, { world: w, state: s } = setup([floor(), solid(-5, 0, -30, 5, H, -6)], { x: 0, y: 0, z: -2.5, yaw: 0 });
    run(s, w, 3);
    addItem(s, s.inv.pack, 'grapple', 1);
    const hold = () => { s.inv.hotbar[0] = s.inv.pack.items.find(i => i.id === 'grapple')!.uid; s.inv.held = 1; };
    hold();
    // At the foot of the wall: no catch.
    aim(s, 0, 1, -6);
    run(s, w, 1, { pressed: LMB, buttons: LMB });
    expect(s.ropes ?? []).toHaveLength(0);
    run(s, w, secs(1));
    // At its top edge: hooked, the rope to the ground.
    aim(s, 0, H - 0.4, -6);
    run(s, w, 1, { pressed: LMB, buttons: LMB });
    expect(s.ropes).toHaveLength(1);
    expect(s.ropes![0].y0).toBeCloseTo(0, 1);
    expect(s.ropes![0].y1).toBeCloseTo(H, 2);
    // Walk to it and climb hand over hand.
    s.player.pos.z = -5.6;
    run(s, w, 5);
    const bits: number[] = [LMB, RMB];
    let hand = 0;
    for (let step = 0; step < 24 && (s.player.mode !== 'ground' || step === 0); step++) {
      const p = s.player, y = Math.min(H - 0.05, p.pos.y + 2.2), holding = p.hands.map((h, i) => (h.grip ? bits[i] : 0)).reduce((a, b) => a | b, 0);
      aim(s, 0, y, -5.95);
      run(s, w, 2, { buttons: holding | bits[hand] });
      run(s, w, secs(1), { buttons: bits[hand], my: 1 });
      hand = 1 - hand;
      if (p.mode === 'action') run(s, w, secs(1));
    }
    expect(s.player.pos.y).toBeCloseTo(H, 1);
    expect(s.player.pos.z).toBeLessThan(-6.1);
    // From the top: taken down.
    aim(s, 0, H + 0.3, -6.3);
    run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT });
    expect(s.ropes).toHaveLength(0);
    expect(s.inv.pack.items.some(i => i.id === 'grapple')).toBe(true);
  });
});
