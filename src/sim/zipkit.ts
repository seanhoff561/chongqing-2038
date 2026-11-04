// The zipline kit (M5-33, U-034): no line is strung but by him. With the kit in hand, used at an anchor in reach (a
// mast, a pole, a railing, a roof's edge: anything solid), one clamp goes on; used again looking at another lower down,
// up to 40 m off and in a clear line, the cable's strung between them, sloping down, and rides on its own trolley as
// any line does (zip.ts). From either end he unclamps it and packs it up again. A machine that sees a strung line
// goes to look under it.
import type { SimState, Vec3 } from './types';
import type { World, Inter } from '../world/world';
import { onUseId } from './use';
import { extraInters, onInteract } from './interact';
import { eyeOf } from './player';
import { raycast } from '../world/geom';
import { addItem, takeStack } from './inventory';
import { MAX_LEN, MIN_FALL } from './zip';
import { unitPose, isOff } from './units';
import { STATIC } from '../data/units';
import { leave } from './alert';

/** How far an anchor in reach is (m); how near a machine must be to a line's middle to notice it. */
export const KIT = { reach: 2.5, notice: 40 };

onUseId('zipkit', (s, w, st) => {
  const p = s.player, e = eyeOf(p), c = Math.cos(p.pitch), d = { x: -Math.sin(p.yaw) * c, y: Math.sin(p.pitch), z: -Math.cos(p.yaw) * c };
  const hit = raycast(w.index, e.x, e.y, e.z, d.x, d.y, d.z, s.kitRig ? MAX_LEN + 5 : KIT.reach);
  if (!hit) { return; }
  const at: Vec3 = { x: e.x + d.x * (hit.t - 0.05), y: e.y + d.y * (hit.t - 0.05), z: e.z + d.z * (hit.t - 0.05) };
  if (!s.kitRig) { s.kitRig = at; s.events.push({ t: 'msg', text: 'first clamp on' }); return; }
  const a = s.kitRig, run = Math.hypot(at.x - a.x, at.z - a.z), len = Math.hypot(run, at.y - a.y), L = len || 1;
  if (len > MAX_LEN) { return; }
  if (Math.abs(at.y - a.y) < MIN_FALL * run) { return; }
  // (Clear between, past the anchors themselves.)
  const ux = (at.x - a.x) / L, uy = (at.y - a.y) / L, uz = (at.z - a.z) / L;
  if (len > 1 && raycast(w.index, a.x + ux * 0.4, a.y + uy * 0.4, a.z + uz * 0.4, ux, uy, uz, len - 0.8)) { return; }
  takeStack(s.inv.pack, st.uid); s.inv.held = 0;
  (s.lines ??= []).push({ a, b: at, kit: true });
  s.kitRig = undefined;
  s.events.push({ t: 'msg', text: 'line strung' }, { t: 'sfx', id: 'rig' });
});

// Each kit line's two ends: unclamped from either.
extraInters.push((s: SimState): Inter[] => (s.lines ?? []).flatMap((l, i) => (l.kit ? [l.a, l.b].map((q, k) => ({ id: `kit${i}:${k}`, kind: 'zipkit', x: q.x, y: q.y, z: q.z, r: 0.6, zh: '拆下滑索', en: 'Unclamp the line', data: { i } })) : [])));
onInteract('zipkit', {
  now: (s, _w, it) => {
    const i = it.data!.i as number;
    if (!s.lines?.[i]?.kit) return;
    s.lines.splice(i, 1);
    addItem(s, s.inv.pack, 'zipkit', 1);
    s.events.push({ t: 'msg', text: 'line unclamped and packed' });
  },
});

/** Twice a second: a machine with a strung line's middle in sight, near enough, goes to look under it (once a line). */
export function stepKitLines(s: SimState, w: World) {
  if (!s.lines?.length || s.tick % 30) return;
  for (const l of s.lines) {
    if (!l.kit || l.seen) continue;
    const m = { x: (l.a.x + l.b.x) / 2, y: (l.a.y + l.b.y) / 2, z: (l.a.z + l.b.z) / 2 };
    for (const u of s.units) {
      if (isOff(s, u) || STATIC.has(u.kind) || (u.reserve && !u.trip) || u.trip) continue;
      const q = unitPose(w, u, s.time);
      if (!q.active || Math.hypot(q.x - m.x, q.z - m.z) > KIT.notice) continue;
      const dx = m.x - q.x, dy = m.y - q.y - 1, dz = m.z - q.z, L = Math.hypot(dx, dy, dz) || 1;
      if ((dx * Math.sin(q.yaw) + dz * Math.cos(q.yaw)) / Math.hypot(dx, dz || 1e-6) < 0.3 || raycast(w.index, q.x, q.y + 1, q.z, dx / L, dy / L, dz / L, L - 0.5)) continue;
      l.seen = true;
      leave(s, w, u, 'look', { x: m.x, y: Math.min(l.a.y, l.b.y), z: m.z });
      u.aware = Math.max(u.aware ?? 0, 0.35);
      break;
    }
  }
}

