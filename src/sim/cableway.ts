// The cableway's upper station (M6-16, DESIGN section 10): its bullwheel. The drive's dead with the feeder, and the
// brake was left off when cabin 1 was brought in on the emergency drive: the wind on a kilometre of haul rope over
// the river creeps the wheel round in fits. Every so often it strains (metal groaning) and lurches; in its nip, by
// its rim, it drags him in and hurts him badly. Its brake lever, held, sets the brake (loudly) and it's still; so is
// it once the drive has power again (the feeder fuse fitted, M7-05 sets `cable-feeder`).
import type { SimState } from './types';
import type { World, Feature } from '../world/world';
import { damage } from './body';
import { onInteract, START_SOUND } from './interact';
import { SCALE } from './clock';

/** The wheel: its rim's radius and height over its deck (m); its cycle (real seconds: still, straining, turning);
 *  its nip (m out from the rim, and in); what it does (hp); how far its lurch and its brake are heard (m); the brake's
 *  hold (s). */
export const WHEEL = { r: 2, up: 1.1, cycle: [14, 1.5, 2.5], out: 0.9, in: 0.4, hit: 45, noise: 20, brake: 3, brakeNoise: 35 };

/** The feeder's live (its fuse fitted): the drive holds the wheel. */
export const cableLive = (s: SimState) => !!s.wstate.open['cable-feeder'];

const wheels = new WeakMap<World, Feature | null>();
const wheelOf = (w: World) => (wheels.has(w) ? wheels.get(w)! : (wheels.set(w, w.features.find(f => f.kind === 'cable:bullwheel') ?? null), wheels.get(w)!));

/** What the wheel's doing at a game time: 'still', 'strain' or 'turn' (braked or powered, always still). */
export function wheelState(s: SimState): 'still' | 'strain' | 'turn' {
  if (s.wstate.open['cable-brake'] || cableLive(s)) return 'still';
  const [a, b, c] = WHEEL.cycle, t = ((s.time / SCALE) % (a + b + c) + a + b + c) % (a + b + c);
  return t < a ? 'still' : t < a + b ? 'strain' : 'turn';
}

/** Every tick: the wheel straining (heard near it), and turning, him in its nip. */
export function stepCableway(s: SimState, w: World) {
  const f = wheelOf(w);
  if (!f || s.dead) return;
  const p = s.player.pos, d = Math.hypot(p.x - f.x, p.z - f.z), st = wheelState(s), was = s.wheel;
  s.wheel = st;
  if (st === 'still') return;
  // (As it starts to strain, and as it goes: heard round it.)
  if (st !== was && d < 15) s.events.push({ t: 'sfx', id: 'force' });
  if (st === 'turn' && was === 'strain') s.events.push({ t: 'noise', x: f.x, y: f.y + WHEEL.up, z: f.z, r: WHEEL.noise, kind: 'crash' });
  if (st !== 'turn' || d < WHEEL.r - WHEEL.in || d > WHEEL.r + WHEEL.out || p.y > f.y + WHEEL.up + 0.3 || p.y + 1.7 < f.y + WHEEL.up - 0.3) return;
  if ((s.wheelHit ?? -Infinity) > s.time - 3 * SCALE) return;
  s.wheelHit = s.time;
  damage(s, WHEEL.hit, 'bullwheel');
  s.events.push({ t: 'hurt', dmg: WHEEL.hit, cause: 'bullwheel' }, { t: 'msg', text: 'the bullwheel lurched and dragged you into the rope' });
  // Dragged round with the rim, toward its nip, and thrown off it.
  const ux = (p.x - f.x) / (d || 1), uz = (p.z - f.z) / (d || 1);
  s.player.vel.x = -uz * 4 - ux * 1.5; s.player.vel.z = ux * 4 - uz * 1.5; s.player.vel.y = 1.5; s.player.onGround = false;
}

// The brake lever: held, it sets the brake, a long iron clank heard all round.
START_SOUND.cablebrake = () => 'force';
onInteract('cablebrake', {
  dur: () => WHEEL.brake,
  can: s => (s.wstate.open['cable-brake'] ? 'set' : null),
  done: (s, _w, it) => {
    s.wstate.open['cable-brake'] = true;
    s.events.push({ t: 'noise', x: it.x, y: it.y, z: it.z, r: WHEEL.brakeNoise, kind: 'crash' }, { t: 'msg', text: 'the brake bit: the wheel is still' });
  },
});
