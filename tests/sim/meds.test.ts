// M5-17 (DESIGN section 4): healing items, used from the hand, each taking its time and spent: a bandage stops a light
// bleed, a tourniquet a heavy one, a splint sets a broken limb, painkillers hide a sprain, a first-aid kit stops all
// bleeding and restores 30 health. With nothing to treat it says so and isn't used; put away, it stops.
import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs, LMB } from './helpers';
import { addItem, count } from '../../src/sim/inventory';
import { TREAT } from '../../src/sim/meds';
import { limits } from '../../src/sim/body';
import type { SimState } from '../../src/sim/types';

function hurt(set: (s: SimState) => void) {
  const { world, state } = setup([floor()], { x: 0, y: 0, z: 0, yaw: 0 });
  run(state, world, 3);
  set(state);
  return { world, state };
}
/** One of `id` in hand, used, and held for `t` seconds (its own time if not given). */
function use(t: ReturnType<typeof hurt>, id: string, secsHeld = TREAT[id] + 0.2) {
  addItem(t.state, t.state.inv.pack, id, 2);
  t.state.inv.hotbar[0] = t.state.inv.pack.items.find(i => i.id === id)!.uid; t.state.inv.held = 1;
  const said: string[] = [];
  run(t.state, t.world, 1, { pressed: LMB, buttons: LMB }, s => said.push(...s.events.flatMap(e => (e.t === 'msg' ? [e.text] : []))));
  run(t.state, t.world, secs(secsHeld), {}, s => said.push(...s.events.flatMap(e => (e.t === 'msg' ? [e.text] : []))));
  return said;
}

describe('healing items (M5-17)', () => {
  it('a bandage stops a light bleed in 4 s and is spent; not before', () => {
    const t = hurt(s => { s.body.lightBleed = 10; });
    use(t, 'bandage', 3);
    expect(t.state.body.lightBleed).toBeGreaterThanOrEqual(0);
    run(t.state, t.world, secs(1.3));
    expect(t.state.body.lightBleed).toBe(-1);
    expect(count(t.state.inv.pack, 'bandage')).toBe(1);
  });
  it('a tourniquet stops a heavy bleed; a bandage won\'t', () => {
    const t = hurt(s => { s.body.heavyBleed = true; });
    expect(use(t, 'bandage').some(m => /tourniquet/.test(m))).toBe(true);
    expect(count(t.state.inv.pack, 'bandage')).toBe(2);
    use(t, 'tourniquet');
    expect(t.state.body.tourniquet).toBe(true);
    const hp = t.state.body.hp;
    run(t.state, t.world, secs(5));
    expect(t.state.body.hp).toBeGreaterThanOrEqual(hp);
  });
  it('a splint sets a broken leg: a sprain\'s limp, healing in 7 days', () => {
    const t = hurt(s => { s.body.leg = 'fracture'; s.body.legHealAt = Infinity; });
    expect(limits(t.state).jumpScale).toBe(0);
    use(t, 'splint');
    expect(t.state.body.legSplint).toBe(true);
    expect(t.state.body.legHealAt).toBeCloseTo(t.state.time + 7 * 86400, -3);
  });
  it('painkillers hide a sprain for 4 hours', () => {
    const t = hurt(s => { s.body.leg = 'sprain'; s.body.legHealAt = s.time + 36 * 3600; });
    expect(limits(t.state).sprint).toBe(false);
    use(t, 'painkillers');
    expect(limits(t.state).sprint).toBe(true);
    t.state.time += 4.1 * 3600;
    expect(limits(t.state).sprint).toBe(false);
  });
  it('a first-aid kit stops all bleeding and gives back 30 health', () => {
    // (A heavy bleed under a tourniquet, a light one running: 2 HP lost over its 10 s.)
    const t = hurt(s => { s.body.hp = 40; s.body.heavyBleed = true; s.body.tourniquet = true; s.body.lightBleed = 5; });
    use(t, 'firstaid');
    expect(t.state.body.heavyBleed).toBe(false);
    expect(t.state.body.tourniquet).toBe(false);
    expect(t.state.body.lightBleed).toBe(-1);
    expect(t.state.body.hp).toBeGreaterThan(66);
  });
  it('nothing to treat: it says so and isn\'t used; put away mid-way, it stops', () => {
    const t = hurt(() => {});
    expect(use(t, 'bandage').some(m => /no bleeding/.test(m))).toBe(true);
    expect(count(t.state.inv.pack, 'bandage')).toBe(2);
    const u = hurt(s => { s.body.lightBleed = 5; });
    addItem(u.state, u.state.inv.pack, 'bandage', 1);
    u.state.inv.hotbar[0] = u.state.inv.pack.items.find(i => i.id === 'bandage')!.uid; u.state.inv.held = 1;
    run(u.state, u.world, 1, { pressed: LMB, buttons: LMB });
    run(u.state, u.world, secs(1));
    u.state.inv.held = 0;
    run(u.state, u.world, secs(4));
    expect(u.state.body.lightBleed).toBeGreaterThanOrEqual(0);
    expect(count(u.state.inv.pack, 'bandage')).toBe(1);
  });
});
