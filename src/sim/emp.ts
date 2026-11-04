// The EMP device (M5-14, DESIGN section 6): three charges. Set off (used), a pulse 6 m round him: drones fall out of
// the air; walking machines stop 30 s (for good within 2 m); cameras and sensors go out 60 s, turrets 45 s. Used in
// one of his hideouts, it's rigged on the way in (M4-24: it downs a raid as it comes, raid.ts). Used crouched anywhere
// else, it's rigged where he is: the first machine to come within 2 m sets it off, and the device lies there after
// with its charges left.
import type { SimState } from './types';
import type { World } from '../world/world';
import { STATIC } from '../data/units';
import { onUseId } from './use';
import { unitPose, isOff } from './units';
import { crash } from './damage';
import { takeStack } from './inventory';
import { SCALE } from './clock';
import { SHELTER_R } from './shelter';

/** Its pulse's reach, how near is for good, real seconds each kind stays out, charges, how far its crack is heard, and
 *  how near a machine sets off a trap (m). */
export const EMP = { reach: 6, kill: 2, robot: 30, camera: 60, turret: 45, charges: 3, noise: 20, trap: 2 };
const FLY = new Set(['drone', 'hunter', 'fpv', 'bomber', 'heli']);

/** A pulse at `at`. */
export function pulse(s: SimState, w: World, at: { x: number; y: number; z: number }) {
  for (const u of s.units) {
    if (u.dead || u.crash || (u.reserve && !u.trip)) continue;
    const q = STATIC.has(u.kind) ? w.cameras[u.cam!] : unitPose(w, u, s.time), d = Math.hypot(q.x - at.x, q.y - at.y, q.z - at.z);
    if (d > EMP.reach) continue;
    if (FLY.has(u.kind)) crash(s, w, u);
    else if (STATIC.has(u.kind)) u.off = Math.max(u.off ?? 0, s.time + (u.kind === 'turret' ? EMP.turret : EMP.camera) * SCALE);
    else if (d <= EMP.kill) u.shut = true;
    else u.off = Math.max(u.off ?? 0, s.time + EMP.robot * SCALE);
  }
  s.events.push({ t: 'noise', x: at.x, y: at.y, z: at.z, r: EMP.noise, kind: 'emp' }, { t: 'sfx', id: 'zap' });
}

onUseId('emp', (s, w, st) => {
  const left = st.charge ?? EMP.charges, p = s.player.pos;
  if (left <= 0) { s.events.push({ t: 'msg', text: 'no charge' }); return; }
  // In a hideout: rigged on the way in.
  const h = s.shelters.find(x => Math.hypot(p.x - x.x, p.y - x.y, p.z - x.z) <= SHELTER_R);
  if (h) {
    if (h.trap) { return; }
    takeStack(s.inv.pack, st.uid);
    s.inv.held = 0;
    h.trap = true;
    s.events.push({ t: 'msg', text: 'EMP trap rigged on the way in' });
    return;
  }
  // Crouched: rigged here.
  if (s.player.posture === 'crouch') {
    takeStack(s.inv.pack, st.uid);
    st.charge = left;
    (s.traps ??= []).push({ stack: st, x: p.x, y: p.y, z: p.z });
    s.events.push({ t: 'msg', text: 'EMP rigged' });
    return;
  }
  st.charge = left - 1;
  pulse(s, w, { x: p.x, y: p.y + 1, z: p.z });
});

/** Ten times a second: a rigged trap set off by the first machine within 2 m; the device left lying there. */
export function stepTraps(s: SimState, w: World) {
  if (!s.traps?.length || s.tick % 6) return;
  s.traps = s.traps.filter(t => {
    const hit = s.units.some(u => !STATIC.has(u.kind) && !isOff(s, u) && !u.crash && !(u.reserve && !u.trip) && (() => { const q = unitPose(w, u, s.time); return q.active && Math.hypot(q.x - t.x, q.y - t.y, q.z - t.z) <= EMP.trap; })());
    if (!hit) return true;
    pulse(s, w, { x: t.x, y: t.y + 0.5, z: t.z });
    t.stack.charge = (t.stack.charge ?? EMP.charges) - 1;
    s.dropped.push({ stack: t.stack, x: t.x, y: t.y, z: t.z });
    return false;
  });
}
