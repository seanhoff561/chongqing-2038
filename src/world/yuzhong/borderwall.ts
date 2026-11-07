// The western border wall (M6-09, U-108): across the neck where the peninsula runs on west past the map, toward Eling
// and Lianglukou, the occupier's wall from the Jialing to the Yangtze and 80 m out into each river, past where the
// river's sonar starts listening (sim/river.ts), with no gap. Grey concrete panels 4 m long, each standing 10 m over
// the highest ground or anything running into it under it (Line 2's beams pass into it 8 m under its top); an anti-
// climb lip out over the city side at the top, razor coil along the crest and a live wire through it (sim/hv.ts: a
// hand or a body up there is dead); floodlights on masts every 40 m lighting the strip in front of it after dark,
// turrets on its top every 120 m looking into the city. Past it there's nothing to walk (render/beyond.ts): over its
// back face, from its crest to the sky, nothing gets by (collision only), so even a jump off a roof that overlooks it
// comes down on the live crest. The streets that ran west end at its face.
import { solid, xzHit, type Solid } from '../geom';
import { MAT } from '../mats';
import { GEO } from '../geo';
import { heightAt, type Heightfield } from '../heightfield';
import type { Camera, Feature, Prop } from '../world';
import { WATER_Y } from './ground';

/** Its faces (x, west and east), how high it stands over what's under it, its panels' length, the lip out over the
 *  city side; how far into each river, how far apart its turrets and floodlights; the live wire over its crest. */
export const BORDER = { x0: 0.4, x1: 2.4, h: 10, panel: 4, lip: 0.9, river: 80, turret: 120, flood: 40, wire: 0.45, over: 8, sky: 600 };
const GREY = 0x8c8a84;

/** Whether a solid stands wholly in the wall's line (the city's to clear for it), not running on into it or past it. */
const inLine = (s: Solid) => s.x0 > BORDER.x0 - 1 && s.x1 < BORDER.x1 + 0.5;

/** The wall over the ground g, round what of the city's solids runs into it (a beam, a deck). */
export function borderWall(g: Heightfield, solids: Solid[]) {
  const B = BORDER, X = (B.x0 + B.x1) / 2, at = (z: number) => heightAt(g, X, z) ?? -Infinity;
  // The neck: the run of dry ground along the wall's line that Jiaochangkou's latitude is in.
  const zz = GEO.landmarks.jiaochangkou.z, dry = (z: number) => at(z) > WATER_Y;
  let z0 = zz, z1 = zz;
  while (z0 > g.z0 && dry(z0 - 1)) z0--;
  while (z1 < g.z0 + (g.h - 1) * g.cell && dry(z1 + 1)) z1++;
  const from = Math.max(g.z0, z0 - B.river), to = Math.min(g.z0 + (g.h - 1) * g.cell, z1 + B.river), n = Math.ceil((to - from) / B.panel), len = (to - from) / n;
  // What of the city runs into it, panel by panel: its top.
  const over = new Float64Array(n).fill(-Infinity);
  for (const s of solids) {
    if (s.x0 > B.x1 + 0.5 || inLine(s) || s.z1 < from || s.z0 > to) continue;
    for (let k = Math.max(0, Math.floor((s.z0 - from) / len)); k <= Math.min(n - 1, Math.floor((s.z1 - from) / len)); k++)
      if (xzHit(s, 0, from + k * len, B.x1 + 0.5, from + (k + 1) * len)) over[k] = Math.max(over[k], s.y1 - B.h + B.over);
  }
  const out = { /** what of the city's stands where it goes: a solid wholly there, a thing at (x, z) */ clears: (s: Solid) => inLine(s) && s.z1 > from && s.z0 < to,
    at: (x: number, z: number) => x > B.x0 - 1 && x < B.x1 + 0.3 && z >= from && z <= to, solids: [] as Solid[], decor: [] as Solid[], props: [] as Prop[], cameras: [] as Camera[], features: [] as Feature[], hv: [] as { a: { x: number; y: number; z: number }; b: { x: number; y: number; z: number } }[], from, to };
  const box = (x0: number, y0: number, za: number, x1: number, y1: number, zb: number, mat: number, tint: number, list = out.solids) => { const q = solid(x0, y0, za, x1, y1, zb, mat); if (tint) q.tint = tint; list.push(q); };
  const wire: { a: { x: number; y: number; z: number }; b: { x: number; y: number; z: number } }[] = [];
  for (let k = 0; k < n; k++) {
    const za = from + k * len, zb = za + len, ys: number[] = [];
    for (let z = za; z <= zb + 1e-6; z += 0.5) for (const x of [0, X, B.x1, B.x1 + B.lip]) ys.push(heightAt(g, x, z) ?? WATER_Y - 4);
    const hi = Math.max(WATER_Y, ...ys, over[k]), lo = Math.min(...ys), top = hi + B.h;
    box(B.x0, lo - 2, za, B.x1, top, zb, MAT.concrete, GREY);
    box(B.x0 - 1, top + 0.7, za, B.x0, B.sky, zb, MAT.hidden, 0);
    // The lip out over the city side, the crest's coil and its posts, the wire through them.
    box(B.x1, top - 0.5, za, B.x1 + B.lip, top, zb, MAT.concrete, GREY);
    box(B.x0 + 0.3, top, za, B.x1 + B.lip - 0.2, top + 0.7, zb, MAT.metal, 0x6a6c6e, out.decor);
    for (const x of [B.x0 + 0.4, B.x1 + B.lip - 0.3]) box(x - 0.04, top, za + 0.1, x + 0.04, top + 1.1, za + 0.18, MAT.metal, 0x3a3c3e, out.decor);
    const a = { x: X, y: top + B.wire, z: za }, b = { x: X, y: top + B.wire, z: zb }, last = wire[wire.length - 1];
    if (last && Math.abs(last.b.y - a.y) < 1e-6) last.b = b; else wire.push({ a, b });
    // The ground's line along its foot on the city side: a kerb of darker concrete, wet with runoff.
    if (lo > WATER_Y - 0.5) box(B.x1, lo - 0.3, za, B.x1 + 0.35, Math.max(...ys.filter((_, i) => i % 4 === 2)) + 0.4, zb, MAT.concrete, 0x5e5c58);
    const mid = (za + zb) / 2, d = mid - from;
    // Floodlights on masts, turrets on top, every so often.
    if (Math.floor(d / B.flood) !== Math.floor((d - len) / B.flood)) {
      box(B.x1 + 0.2, top, mid - 0.15, B.x1 + 0.5, top + 4, mid + 0.15, MAT.metal, 0x3a3e44);
      box(B.x1 + 0.1, top + 4, mid - 0.6, B.x1 + 0.9, top + 4.5, mid + 0.6, MAT.glare, 0xffffff, out.decor);
      out.props.push({ kind: 'floodlight', x: B.x1 + 0.6, y: top + 4.2, z: mid, yaw: Math.PI / 2 });
    }
    if (Math.floor(d / B.turret) !== Math.floor((d - len) / B.turret)) {
      box(B.x1 - 0.6, top, mid - 0.7, B.x1 + 0.6, top + 0.9, mid + 0.7, MAT.metal, 0x3a3e44);
      out.cameras.push({ kind: 'turret', x: B.x1 + 0.7, y: top + 1.2, z: mid, yaw: Math.PI / 2 });
      out.features.push({ kind: 'border:turret', x: B.x1 + 0.7, y: top + 1.2, z: mid, group: out.features.length });
    }
  }
  // (Three lines of it, across the top and over the lip: nowhere up there more than half a metre from one.)
  out.hv = [B.x0 + 0.5, B.x1 - 0.5, B.x1 + B.lip / 2].flatMap(x => wire.map(w => ({ a: { ...w.a, x }, b: { ...w.b, x } })));
  for (const z of [from, to]) out.features.push({ kind: 'border:end', x: X, y: WATER_Y, z, group: out.features.length });
  return out;
}
