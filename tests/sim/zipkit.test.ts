// M5-33 (U-034): the zipline kit. On a 12 m roof, one clamp on its railing, the other on a mast on a roof 8 m high
// across a 20 m street: the line's strung, sloping down, and he rides it across on the kit's own trolley (nothing
// else to hang from); from the far end he unclamps it and it's back in his pack. A machine in the street that sees it
// goes to look.
import { describe, it, expect } from 'vitest';
import { setup, run, secs, floor, aim, LMB } from './helpers';
import { solid } from '../../src/world/geom';
import { addItem } from '../../src/sim/inventory';
import { B } from '../../src/sim/types';
import type { Patrol } from '../../src/world/world';

describe('the zipline kit (M5-33)', () => {
  it('strings a line across a street between two roofs, is ridden, seen, and taken down', () => {
    const beat: Patrol = { kind: 'street', unit: 'quadruped', pts: [{ x: 6, y: 0, z: -12 }, { x: 6, y: 0, z: -11.99 }], dwell: [600, 600], hours: [0, 24] };
    const { world: w, state: s } = setup([floor(0, 100), solid(-10, 0, -2, 10, 12, 10), solid(-10, 12, -2, 10, 13, -1.9), solid(-10, 0, -40, 10, 8, -22), solid(-0.15, 8, -24.15, 0.15, 11.5, -23.85)],
      { x: 0, y: 12, z: -1.2, yaw: 0 }, { patrols: [beat] });
    s.time = 12 * 3600; s.flags.god = true;
    const dog = s.units[0]; dog.stop = { x: 6, y: 0, z: -12, yaw: -Math.PI / 2, t: 0 };
    run(s, w, 3);
    addItem(s, s.inv.pack, 'zipkit', 1);
    const use = () => { s.inv.hotbar[0] = s.inv.pack.items.find(i => i.id === 'zipkit')!.uid; s.inv.held = 1; run(s, w, 1, { pressed: LMB, buttons: LMB }); };
    aim(s, 0, 12.8, -1.95); use();
    expect(s.kitRig).toBeDefined();
    aim(s, 0, 10.6, -23.85); use();
    expect(s.lines).toHaveLength(1);
    expect(s.lines![0].kit).toBe(true);
    expect(s.inv.pack.items.some(i => i.id === 'zipkit')).toBe(false);
    // Ridden on its own trolley.
    expect(s.inv.pack.items.some(i => ['trolley', 'pulley', 'hook', 'grapple', 'insgloves'].includes(i.id))).toBe(false);
    s.inv.held = 0;
    run(s, w, 1, { pressed: LMB, buttons: LMB });
    expect(s.player.mode).toBe('zip');
    for (let i = 0; i < secs(10) && s.player.mode === 'zip'; i++) run(s, w, 1);
    run(s, w, secs(2));
    expect(s.player.pos.z).toBeLessThan(-22);
    expect(s.player.pos.y).toBeGreaterThan(7.9);
    // The dog in the street saw it and went to look (and then, seeing him on it, after him).
    expect(s.lines![0].seen).toBe(true);
    expect(['look', 'hunt']).toContain(dog.trip?.kind);
    // Unclamped from this end.
    s.player.pos.x = 0; s.player.pos.z = -22.8;
    run(s, w, 2); aim(s, 0, 10.6, -23.85);
    run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT });
    expect(s.lines).toHaveLength(0);
    expect(s.inv.pack.items.some(i => i.id === 'zipkit')).toBe(true);
  });
});
