// The signal jammer (M5-13, DESIGN section 5): switched on (used), it cuts the machines' link within 25 m of him.
// What a machine there had still to tell the network is lost, and the network notices the silence (silent.ts); drones
// there hover blind and cameras go dark to it. Left running 20 s straight it's a beacon: the network sends the nearest
// drone to look where it is. Its battery lasts ten minutes running.
import type { SimState } from './types';
import type { World } from '../world/world';
import { DT } from './types';
import { STATIC, BROADCAST } from '../data/units';
import { onUseId } from './use';
import { unitPose } from './units';
import { leave } from './alert';
import { nearest } from './silent';
import { SCALE } from './clock';

/** Reach (m); real seconds running before it's a beacon; real seconds a full battery runs. */
export const JAM = { reach: 25, beacon: 20, lasts: 600 };
const FLY = new Set(['drone', 'hunter', 'fpv', 'bomber']);
const jammer = (s: SimState) => s.inv.pack.items.find(i => i.id === 'jammer');
/** Off: the link back for all. */
function off(s: SimState, text: string) { s.jam = undefined; for (const u of s.units) u.cut = undefined; s.events.push({ t: 'msg', text }); }

onUseId('jammer', s => {
  const st = jammer(s);
  if (!st) return;
  if (s.jam) { off(s, 'jammer off'); return; }
  if ((st.charge ?? 100) <= 0) { s.events.push({ t: 'msg', text: "the jammer's battery is flat" }); return; }
  s.jam = { since: s.time };
  s.events.push({ t: 'msg', text: 'jammer on' });
});

export function stepJam(s: SimState, w: World) {
  const J = s.jam, st = jammer(s);
  if (!J) return;
  if (!st) { off(s, 'jammer gone'); return; }
  st.charge = Math.max(0, (st.charge ?? 100) - (100 * DT) / JAM.lasts);
  if (st.charge <= 0) { off(s, "the jammer's battery ran flat"); return; }
  if (s.tick % 6) return;
  const p = s.player.pos;
  for (const u of s.units) {
    if (u.dead || (u.reserve && !u.trip)) continue;
    const q = STATIC.has(u.kind) ? w.cameras[u.cam!] : unitPose(w, u, s.time);
    if (Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z) > JAM.reach) { u.cut = undefined; continue; }
    // Its word not yet sent, lost: a silence; and, cut off, it can't tell the network anything till it's been out of
    // reach as long as it takes to (its broadcast delay).
    if (u.cast !== undefined) {
      if (!u.cut && s.time < u.cast) s.hive.silent.push({ x: q.x, y: q.y, z: q.z, t: s.time });
      u.cast = s.time + BROADCAST[u.kind] * SCALE;
    }
    u.cut = true;
    // A drone or a camera, cut off: blind, and dark to the network (a moment past each check).
    if (FLY.has(u.kind) || STATIC.has(u.kind)) u.off = Math.max(u.off ?? 0, s.time + 0.5 * SCALE);
  }
  // Running too long: a beacon.
  if (!J.beacon && (s.time - J.since) / SCALE >= JAM.beacon) {
    J.beacon = true;
    const u = nearest(s, w, p, true);
    if (u) { leave(s, w, u, 'look', { ...p }); u.aware = Math.max(u.aware ?? 0, 0.35); u.seen = { ...p }; }
  }
}
