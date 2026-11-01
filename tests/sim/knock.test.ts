// M4-64 (U-052): knocked down. A blast beside him throws him away from it, off his feet; he lands, lies a moment and
// gets up.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { blast } from '../../src/sim/strike';
import { STRIKE } from '../../src/data/units';

describe('knocked down (M4-64)', () => {
  it('a blast 2 m to his right throws him left, leaves him down, then he gets up', () => {
    const { world, state } = setup([floor(0, 100)], { x: 0, y: 0, z: 0, yaw: 0 });
    state.flags.god = true;
    run(state, world, 5);
    blast(state, { x: 2, y: 0.5, z: 0 }, STRIKE.bomb);
    expect(state.player.vel.x).toBeLessThan(-4);
    expect(state.player.mode).toBe('air');
    let down = -1, up = -1;
    run(state, world, secs(5), {}, (s, i) => { if (down < 0 && s.player.mode === 'down') down = i / 60; if (down >= 0 && up < 0 && s.player.mode === 'ground') up = i / 60; });
    expect(state.player.pos.x).toBeLessThan(-1.5);
    expect(down).toBeGreaterThan(0);
    expect(up - down).toBeGreaterThan(1.2);
    expect(up).toBeLessThan(4);
  });
});
