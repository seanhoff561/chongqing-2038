// Jiefangbei station's hazards and panels (M6-17, DESIGN section 10). The third rail along the outer side of each
// track through the station and the running tunnels east is live (the traction supply is its own, still on): his feet
// on it and he's dead; it buzzes a step off, a warning, and he steps or jumps over it. The control room's traction
// breaker cuts it (and closes it again). Its pump panel runs the station's drainage pumps, but only once the metro's
// feeder has power (route D, M7-11, sets `metro-feeder`); then the pumps run (`metro-pumps`).
import type { SimState } from './types';
import type { World } from '../world/world';
import { onInteract, START_SOUND } from './interact';
import { die } from './body';

/** How near his feet must come to the rail's line, and how high over its top, to touch it (m); how far its buzz is
 *  heard (m) and how often (ticks); how long the breaker and the pumps take to work (s); how far they're heard (m). */
export const RAIL = { touch: 0.22, over: 0.1, buzz: 1.5, every: 75, breaker: 1.5, pumps: 3, noise: 12 };

/** Whether the third rail is live: until the breaker's opened. */
export const railLive = (s: SimState) => !s.wstate.open['metro-traction'];

export function stepRail(s: SimState, w: World) {
  if (!w.rail?.length || s.dead || !railLive(s)) return;
  const p = s.player.pos;
  let near = Infinity;
  for (const r of w.rail) {
    if (Math.abs(p.y - r.a.y) > 2) continue;
    const vx = r.b.x - r.a.x, vz = r.b.z - r.a.z, L = vx * vx + vz * vz || 1, t = Math.max(0, Math.min(1, ((p.x - r.a.x) * vx + (p.z - r.a.z) * vz) / L));
    const d = Math.hypot(r.a.x + vx * t - p.x, r.a.z + vz * t - p.z);
    if (d < RAIL.touch && p.y <= r.a.y + RAIL.over && p.y >= r.a.y - 0.5 && s.player.mode !== 'dead') {
      s.events.push({ t: 'sfx', id: 'zap' }, { t: 'noise', x: p.x, y: p.y, z: p.z, r: 30, kind: 'arc' });
      die(s, 'shock');
      return;
    }
    near = Math.min(near, d);
  }
  if (near < RAIL.buzz && s.tick % RAIL.every === 0) s.events.push({ t: 'sfx', id: 'hum' });
}

// The traction breaker: a heavy lever, thrown open or shut again.
START_SOUND.traction = () => 'latch';
onInteract('traction', {
  dur: () => RAIL.breaker,
  done: (s, _w, it) => {
    s.wstate.open['metro-traction'] = !s.wstate.open['metro-traction'];
    s.events.push({ t: 'noise', x: it.x, y: it.y, z: it.z, r: RAIL.noise, kind: 'crash' }, { t: 'msg', text: railLive(s) ? 'traction on: the third rail is live' : 'traction off: the third rail is dead' });
  },
});

// The pump panel: nothing without the feeder; with it, the pumps.
START_SOUND.pumps = () => 'latch';
onInteract('pumps', {
  can: s => (s.wstate.open['metro-pumps'] ? 'the pumps are running' : s.wstate.open['metro-feeder'] ? null : 'no power: the feeder is dead'),
  dur: () => RAIL.pumps,
  done: (s, _w, it) => {
    s.wstate.open['metro-pumps'] = true;
    s.events.push({ t: 'noise', x: it.x, y: it.y, z: it.z, r: RAIL.noise, kind: 'crash' }, { t: 'msg', text: 'the pumps start: the water will go down' });
  },
});
