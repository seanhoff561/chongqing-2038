// Route A, the Dongshuimen Bridge's rail deck (M7-02; DESIGN section 10). The deck is wired: a sensor bus along the
// truss feels anyone moving on it, its word carried back to the city through a relay at the Xinhua Road substation.
// Cut (bolt cutters, held, loud; live, so without insulated gloves it throws him off and burns him), the bridge is
// deaf until the repair at the next 06:00. Felt on the truss, the network has him: 20 s later, still on it, the
// bridge's drones have him. Its Nan'an end is the ending's (world/yuzhong/exits.ts).
import type { SimState } from './types';
import type { World } from '../world/world';
import { TRUSS, along, rail } from '../world/yuzhong/bridges';
import { onInteract, START_SOUND } from './interact';
import { has } from './inventory';
import { die } from './body';
import { nextHour, SCALE } from './clock';
import { stepDone } from './escape';
import { giveAway } from './district';

type V3 = { x: number; y: number; z: number };

/** The relay: seconds to cut it, how far the cutting's heard (m), its shock bare-handed, the hour it's mended. */
export const BUS = { cut: 5, noise: 15, shock: 60, repair: 6 };
/** The deck: real seconds moving on it till the live bus has felt him, real seconds from then till he's caught. */
export const DECK = { feel: 1, caught: 20 };

/** Whether the bridge's sensor bus is cut now. */
export const busDown = (s: SimState) => (s.bus ?? -1) > s.time;

/** How far along the Dongshuimen's truss a point is, if it's on it (its rail deck, its road deck, or the truss between). */
export function onDeck(w: World, p: V3): number | undefined {
  const b = w.bridges?.[0];
  if (!b) return undefined;
  const [t, sv] = along(b, p.x, p.z);
  if (t < b.ta || t > b.tb || Math.abs(sv) > TRUSS.half + 0.4) return undefined;
  const up = p.y - rail(b, t);
  return up > -0.5 && up < TRUSS.depth + 3 ? t : undefined;
}

// The relay at the substation: cut with bolt cutters, gloved.
START_SOUND.busrelay = () => 'latch';
onInteract('busrelay', {
  can: s => (busDown(s) ? 'cut: the bridge is deaf till 06:00' : has(s.inv.pack, 'boltcutters') ? null : "the bridge's sensor bus relay: cut it with bolt cutters"),
  dur: () => BUS.cut,
  done: (s, _w, it) => {
    s.events.push({ t: 'sfx', id: 'force' }, { t: 'noise', x: it.x, y: it.y, z: it.z, r: BUS.noise, kind: 'force' });
    if (!has(s.inv.pack, 'insgloves')) {
      s.events.push({ t: 'hurt', dmg: BUS.shock, cause: 'shock' }, { t: 'sfx', id: 'zap' }, { t: 'msg', text: "it's live: it threw you off" });
      return;
    }
    s.bus = nextHour(s.time, BUS.repair);
    stepDone(s, 'bridge', 'relay');
    s.events.push({ t: 'msg', text: "relay cut: the bridge's sensors are deaf till 06:00" });
  },
});

/** Ten times a second: on the truss, the live bus feeling him move; felt, caught 20 s on if he's still on it. */
export function stepDeck(s: SimState, w: World) {
  if (s.dead || s.ended || s.tick % 6) return;
  const t = onDeck(w, s.player.pos), D = (s.deck ??= {});
  if (t === undefined) { D.felt = 0; D.spotted = undefined; return; }
  stepDone(s, 'bridge', 'deck');
  if (D.spotted !== undefined) { if ((s.time - D.spotted) / SCALE >= DECK.caught) die(s, 'bridge'); return; }
  const moving = Math.hypot(s.player.vel.x, s.player.vel.z) > 0.3 || s.player.mode !== 'ground';
  D.felt = !busDown(s) && moving ? (D.felt ?? 0) + 0.1 : 0;
  if (D.felt >= DECK.feel) spotted(s, w, 'the bridge felt you move: they know you are on it');
}

function spotted(s: SimState, w: World, text: string) {
  s.deck!.spotted = s.time;
  giveAway(s, w, { ...s.player.pos });
  s.events.push({ t: 'msg', text });
}
