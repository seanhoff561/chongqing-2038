// M6-27: the river border. Swimming within 60 m of the bank, nothing comes; 70 m out, sonar has him in 10 s and the
// drone boats run him down 20 s later; with his jammer running they never find him, nor at night in fog with him lying
// still in the water; back near the bank they lose him.
import { describe, it, expect } from 'vitest';
import { run, secs } from './helpers';
import { createState } from '../../src/sim/sim';
import { makeWorld } from '../../src/world/world';
import { solid } from '../../src/world/geom';
import { heightfield } from '../../src/world/heightfield';
import { RIVER } from '../../src/sim/river';
import { addItem } from '../../src/sim/inventory';

/** A bank (ground at y 0) for x < 0, the river (its surface at -1, 8 m deep) beyond, out to 400 m. */
function river() {
  const ground = heightfield(-40, -240, 4, 120, 120);
  for (let j = 0; j < 120; j++) for (let i = 0; i < 120; i++) ground.y[j * 120 + i] = i * 4 < 40 ? 0 : -10;
  const w = makeWorld({ name: 'river', solids: [solid(-40, -11, -240, 440, -10, 240)], ground, water: [{ x0: 0, y0: -10, z0: -240, x1: 440, y1: -1, z1: 240 }], spawn: { x: 0, y: 0, z: 0, yaw: 0 } });
  return w;
}

describe('the river border (M6-27)', () => {
  it('sends drone boats after a swimmer far out, unless he is ready for them', () => {
    const w = river();
    const swim = (x: number, setup: (s: ReturnType<typeof createState>) => void, t: number) => {
      const s = createState(1, w); s.time = 12 * 3600; s.flags.god = false; s.player.pos = { x, y: -1.6, z: 0 }; setup(s);
      run(s, w, secs(t)); return s;
    };
    expect(swim(40, () => {}, 40).dead).toBeFalsy();
    const far = swim(110, () => {}, RIVER.sonar + RIVER.boats - 2);
    expect(far.dead).toBeFalsy(); expect(far.river?.boats).toBeDefined();
    expect(swim(110, () => {}, RIVER.sonar + RIVER.boats + 2).dead).toBe('river');
    expect(swim(110, s => { addItem(s, s.inv.pack, 'jammer', 1); s.jam = { since: s.time }; }, 40).dead).toBeFalsy();
    expect(swim(110, s => { s.time = 2 * 3600; s.flags.fog = 0.8; }, 40).dead).toBeFalsy();
  });
});
