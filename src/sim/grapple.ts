// The grappling hook (M5-20, DESIGN section 3): thrown along his look at the top of a wall up to 20 m above him, it
// catches if it lands within a metre of the wall's top edge, its rope hanging to the ground: climbed hand over hand
// as a pipe is, and down again (rappelled) the same. Missed, it clatters back down. At either end he takes it down
// and coils it back into his pack.
import type { SimState } from './types';
import type { Inter } from '../world/world';
import { onUseId } from './use';
import { extraInters, onInteract } from './interact';
import { eyeOf } from './player';
import { raycast, topAt } from '../world/geom';
import { rayGround } from '../world/heightfield';
import { free } from './physics';
import { addItem, takeStack } from './inventory';
import { ropes } from './grip';

/** How high a ledge can be over his feet, how far it can be thrown (m), how near the top it must land, the clank. */
export const GRAPPLE = { up: 20, reach: 24, near: 1.2, noise: 20 };

onUseId('grapple', (s, w, st) => {
  const p = s.player;
  if (p.swing > 0 || s.task) return;
  p.swing = 0.8;
  const e = eyeOf(p), c = Math.cos(p.pitch), d = { x: -Math.sin(p.yaw) * c, y: Math.sin(p.pitch), z: -Math.cos(p.yaw) * c };
  const h = raycast(w.index, e.x, e.y, e.z, d.x, d.y, d.z, GRAPPLE.reach), sol = h && h.id >= 0 ? w.index.solids[h.id] : null;
  const hx = h ? e.x + d.x * h.t : 0, hy = h ? e.y + d.y * h.t : 0, hz = h ? e.z + d.z * h.t : 0, top = sol ? topAt(sol, hx, hz) : 0;
  // A wall's face just under its top, with room on the top to catch.
  const ok = h && sol && Math.abs(h.ny) < 0.5 && top - hy <= GRAPPLE.near && top - p.pos.y <= GRAPPLE.up && free(w.index, hx - h.nx * 0.3, top + 0.02, hz - h.nz * 0.3, 0.3, 0.1);
  if (!ok) { s.events.push({ t: 'msg', text: "the hook didn't catch" }, { t: 'noise', x: hx || p.pos.x, y: hy || p.pos.y, z: hz || p.pos.z, r: GRAPPLE.noise / 2, kind: 'clatter' }); return; }
  const x = hx + h.nx * 0.06, z = hz + h.nz * 0.06, dn = raycast(w.index, x, top - 0.2, z, 0, -1, 0, 60), g = w.ground ? rayGround(w.ground, x, top - 0.2, z, 0, -1, 0, 60) : null;
  const y0 = top - 0.2 - Math.min(dn?.t ?? 60, g?.t ?? 60);
  takeStack(s.inv.pack, st.uid);
  s.inv.held = 0;
  (s.ropes ??= []).push({ kind: 'rope', x, z, y0, y1: top, nx: h.nx, nz: h.nz, item: st.id });
  s.events.push({ t: 'msg', text: 'hooked' }, { t: 'noise', x: hx, y: top, z: hz, r: GRAPPLE.noise, kind: 'clank' });
});

/** Every tick: the ropes he's hung, for the hands to find. */
export function stepRopes(s: SimState) {
  ropes.length = 0;
  for (const r of s.ropes ?? []) ropes.push(r);
}

// Each rope's two ends: taken down from either.
extraInters.push((s: SimState): Inter[] => (s.ropes ?? []).flatMap((r, i) => [
  { id: `rope${i}:foot`, kind: 'rope', x: r.x + r.nx * 0.3, y: r.y0 + 1.1, z: r.z + r.nz * 0.3, r: 0.6, zh: '收绳', en: 'Take down the rope', data: { i } },
  { id: `rope${i}:top`, kind: 'rope', x: r.x - r.nx * 0.3, y: r.y1 + 0.3, z: r.z - r.nz * 0.3, r: 0.6, zh: '收绳', en: 'Take down the rope', data: { i } },
]));

onInteract('rope', {
  now: (s, _w, it) => {
    const r = s.ropes?.[it.data!.i as number];
    if (!r) return;
    s.ropes!.splice(it.data!.i as number, 1);
    addItem(s, s.inv.pack, r.item, 1);
    s.events.push({ t: 'msg', text: 'rope coiled and packed' });
  },
});

