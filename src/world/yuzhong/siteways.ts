// The construction site's ways in (M6-10, DESIGN section 9), round the hoarding site.ts builds. The gate, locked
// (his own site card from when he worked there, or a clone of it), under a camera on its post; a scaffold up the hoarding
// from the street outside, over the top and along a plank walkway inside, then down its steps (two of the planks
// loose: run them and they go); a crawl under the hoarding where the drainage ditch runs out (site.ts leaves the gap);
// and the hoist: a drop from the next block's roof onto its top landing, then down in its cage (loud) or its ladder.
// (DESIGN has the drop from the Line 2 beam, but the real beam is 850 m off: the next roof stands in for it, D-131.)
import { solid, turn, type Solid } from '../geom';
import { MAT } from '../mats';
import { heightAt, type Heightfield } from '../heightfield';
import type { Camera, Climbable, Feature, Inter, Plot, Prop, Teleport } from '../world';
import { inside, type P2 } from './shapes';
import type { Site, Piece } from './site';
import { sin, cos, atan2 } from '../trig';

/** The scaffold walkway's drop under the hoarding's top, its width, a plank's length, which planks are loose, each
 *  step down; the hoist's landing's drop under the neighbour's roof and the gap left to it. */
export const SITEWAY = { walk: 1, wide: 1.25, plank: 1, loose: [2, 4], step: 2.2, lastDrop: 2.5, hoistDrop: 2, hoistGap: 1.6 };

export function siteWays(site: Site, plots: Plot[], g: Heightfield) {
  const solids: Solid[] = [], decor: Solid[] = [], props: Prop[] = [], inter: Inter[] = [], climbables: Climbable[] = [], cameras: Camera[] = [], features: Feature[] = [], teleports: Teleport[] = [];
  const { base, poly } = site, h = (x: number, z: number) => heightAt(g, x, z) ?? -Infinity;
  const inPlot = (x: number, z: number) => plots.some(q => !q.far && inside(q.corners as P2[], x, z));
  const feat = (kind: string, x: number, y: number, z: number) => features.push({ kind, x, y, z, group: features.length });
  /** A piece's frame: u along it, v out from the site; a box in it, turned into place. */
  const frame = (p: Piece) => {
    const dx = cos(p.yaw), dz = sin(p.yaw), sg = Math.sign(p.nx * -dz + p.nz * dx) || 1;
    const W = (u: number, v: number): P2 => [p.cx + dx * u + p.nx * v, p.cz + dz * u + p.nz * v];
    const box = (u0: number, u1: number, v0: number, v1: number, y0: number, y1: number, mat: number): Solid => turn([solid(p.cx + u0, y0, p.cz + Math.min(v0 * sg, v1 * sg), p.cx + u1, y1, p.cz + Math.max(v0 * sg, v1 * sg), mat)], p.yaw, p.cx, p.cz)[0];
    return { W, box };
  };

  // The gate: a steel panel across it, locked (the site card, or a clone), its camera up on the post over the hoarding
  // looking out at the street in front of it, its junction box low on the post outside.
  {
    const p = site.gate, { W, box } = frame(p), y0 = Math.max(base, p.lo), cap = Math.max(base, p.hi) + 2.4;
    solids.push({ ...box(-p.len / 2 + 0.15, p.len / 2 - 0.15, -0.05, 0.05, base, cap, MAT.hidden), part: 'site-gate' });
    props.push({ kind: 'sitegate', x: p.cx, y: y0, z: p.cz, yaw: -p.yaw, w: p.len - 0.3, h: cap - y0, d: 0.1, text: 'site-gate' });
    const [ix, iz] = W(0, 0.8);
    inter.push({ id: 'site-gate', kind: 'door', x: ix, y: y0 + 1.1, z: iz, r: 1.4, zh: '工地大门', en: 'Site gate', data: { part: 'site-gate', lock: 'locked', key: 'sitecard' } });
    const [cx, cz] = W(p.len / 2 + 0.2, -0.3), [lx, lz] = W(0, 6), [bx, bz] = W(p.len / 2 + 0.2, 0.3);
    cameras.push({ kind: 'camera', x: cx, y: cap + 1.2, z: cz, yaw: atan2(lx - cx, lz - cz), box: { x: bx, y: y0 + 1.3, z: bz, yaw: atan2(p.nx, p.nz) } });
    const [ox, oz] = W(0, 3);
    feat('site:gate', ox, h(ox, oz), oz);
    teleports.push({ name: 'Construction site: gate', x: ox, y: h(ox, oz) + 0.05, z: oz, yaw: atan2(p.nx, p.nz) });
    const [gx, gz] = W(0, -3);
    feat('site:gateIn', gx, base, gz);
  }

  // The scaffold: up the hoarding outside where the street runs along it (a long straight run, flat, nothing built
  // against it), over the top onto the walkway inside, along it, and down its steps.
  const fits = (p: Piece, u0: number, u1: number) => { const { W } = frame(p); for (let u = u0; u <= u1; u += 1) for (const v of [-0.1, -SITEWAY.wide - 0.3]) { const [x, z] = W(u, v); if (!inside(poly, x, z)) return false; } return true; };
  const outsideClear = (p: Piece) => { const { W } = frame(p); for (let u = -3; u <= 0; u += 1) for (const v of [1, 2.5]) { const [x, z] = W(u, v); if (inPlot(x, z) || Math.abs(h(x, z) - p.lo) > 0.8) return false; } return true; };
  const steps = (p: Piece) => Math.max(0, Math.ceil((p.cap - SITEWAY.walk - base - SITEWAY.lastDrop) / SITEWAY.step));
  const sc = site.pieces.filter(p => p !== site.gate && p !== site.ditch && p.len >= 5 && p.hi - p.lo < 1 && p.cap - base < 12 && outsideClear(p) && fits(p, -2.6, 4.4 + steps(p) * SITEWAY.step + 3))
    .sort((a, b) => Math.hypot(b.cx - site.gate.cx, b.cz - site.gate.cz) - Math.hypot(a.cx - site.gate.cx, a.cz - site.gate.cz))[0];
  if (sc) {
    const { W, box } = frame(sc), Y = sc.cap - SITEWAY.walk, wd = SITEWAY.wide;
    const [lx, lz] = W(-2, 0.17);
    climbables.push({ kind: 'ladder', x: lx, z: lz, y0: sc.lo, y1: sc.cap + 0.05, nx: sc.nx, nz: sc.nz });
    // (A plank across the top to step over on, the ladder's top: flush with its face, nothing over his head.)
    solids.push(box(-2.6, -1.4, -0.7, 0.12, sc.cap, sc.cap + 0.05, MAT.wood));
    // The walkway: planks along the inside of the hoarding, the loose ones drawn by themselves (they fall).
    for (let k = 0; k < 7; k++) {
      const u0 = -2.6 + k * SITEWAY.plank, b = box(u0, u0 + SITEWAY.plank, -wd - 0.15, -0.15, Y - 0.05, Y, MAT.wood);
      if (!SITEWAY.loose.includes(k)) { solids.push(b); continue; }
      const id = `site-plank${k}`, [px, pz] = W(u0 + SITEWAY.plank / 2, -0.15 - wd / 2);
      solids.push({ ...b, mat: MAT.hidden, part: id });
      props.push({ kind: 'looseplank', x: px, y: Y - 0.05, z: pz, yaw: -sc.yaw, w: SITEWAY.plank - 0.04, h: 0.05, d: wd, text: id });
      inter.push({ id, kind: 'looseplank', x: px, y: Y, z: pz, r: 0.6, zh: '跳板', en: 'Plank', data: { part: id } });
      feat('site:plank', px, Y, pz);
    }
    // Down: steps of planks, each a short drop below the last, the last a drop to the ground.
    const n = steps(sc);
    for (let k = 1; k <= n; k++) solids.push(box(4.4 + (k - 1) * SITEWAY.step, 4.4 + k * SITEWAY.step, -wd - 0.15, -0.15, Y - k * SITEWAY.step - 0.1, Y - k * SITEWAY.step, MAT.wood));
    // Its tubes, standards and a rail.
    for (const u of [-2.6, 0.9, 4.4].concat(Array.from({ length: n }, (_, k) => 4.4 + (k + 1) * SITEWAY.step))) for (const v of [-0.15, -wd - 0.15]) decor.push(box(u - 0.03, u + 0.03, v - 0.03, v + 0.03, base, Y + 1.05, MAT.metal));
    decor.push(box(-2.6, 4.4, -wd - 0.18, -wd - 0.12, Y + 1, Y + 1.05, MAT.metal));
    const [ox, oz] = W(-2, 1.2), [ex, ez] = W(4.4 + n * SITEWAY.step + 2.5, -2.5);
    feat('site:scaffold', ox, sc.lo, oz); feat('site:scaffoldWalk', W(-1, -0.8)[0], Y, W(-1, -0.8)[1]); feat('site:scaffoldEnd', W(4.4 + n * SITEWAY.step - 0.6, -0.8)[0], Y - n * SITEWAY.step, W(4.4 + n * SITEWAY.step - 0.6, -0.8)[1]); feat('site:scaffoldIn', ex, base, ez);
    teleports.push({ name: 'Construction site: scaffold', x: ox, y: sc.lo + 0.05, z: oz, yaw: atan2(sc.nx, sc.nz) });
  }

  // The crawl under the hoarding along the ditch (site.ts leaves the gap).
  if (site.ditch) {
    const p = site.ditch, { W } = frame(p), [ox, oz] = W(0, 2.5), [ix, iz] = W(0, -2.5);
    feat('site:ditch', ox, h(ox, oz), oz); feat('site:ditchIn', ix, base, iz);
    teleports.push({ name: 'Construction site: ditch', x: ox, y: h(ox, oz) + 0.05, z: oz, yaw: atan2(p.nx, p.nz) });
  }

  // The hoist: by the edge nearest a neighbour's flat roof that's a safe drop above its top landing, the landing reaching
  // out over the hoarding toward it, a gap left to jump.
  const edgeNear = (x: number, z: number) => {
    let best: { x: number; z: number; d: number } = { x, z, d: Infinity };
    poly.forEach(([ax, az], i) => { const [bx, bz] = poly[(i + 1) % poly.length], dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz; if (l < 0.01) return; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l)), qx = ax + dx * t, qz = az + dz * t, d = Math.hypot(x - qx, z - qz); if (d < best.d) best = { x: qx, z: qz, d }; });
    return best;
  };
  const roofs = plots.filter(q => !q.far && q.top - q.wall < 0.7 && q.wall - base > 8 && q.wall - base < 30 && !inside(poly, q.corners[0][0], q.corners[0][1])).map(q => {
    let best = { cx: 0, cz: 0, ex: 0, ez: 0, d: Infinity };
    for (const [cx, cz] of q.corners) { const e = edgeNear(cx, cz); if (e.d < best.d) best = { cx, cz, ex: e.x, ez: e.z, d: e.d }; }
    return { q, ...best };
  }).filter(r => r.d < 8 && r.d > 1).sort((a, b) => a.d - b.d);
  for (const r of roofs) {
    const ux = (r.cx - r.ex) / r.d, uz = (r.cz - r.ez) / r.d, hx = r.ex - ux * 1.6, hz = r.ez - uz * 1.6;
    if (!inside(poly, hx, hz) || !inside(poly, hx - ux * 1.5, hz - uz * 1.5)) continue;
    // (The corner a little in from the roof's edge: where he stands to jump.)
    const Yh = r.q.wall - SITEWAY.hoistDrop, reach = Math.max(1.6, Math.hypot(r.cx - hx, r.cz - hz) - SITEWAY.hoistGap), yaw = atan2(uz, ux);
    solids.push(solid(hx - 0.8, base, hz - 0.8, hx + 0.8, Yh - 0.25, hz + 0.8, MAT.metal));
    solids.push(turn([solid(hx - 0.9, Yh - 0.25, hz - 1, hx + reach, Yh, hz + 1, MAT.metal)], yaw, hx, hz)[0]);
    // The cage's frame on the mast, and its ladder down the far side.
    for (const [a, b] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) decor.push(solid(hx + a * 0.95 - 0.04, base, hz + b * 0.95 - 0.04, hx + a * 0.95 + 0.04, Yh + 1.1, hz + b * 0.95 + 0.04, MAT.tealMetal));
    climbables.push({ kind: 'ladder', x: hx - ux * 0.85, z: hz - uz * 0.85, y0: base, y1: Yh, nx: -ux, nz: -uz });
    const [gx, gz] = [hx - ux * 1.6 + uz * 1.4, hz - uz * 1.6 - ux * 1.4];
    inter.push({ id: 'site-hoist', kind: 'hoist', x: hx, y: Yh + 1, z: hz, r: 1.2, zh: '施工升降机', en: 'Construction hoist', data: { to: { x: gx, y: base + 0.05, z: gz } } });
    // (On the roof: a metre in from its corner, and a run-up back from it toward the roof's middle.)
    const mx = r.q.corners.reduce((a, c) => a + c[0], 0) / r.q.corners.length, mz = r.q.corners.reduce((a, c) => a + c[1], 0) / r.q.corners.length, md = Math.hypot(mx - r.cx, mz - r.cz) || 1;
    const run = Math.min(5, md * 0.6), sx = r.cx + ((mx - r.cx) / md) * run, sz = r.cz + ((mz - r.cz) / md) * run;
    feat('site:hoistRoof', r.cx + ((mx - r.cx) / md) * 1, r.q.wall, r.cz + ((mz - r.cz) / md) * 1); feat('site:hoistRun', sx, r.q.wall, sz);
    feat('site:hoist', hx + ux * (reach * 0.6), Yh, hz + uz * (reach * 0.6)); feat('site:hoistIn', gx, base, gz);
    teleports.push({ name: 'Construction site: hoist', x: sx, y: r.q.wall + 0.05, z: sz, yaw: atan2(-(hx - sx), -(hz - sz)) });
    break;
  }
  return { solids, decor, props, inter, climbables, cameras, features, teleports };
}
