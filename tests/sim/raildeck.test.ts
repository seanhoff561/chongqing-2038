// M7-02, M7-03: Route A on the Dongshuimen Bridge. The sensor bus relay at the Xinhua Road substation: bare-handed
// its live cabinet throws him off; with bolt cutters and insulated gloves (his father's, in his locker there) it's
// cut and the deck is deaf till the next 06:00, when it's mended. Live, the deck feels him move on it and 20 s later
// he's caught. The rail deck's maintenance drones on their schedule: with the sensors cut and a jammer running he
// crosses the truss to the Nan'an end and the run ends there (桥下), Xiaoyu with him if she said she'd come; without
// the jammer a drone sees him, and without the cut the deck feels him: caught on the truss.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { lookTarget } from '../../src/sim/interact';
import { addItem } from '../../src/sim/inventory';
import { at, rail } from '../../src/world/yuzhong/bridges';
import { BUS, DECK, busDown, deckDrones } from '../../src/sim/bridge';
import { B, type SimState } from '../../src/sim/types';
import { run, secs, settle } from './helpers';
import { standBy, hold, crossDeck } from './routekit';

const w = getWorld('yuzhong'), b = w.bridges![0], sub = w.secure!.find(q => q.id === 'substation')!;
const relay = w.inter.find(i => i.kind === 'busrelay')!;
const DAY = 86400;

/** A run at an hour of day 1, no machines about. */
function fresh(hour: number) {
  const s = createState(1, w);
  s.units.length = 0; s.flags.clear = true; s.time = hour * 3600;
  return s;
}
/** Onto the rail deck `t` along, then walking on along it for `n` s; whether the deck has him. */
function walkDeck(s: SimState, t: number, n: number) {
  const [x, z] = at(b, t, -6);
  teleport(s.player, x, rail(b, t) + 0.1, z);
  run(s, w, 10);
  run(s, w, secs(n), { my: 1, yaw: Math.atan2(-b.ux, -b.uz) });
  return s.deck?.spotted !== undefined;
}

describe('Route A: the bridge sensor relay (M7-02)', () => {
  it("is in the substation's control room, his father's gloves in his locker there", () => {
    expect(relay.kind).toBe('busrelay');
    expect(Math.hypot(relay.x - sub.x, relay.z - sub.z)).toBeLessThan(30);
    const locker = w.inter.find(i => i.en === "Li Guorong's locker")!;
    expect(locker.data?.items).toEqual([['insgloves', 1]]);
    expect(Math.hypot(locker.x - sub.x, locker.z - sub.z)).toBeLessThan(30);
  });

  it('cut bare-handed it throws him off; gloved, the deck is deaf till the next 06:00 and mended then', async () => {
    await settle();
    const s = fresh(22);
    expect(standBy(s, w, relay.x, relay.y, relay.z, sub.heart), 'at the relay').toBe(true);
    expect(lookTarget(s, w)?.id).toBe(relay.id);
    // No cutters: nothing doing.
    hold(s, w, BUS.cut + 0.5);
    expect(busDown(s)).toBe(false);
    addItem(s, s.inv.pack, 'boltcutters', 1);
    const hp = s.body.hp;
    hold(s, w, BUS.cut + 0.5);
    expect(busDown(s), 'bare-handed').toBe(false);
    expect(s.body.hp).toBeLessThan(hp - BUS.shock / 2);
    expect(s.dead).toBeFalsy();
    addItem(s, s.inv.pack, 'insgloves', 1);
    expect(standBy(s, w, relay.x, relay.y, relay.z, sub.heart)).toBe(true);
    hold(s, w, BUS.cut + 0.5);
    expect(busDown(s), 'gloved').toBe(true);
    expect(s.bus).toBe(DAY + 6 * 3600);
    expect(s.escape?.bridge?.relay).toBeDefined();
    // Deaf: he walks the deck unfelt, into the small hours.
    s.time = DAY + 5.5 * 3600;
    expect(walkDeck(s, b.ta + 20, 8)).toBe(false);
    // 06:00: mended, it feels him at once; 20 s on, still on it, he's caught.
    s.time = DAY + 6 * 3600 + 1;
    expect(busDown(s)).toBe(false);
    expect(walkDeck(s, b.ta + 20, DECK.feel + 0.5)).toBe(true);
    run(s, w, secs(DECK.caught + 1));
    expect(s.dead).toBe('bridge');
  });

  it('live, standing still on the deck he is not felt; moving, he is', () => {
    const s = fresh(23);
    expect(walkDeck(s, b.ta + 40, 0)).toBe(false);
    run(s, w, secs(3));
    expect(s.deck?.spotted).toBeUndefined();
    run(s, w, secs(DECK.feel + 0.5), { my: 1, buttons: B.CROUCH, yaw: Math.atan2(-b.ux, -b.uz) });
    expect(s.deck?.spotted).toBeDefined();
  });
});

describe('Route A: the rail deck (M7-03)', () => {
  const T = (x: number, z: number) => (x - b.ox) * b.ux + (z - b.oz) * b.uz;
  /** At the rail deck's north end at an hour of day 2, the bus cut or not, a jammer in his pack (on) or not. */
  function onDeck(hour: number, cut: boolean, jam: boolean) {
    const s = fresh(24 + hour), tp = w.teleports.find(t => t.name === 'Dongshuimen Bridge: rail deck')!;
    if (cut) s.bus = 2 * DAY + 6 * 3600;
    teleport(s.player, tp.x, tp.y + 0.1, tp.z);
    run(s, w, 10);
    if (jam) { addItem(s, s.inv.pack, 'jammer', 1); run(s, w, 1, { cmds: [{ c: 'use', uid: s.inv.pack.items.find(i => i.id === 'jammer')!.uid }] }); expect(s.jam).toBeDefined(); }
    return s;
  }

  it('flies its two maintenance drones on their schedule, out from either end every four hours', () => {
    const s = fresh(0), at = (h: number) => { s.time = DAY + h * 3600; return deckDrones(s, b).map(q => T(q.x, q.z)); };
    const [n0, s0] = at(0), [n2, s2] = at(2), [m1, m1b] = at(1);
    expect(n0).toBeLessThan(b.ta + 10);
    expect(s0).toBeGreaterThan(b.tb - 10);
    expect(n2).toBeGreaterThan(b.tb - 10);
    expect(s2).toBeLessThan(b.ta + 10);
    expect(Math.abs(m1 - m1b)).toBeLessThan(2);
    expect(at(4)).toEqual(at(0));
  });

  it("with the sensors cut and a jammer running, crosses the truss to the Nan'an end: 桥下, Xiaoyu with him", async () => {
    await settle();
    const s = onDeck(1, true, true);
    s.sister = { route: 'bridge', x: 0, y: 0, z: 0, yaw: 0, with: true };
    // (At 01:00 drone 2 is mid-deck coming north: it passes him on the way.)
    const [, d2] = deckDrones(s, b);
    expect(T(d2.x, d2.z)).toBeGreaterThan(T(s.player.pos.x, s.player.pos.z) + 100);
    expect([crossDeck(s, w), s.dead ?? null]).toEqual([5, null]);
    expect(s.ended).toMatchObject({ route: 'bridge', sister: true });
    expect(s.deck?.spotted).toBeUndefined();
  });

  it('with the sensors cut but no jammer, a maintenance drone sees him and he is caught on the truss', () => {
    const s = onDeck(0, true, false);
    run(s, w, secs(2));
    expect(s.deck?.spotted, 'drone 1 leaving the north end').toBeDefined();
    run(s, w, secs(DECK.caught), { my: 1, yaw: Math.atan2(-b.ux, -b.uz) });
    expect(s.dead).toBe('bridge');
  });

  it('with a jammer but the sensors live, the deck feels him and he is caught on the truss', () => {
    const s = onDeck(1, false, true);
    expect(crossDeck(s, w)).toBeLessThan(5);
    expect(s.dead).toBe('bridge');
    expect(s.ended).toBeUndefined();
  });
});
