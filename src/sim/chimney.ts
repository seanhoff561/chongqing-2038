// Chimneying (M3-78, U-043): in a gap between two facing walls 0.6 to 1.25 m apart, upright (a shaft) or sloped (a
// collapsed slab's slot, a duct), X (its own key, U-060) braces his back and feet against them. W works him the way he
// looks (up a shaft looking up, up a slope looking up it), S back the other way, slowly, with a quiet scrape; he
// holds wherever he stops. X again or Space lets go; the walls running out (the gap widening, an opening beside him)
// drops him. Braced across, his body is as low as lying down (U-055), and X standing in such a gap braces him too.
import { B, DT, type InputFrame, type SimState } from './types';
import type { World } from '../world/world';
import type { Player } from './player';
import { movement as M } from '../data/movement';
import { raycast } from '../world/geom';
import { moveHorizontal, moveVertical, free } from './physics';

const C = M.chimney, H = M.height.crawl;

/** The gap round his middle: the narrowest pair of opposite walls (looked for every way round), if it's one to brace
 *  across. */
export function gapAt(world: World, p: Player): number | null {
  // (Half a metre up: his body's low, but on a slope's floor its middle would be in it.)
  const y = p.pos.y + 0.5;
  let best = Infinity;
  for (let k = 0; k < 8; k++) {
    const dx = Math.cos((k * Math.PI) / 8), dz = Math.sin((k * Math.PI) / 8);
    const a = raycast(world.index, p.pos.x, y, p.pos.z, dx, 0, dz, C.max), b = a && raycast(world.index, p.pos.x, y, p.pos.z, -dx, 0, -dz, C.max);
    if (a && b) best = Math.min(best, a.t + b.t);
  }
  return best >= C.min && best <= C.max ? best : null;
}

/** X in a gap, in the air or standing in it (lifted off the floor onto his back and feet): braced. */
export function tryChimney(state: SimState, world: World, input: InputFrame, standing = false): boolean {
  const p = state.player;
  if (!(input.pressed & B.CHIMNEY) || gapAt(world, p) === null) return false;
  if (standing) {
    const lift = [0.35, 0.6, 0.9].find(d => free(world.index, p.pos.x, p.pos.y + d, p.pos.z, H));
    if (lift === undefined) return false;
    p.pos.y += lift;
    p.onGround = false;
  }
  p.mode = 'chimney';
  p.posture = 'crawl';
  p.vel.x = p.vel.y = p.vel.z = 0;
  p.fallFrom = p.pos.y;
  p.stepAcc = 0;
  state.events.push({ t: 'sfx', id: 'brace' });
  return true;
}

/** Off the walls: crouched again if there's room (he gets up from there as ever), else as low as he was. */
function leave(world: World, p: Player) {
  p.mode = 'air';
  p.fallFrom = p.pos.y;
  if (free(world.index, p.pos.x, p.pos.y + 1e-3, p.pos.z, M.height.crouch)) p.posture = 'crouch';
}

export function stepChimney(state: SimState, world: World, input: InputFrame) {
  const p = state.player;
  if ((input.pressed & (B.JUMP | B.CHIMNEY)) || gapAt(world, p) === null) { leave(world, p); return; }
  const my = Math.max(-1, Math.min(1, input.my)), sp = (my > 0 ? C.up : C.down) * my * DT;
  if (!sp) return;
  const c = Math.cos(p.pitch), dx = -Math.sin(p.yaw) * c * sp, dy = Math.sin(p.pitch) * sp, dz = -Math.cos(p.yaw) * c * sp;
  const y0 = p.pos.y, x0 = p.pos.x, z0 = p.pos.z;
  moveVertical(world.index, p.pos, H, dy);
  moveHorizontal(world.index, p.pos, H, dx, dz, 0.3);
  p.fallFrom = p.pos.y;
  // Down onto a floor (the shaft's foot, a duct's), or level onto one: on his feet.
  if (dy <= 0 && !free(world.index, p.pos.x, p.pos.y - 0.05, p.pos.z, H)) { leave(world, p); return; }
  p.stepAcc += Math.hypot(p.pos.x - x0, p.pos.y - y0, p.pos.z - z0);
  if (p.stepAcc >= C.stride) {
    p.stepAcc = 0;
    state.events.push({ t: 'sfx', id: 'brace' });
    state.events.push({ t: 'noise', x: p.pos.x, y: p.pos.y, z: p.pos.z, r: C.noise, kind: 'step' });
  }
}
