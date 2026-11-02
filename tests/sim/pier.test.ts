// M6-20: the river-police pier (yuzhong/pier.ts): three ways onto it, each taken on his own legs and hands: down
// the gangway from the bank (under its cameras), up the ladder out of the water, and up the cargo crane, along its
// jib and down onto the deck; the patrol boat moored there; the sonar buoys hear a swimmer near them and the drone
// boats come.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { RIVER } from '../../src/sim/river';
import { walkPath } from './walker';
import { climbPole } from './climbbot';
import { run, secs, aim, LMB, RMB } from './helpers';

const w = getWorld('yuzhong'), f = (k: string) => w.features.filter(q => q.kind === k);
const deck = f('pier:deck')[0];
/** A run with the machines away (but its cameras) and him at a spot. */
const at = (x: number, y: number, z: number) => {
  const s = createState(4, w);
  s.flags.clear = true; s.flags.god = true; s.time = 12 * 3600;
  for (const u of s.units) if (u.cam === undefined) u.off = Infinity;
  teleport(s.player, x, y, z);
  run(s, w, 3);
  return s;
};
/** On up over the top of a climbable (hand over hand, pushing on), until he's standing (as tests/sim/pipes.test.ts). */
function over(s: ReturnType<typeof createState>, l: { x: number; z: number; y1: number; nx: number; nz: number }) {
  const bits: number[] = [LMB, RMB];
  let hand = 0;
  for (let step = 0; step < 20 && s.player.mode !== 'ground'; step++) {
    const p = s.player, held = p.hands.map((h, i) => (h.grip ? bits[i] : 0)).reduce((a, b) => a | b, 0);
    aim(s, l.x - l.nx * 0.3, Math.min(l.y1 - 0.05, p.pos.y + 2.2), l.z - l.nz * 0.3);
    run(s, w, 2, { buttons: held | bits[hand] });
    run(s, w, secs(1), { buttons: bits[hand], my: 1 });
    hand = 1 - hand;
    if (p.mode === 'action') run(s, w, secs(1));
  }
}
const onDeck = (s: ReturnType<typeof createState>) => Math.abs(s.player.pos.y - deck.y) < 0.6 && Math.hypot(s.player.pos.x - deck.x, s.player.pos.z - deck.z) < 30 && !s.dead;

describe('the river-police pier (M6-20)', () => {
  it('has its gangway, ladder, crane, cameras, patrol boat and sonar buoys', () => {
    expect(deck, 'the pier').toBeTruthy();
    for (const k of ['pier:gangway', 'pier:ladder', 'pier:crane']) expect(f(k).length, k).toBe(1);
    expect(f('pier:buoy').length, 'buoys').toBeGreaterThanOrEqual(3);
    expect(w.inter.some(i => i.kind === 'boat' && Math.hypot(i.x - deck.x, i.z - deck.z) < 25), 'the patrol boat').toBe(true);
    expect(w.cameras.filter(c => c.kind === 'camera' && Math.hypot(c.x - deck.x, c.z - deck.z) < 45).length, 'cameras').toBeGreaterThanOrEqual(2);
  });

  it('is reached down the gangway from the bank', () => {
    const g = f('pier:gangway')[0], s = at(g.x, g.y + 0.1, g.z);
    expect(walkPath(s, w, [{ x: deck.x, y: deck.y, z: deck.z }], false).reached).toBe(1);
    expect(onDeck(s)).toBe(true);
  });

  it('is climbed onto out of the water by its ladder', () => {
    const l = w.climbables.find(c => c.kind === 'ladder' && Math.hypot(c.x - f('pier:ladder')[0].x, c.z - f('pier:ladder')[0].z) < 0.5)!;
    const s = at(l.x + l.nx * 0.6, l.y0 + 1.6, l.z + l.nz * 0.6);
    expect(climbPole(s, w, l, 0.6), 'up the ladder').toBe(true);
    // Over the top onto the deck.
    over(s, l);
    expect(onDeck(s), `at ${s.player.pos.y.toFixed(1)} (deck ${deck.y.toFixed(1)}), ${s.player.mode}`).toBe(true);
  });

  it('is dropped onto from the cargo crane, up its mast and along its jib', () => {
    const cr = f('pier:crane')[0], l = w.climbables.find(c => c.kind === 'ladder' && Math.hypot(c.x - cr.x, c.z - cr.z) < 0.5)!;
    const s = at(l.x + l.nx * 0.6, l.y0 + 0.05, l.z + l.nz * 0.6);
    expect(climbPole(s, w, l, 0.6), 'up the mast').toBe(true);
    over(s, l);
    expect(s.player.mode, 'up on the jib').toBe('ground');
    // Along the jib out over the deck, off its end.
    const end = f('pier:jib')[0];
    const r = walkPath(s, w, [{ x: end.x, y: end.y, z: end.z }], false);
    expect(r.reached, `along the jib: stopped at ${r.at.x.toFixed(1)},${r.at.y.toFixed(1)},${r.at.z.toFixed(1)} (end ${end.x.toFixed(1)},${end.y.toFixed(1)},${end.z.toFixed(1)})`).toBe(1);
    // Off it onto the containers, and down them step by step to the deck.
    run(s, w, 20, { yaw: s.player.yaw, my: 1 });
    run(s, w, secs(2));
    walkPath(s, w, [{ x: deck.x, y: deck.y, z: deck.z }], false);
    expect(onDeck(s), `at ${s.player.pos.y.toFixed(1)} (deck ${deck.y.toFixed(1)})`).toBe(true);
    expect(s.dead).toBeFalsy();
  });

  it('hears a swimmer near its buoys: the drone boats come', () => {
    const b = f('pier:buoy')[0], s = at(b.x + 4, b.y - 0.5, b.z);
    s.flags.god = false;
    const said: string[] = [];
    run(s, w, secs(RIVER.sonar + 2), {}, st => { for (const e of st.events) if (e.t === 'msg') said.push(e.text); });
    expect(s.player.mode).toBe('swim');
    expect(said.some(t => t.includes('drone boats'))).toBe(true);
  });
});
