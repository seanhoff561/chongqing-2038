// Footsteps by what's underfoot (M8-08): his gait's step (audio/moves.ts) with the sound of the surface over it:
// ringing metal, hollow boards, a splash in water or on wet ground in the rain, grass, crunching grit. Plain concrete,
// tile and asphalt add nothing. Lying snow crunches (U-097).
import type { Audio } from './audio';
import type { SolidIndex } from '../world/geom';
import type { World } from '../world/world';
import { query, frameIn, topAt } from '../world/geom';
import { MAT } from '../world/mats';
import { playMove } from './moves';

export type Surface = 'hard' | 'metal' | 'wood' | 'water' | 'grass' | 'grit' | 'snow';

const OF: Record<number, Surface> = {
  [MAT.metal]: 'metal', [MAT.tealMetal]: 'metal', [MAT.cable]: 'metal', [MAT.screen]: 'metal',
  [MAT.wood]: 'wood', [MAT.crate]: 'wood',
  [MAT.water]: 'water',
  [MAT.grass]: 'grass', [MAT.moss]: 'grass', [MAT.leaves]: 'grass', [MAT.cloth]: 'grass', [MAT.soft]: 'grass',
  [MAT.rubble]: 'grit', [MAT.roofTile]: 'grit',
};

/** What he's standing on at (x, y, z): the solid whose top is just under his feet (the city's ground is hard). */
export function underfoot(idx: SolidIndex, w: World, x: number, y: number, z: number): Surface {
  for (const q of w.water) if (x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1 && y < q.y1 + 0.05 && y > q.y0 - 0.5) return 'water';
  let best = -Infinity, mat = -1;
  for (const i of query(idx, x, z, x, z)) {
    const s = idx.solids[i];
    if (idx.off[i] || x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) continue;
    if (s.rot) { const [lx, lz] = frameIn(s, x, z), r = s.rot; if (lx < r.x0 || lx > r.x1 || lz < r.z0 || lz > r.z1) continue; }
    const t = topAt(s, x, z);
    if (t <= y + 0.05 && t > y - 0.3 && t > best) { best = t; mat = s.mat; }
  }
  return OF[mat] ?? 'hard';
}

/** A step (or a landing, `hard` for a heavy one) on `surf`, wet when it's raining on him. */
export function playStep(a: Audio, id: string, surf: Surface, wet: boolean) {
  playMove(a, id);
  if (!a.ready) return;
  const t = a.ctx!.currentTime + 0.01, g = id.startsWith('land') ? 1.6 : id === 'step-sprint' ? 1.2 : id === 'step-crouch' || id === 'step-crawl' ? 0.4 : 1;
  if (surf === 'metal') { a.tone(t, 0.18, 0.07 * g, 720, 690, 'triangle'); a.tone(t, 0.12, 0.04 * g, 1530, 1500); }
  else if (surf === 'wood') { a.tone(t, 0.09, 0.1 * g, 210, 150, 'triangle'); a.noise(t, 0.05, 0.04 * g, 'bandpass', 700, 1.5); }
  else if (surf === 'grass') a.noise(t, 0.14, 0.07 * g, 'highpass', 3200);
  // (Lying snow: a soft squeaking crunch, U-097.)
  else if (surf === 'snow') { a.noise(t, 0.16, 0.1 * g, 'bandpass', 1400, 1.2, 900); a.noise(t + 0.04, 0.1, 0.05 * g, 'highpass', 4200); }
  else if (surf === 'grit') a.noise(t, 0.12, 0.09 * g, 'bandpass', 2600, 0.7, 1800);
  if (surf === 'water' || wet) a.noise(t + 0.02, surf === 'water' ? 0.3 : 0.12, (surf === 'water' ? 0.14 : 0.05) * g, 'bandpass', 1800, 0.6, 900);
}
