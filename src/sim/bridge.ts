// Route A, the Dongshuimen Bridge's rail deck (M7-02, M7-03; DESIGN section 10). The deck is wired: a sensor bus along
// the truss feels anyone moving on it, its word carried back to the city through a relay at the Xinhua Road
// substation. Cut (bolt cutters, held, loud; live, so without insulated gloves it throws him off and burns him), the
// bridge is deaf until the repair at the next 06:00. Two maintenance drones fly the rail deck on a schedule, each out
// from its end and back every four game hours, the second from the Nan'an end, looking at the steel within 20 m of
// them; a running jammer within its reach blinds one. Felt or seen on the truss, the network has him: 20 s later,
// still on it, the bridge's drones have him. Its Nan'an end is the ending's (world/yuzhong/exits.ts).
import type { SimState } from './types';
import type { World } from '../world/world';
import type { Pose } from './units';
import { TRUSS, along, at, rail, type Span } from '../world/yuzhong/bridges';
import { raycast } from '../world/geom';
import { onInteract, START_SOUND } from './interact';
import { has } from './inventory';
import { die } from './body';
import { nextHour, SCALE } from './clock';
import { stepDone } from './escape';
import { giveAway } from './district';
import { JAM } from './jammer';

type V3 = { x: number; y: number; z: number };

/** The relay: seconds to cut it, how far the cutting's heard (m), its shock bare-handed, the hour it's mended. */
export const BUS = { cut: 5, noise: 15, shock: 60, repair: 6 };
/** The deck: real seconds moving on it till the live bus has felt him, real seconds from then till he's caught; the
 *  drones' round trip (game hours), how far they look (m), their height over the rail deck. */
export const DECK = { feel: 1, caught: 20, period: 4, sight: 20, up: 4.2 };

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

/** The maintenance drones now: each from its end on the hour every DECK.period hours, out to the other end and back,
 *  the first from the north (the schedule's 00:00, 04:00, ...), the second from Nan'an. */
export function deckDrones(s: SimState, b: Span): Pose[] {
  const f = ((s.time / 3600 / DECK.period) % 1 + 1) % 1, g = f < 0.5 ? f * 2 : 2 - f * 2, L = b.tb - b.ta - 8;
  return [g, 1 - g].map((d, k) => {
    const t = b.ta + 4 + d * L, [x, z] = at(b, t, 0), dir = (f < 0.5) === (k === 0) ? 1 : -1;
    return { x, y: rail(b, t) + DECK.up, z, yaw: Math.atan2(b.ux * dir, b.uz * dir), active: true };
  });
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

/** Ten times a second: on the truss, the live bus feeling him move, the drones looking (not through steel or a
 *  running jammer); had, caught 20 s on if he's still on it. */
export function stepDeck(s: SimState, w: World) {
  const b = w.bridges?.[0], p = s.player.pos;
  if (!b || s.dead || s.ended || s.tick % 6) return;
  const t = onDeck(w, p), D = (s.deck ??= {});
  if (t === undefined) { D.felt = 0; D.spotted = undefined; return; }
  stepDone(s, 'bridge', 'deck');
  if (D.spotted !== undefined) { if ((s.time - D.spotted) / SCALE >= DECK.caught) die(s, 'bridge'); return; }
  const moving = Math.hypot(s.player.vel.x, s.player.vel.z) > 0.3 || s.player.mode !== 'ground';
  D.felt = !busDown(s) && moving ? (D.felt ?? 0) + 0.1 : 0;
  if (D.felt >= DECK.feel) return spotted(s, w, 'the bridge felt you move: they know you are on it');
  for (const q of deckDrones(s, b)) {
    const c = { x: p.x, y: p.y + 1, z: p.z }, d = Math.hypot(c.x - q.x, c.y - q.y, c.z - q.z);
    if (d > DECK.sight || (s.jam && d < JAM.reach) || raycast(w.index, q.x, q.y, q.z, (c.x - q.x) / d, (c.y - q.y) / d, (c.z - q.z) / d, d - 0.3)) continue;
    return spotted(s, w, 'a maintenance drone has seen you');
  }
}

function spotted(s: SimState, w: World, text: string) {
  s.deck!.spotted = s.time;
  giveAway(s, w, { ...s.player.pos });
  s.events.push({ t: 'msg', text });
}
