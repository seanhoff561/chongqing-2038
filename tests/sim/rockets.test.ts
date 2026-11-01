// M4-65 (U-052): rockets. A street heavy fires its rockets at him: the blast hurts him and throws him down; his own
// rocket launcher wrecks the machine it hits.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs, LMB } from './helpers';
import { addItem } from '../../src/sim/inventory';
import type { Patrol } from '../../src/world/world';

const stand = (unit: Patrol['unit'], z: number): Patrol => ({ kind: 'street', unit, pts: [{ x: 0, y: 0, z }, { x: 0, y: 0, z: z + 0.01 }], dwell: [600, 600], hours: [0, 24] });

describe('rockets (M4-65)', () => {
  it("a heavy's rocket bursts at him: it hurts and throws him down", () => {
    const { world, state } = setup([floor(0, 300)], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [stand('heavy', -40)] });
    state.time = 12 * 3600; state.flags.god = true; state.flags.clear = true;
    const u = state.units[0];
    u.aware = 1.5; u.seen = { ...state.player.pos };
    let blasts = 0, down = false, rockets = 0;
    run(state, world, secs(20), {}, s => { for (const e of s.events) { if (e.t === 'hurt' && e.cause === 'blast') blasts++; if (e.t === 'sfx' && e.id === 'rocket') rockets++; } if (s.player.mode === 'down') down = true; });
    expect(rockets).toBeGreaterThanOrEqual(1);
    expect(blasts).toBeGreaterThanOrEqual(1);
    expect(down).toBe(true);
  });
  it('his rocket wrecks a humanoid', () => {
    const { world, state } = setup([floor(0, 300)], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [stand('humanoid', -15)] });
    state.time = 12 * 3600; state.flags.god = true; state.flags.clear = true;
    addItem(state, state.inv.pack, 'rpg', 1); addItem(state, state.inv.pack, 'rocket', 1);
    state.inv.hotbar[0] = state.inv.pack.items.find(i => i.id === 'rpg')!.uid; state.inv.held = 1;
    const u = state.units[0];
    run(state, world, 5, { pitch: -0.03 });
    run(state, world, 1, { pressed: LMB, buttons: LMB, pitch: -0.03 });
    run(state, world, secs(1.5), { pitch: -0.03 });
    expect(u.dead).toBe(true);
    expect(state.inv.pack.items.some(i => i.id === 'rocket')).toBe(false);
  });
});
