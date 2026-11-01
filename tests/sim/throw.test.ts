// M5-19: throwables. Each flies its arc from his hand to where it lands. A grenade bursts 3 s after the throw: a
// quadruped beside it wrecked, a weak door by it blown open, heard 300 m. The extinguisher's cloud between a humanoid
// and him: it can't see him for 20 s, then it can. Firecrackers crackle 120 m round for 8 s. A bottle smashes (20 m),
// a stone clatters (12 m) and lies there to pick up.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs, LMB } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { THROW, launch, fly } from '../../src/sim/throw';
import { visibility } from '../../src/sim/perception';
import { unitPose } from '../../src/sim/units';
import { solid } from '../../src/world/geom';
import type { Patrol, Inter } from '../../src/world/world';

const beat = (unit: Patrol['unit'], x: number, z: number): Patrol => ({ kind: 'street', unit, pts: [{ x, y: 0, z }, { x, y: 0, z: z + 0.01 }], dwell: [600, 600], hours: [0, 24] });

describe('throwables (M5-19)', () => {
  it('throws along an arc; the grenade wrecks, breaches and is heard far; bottles and stones are small noises', () => {
    const { world: w0, state: s0 } = setup([floor(0, 100)], { x: 0, y: 0, z: 0, yaw: 0 });
    run(s0, w0, 2); s0.player.pitch = 0.1;
    const o = launch(s0, 'grenade');
    let land = null as null | { x: number; y: number; z: number };
    for (let k = 0; k < 600 && !land; k++) land = fly(w0, o);
    expect(land!.z).toBeLessThan(-8);
    const L = land!;
    const inter: Inter[] = [{ id: 'd1', kind: 'door', x: L.x + 1.5, y: 1, z: L.z, r: 0.8, zh: '门', en: 'Door', data: { solid: 1, lock: 'locked' } }];
    const { world: w, state: s } = setup([floor(0, 100), solid(L.x + 1.45, 0, L.z - 0.8, L.x + 1.55, 2.2, L.z + 0.8)], { x: 0, y: 0, z: 0, yaw: 0 }, { inter, patrols: [beat('quadruped', L.x - 1, L.z)] });
    s.time = 12 * 3600; s.flags.god = true;
    const dog = s.units[0]; dog.stop = { x: L.x - 1, y: 0, z: L.z, yaw: 0, t: 0 };
    run(s, w, 2); s.player.pitch = 0.1;
    addItem(s, s.inv.pack, 'grenade', 1); s.inv.hotbar[0] = s.inv.pack.items.find(i => i.id === 'grenade')!.uid; s.inv.held = 1;
    let loud = 0;
    const hear = (st: typeof s) => { for (const e of st.events) if (e.t === 'noise') loud = Math.max(loud, e.r); };
    run(s, w, 1, { pressed: LMB, buttons: LMB, pitch: 0.1 }, hear);
    expect(s.thrown).toHaveLength(1);
    run(s, w, secs(THROW.grenade.fuse - 0.3), {}, hear);
    expect(dog.dead).toBeFalsy();
    run(s, w, secs(0.5), {}, hear);
    expect(dog.dead).toBe(true);
    expect(s.wstate.open.d1).toBe(true);
    expect(loud).toBe(THROW.grenade.noise);
    // A bottle, then a stone.
    for (const [id, r] of [['bottle', THROW.bottle], ['stone', THROW.stone]] as const) {
      addItem(s, s.inv.pack, id, 1); s.inv.hotbar[0] = s.inv.pack.items.find(i => i.id === id)!.uid; s.inv.held = 1;
      const heard: number[] = [];
      run(s, w, secs(1), { pitch: 0.1 });
      run(s, w, 1, { pressed: LMB, buttons: LMB, pitch: 0.1 });
      run(s, w, secs(3), {}, st => { for (const e of st.events) if (e.t === 'noise') heard.push(e.r); });
      expect(heard, id).toContain(r);
    }
    expect(s.dropped.some(d => d.stack.id === 'stone')).toBe(true);
  });
  it("the extinguisher's cloud blinds a machine 20 s; firecrackers are a decoy heard 120 m for 8 s", () => {
    const { world: w, state: s } = setup([floor(0, 100)], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [beat('humanoid', 0, -16)] });
    s.time = 12 * 3600; s.flags.god = true;
    const man = s.units[0]; man.stop = { x: 0, y: 0, z: -16, yaw: 0, t: 0 };
    run(s, w, 2);
    const sees = () => visibility(s, w, 'humanoid', unitPose(w, man, s.time));
    expect(sees()).toBeGreaterThan(0);
    addItem(s, s.inv.pack, 'extinguisher', 1); s.inv.hotbar[0] = s.inv.pack.items.find(i => i.id === 'extinguisher')!.uid; s.inv.held = 1;
    run(s, w, 1, { pressed: LMB, buttons: LMB, pitch: 0 });
    run(s, w, secs(2));
    expect(s.smoke).toHaveLength(1);
    expect(sees()).toBe(0);
    run(s, w, secs(THROW.smoke.secs - 3));
    expect(sees()).toBe(0);
    run(s, w, secs(2));
    expect(sees()).toBeGreaterThan(0);
    addItem(s, s.inv.pack, 'firecrackers', 1); s.inv.hotbar[0] = s.inv.pack.items.find(i => i.id === 'firecrackers')!.uid; s.inv.held = 1;
    const pops: number[] = [];
    run(s, w, 1, { pressed: LMB, buttons: LMB, pitch: 0.2 });
    run(s, w, secs(THROW.crackers.secs + 3), {}, st => { for (const e of st.events) if (e.t === 'noise' && e.kind === 'firecrackers') pops.push(st.time); });
    expect(pops.length).toBeGreaterThan(8);
    expect((pops.at(-1)! - pops[0]) / 40).toBeGreaterThan(THROW.crackers.secs - 1);
  });
});
