// M4-49 (U-051): opening and searching is quick, each thing at its own speed (a drawer in well under a second, a car's
// boot slowest), the ring filling as he holds F.
import { describe, it, expect } from 'vitest';
import { setup, run, floor } from './helpers';
import { CONTAINER } from '../../src/sim/containers';
import { B } from '../../src/sim/types';
import type { Inter } from '../../src/world/world';

/** Ticks holding F at a container of a type 1.2 m in front of him until it's open. */
function openTime(type: keyof typeof CONTAINER) {
  const box: Inter = { id: 'c', kind: 'container', x: 0, y: 0.6, z: -1.2, r: 0.6, zh: '箱', en: 'Box', data: { type } };
  const { world, state } = setup([floor()], { x: 0, y: 0, z: 0, yaw: 0 }, { inter: [box] });
  run(state, world, 3, { pitch: -0.4 });
  run(state, world, 1, { pitch: -0.4, pressed: B.INTERACT, buttons: B.INTERACT });
  let n = 1;
  for (; n < 600 && state.openContainer !== 'c'; n++) run(state, world, 1, { pitch: -0.4, buttons: B.INTERACT });
  return n / 60;
}

describe('quick opening (M4-49)', () => {
  it('a drawer opens in well under a second, a car boot takes longest, each at its own speed', () => {
    const t = Object.fromEntries((['drawer', 'fridge', 'cabinet', 'crate', 'locker', 'car'] as const).map(k => [k, openTime(k)]));
    expect(t.drawer).toBeLessThan(0.6);
    for (const k of ['fridge', 'cabinet', 'crate', 'locker', 'car']) expect(t[k], k).toBeGreaterThan(t.drawer);
    expect(t.car).toBeGreaterThan(t.locker);
    expect(t.car).toBeLessThan(1.6);
  });
});
