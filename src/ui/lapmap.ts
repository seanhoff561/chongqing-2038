// Anna's Map page (M5-06, U-104, DESIGN section 11): the whole city top-down from the start, north up: every
// building's footprint coloured by its type, the districts named, him. Where he's been (the 10 m cells round him,
// sim/automap.ts): the ways down he's come across; underground, the city dimmed over the tunnels he's walked. Over it,
// what the SDR heard (drone beats, docks: M5-08), the routes of machines logged more than once (M5-07), the key places
// he knows of (M10-40) and his own marks (M10-14). His hideouts aren't marked: he remembers them.
import type { Game } from '../game';
import type { World, Plot, Inter } from '../world/world';
import type { BuildingType } from '../world/city/types';
import { clockText } from '../sim/clock';
import { MAP, LAYERS, layerAt } from '../sim/automap';
import { forward } from '../sim/move';
import type { Sighting } from '../sim/binoculars';
import type { Mark } from '../sim/types';
import { droneBeats } from '../sim/sdr';
import { districtOf } from '../sim/district';
import { dockTimes } from '../sim/units';
import { GEO } from '../world/geo';
import { keyPlaces, isNew } from '../sim/places';
import { DISTRICT_NAMES } from '../world/yuzhong/lots';

/** The canvas (px), metres to a pixel standing, and the nearest and farthest it zooms sitting (M10-14). */
export const MAPV = { w: 520, h: 276, m: 1.25, near: 0.25, far: 8 };
/** What the map's looking at: its middle (world metres) and metres to a pixel. */
export type MapView = { cx: number; cz: number; m: number; hi?: { x: number; z: number } };
/** His marks' colour (ice blue, U-104). */
export const MARK = '#bfe6f5';
/** Each type's colour, and a building that can't be entered. */
const TYPE: Record<BuildingType, [string, string, string]> = {
  residential: ['#9a8050', '住宅', 'homes'], office: ['#5a8aa8', '办公', 'offices'], clinic: ['#62a878', '诊所', 'clinics'],
  workshop: ['#b07838', '工坊', 'workshops'], military: ['#c04a36', '军事', 'military'], mall: ['#a8689a', '商场', 'malls'],
};
const SEALED = '#58544a';

/** Each world's buildings with their boxes, and its ways down, found once. */
const prepped = new WeakMap<World, { plots: { p: Plot; x0: number; z0: number; x1: number; z1: number }[]; grates: Inter[] }>();
function prep(w: World) {
  let v = prepped.get(w);
  if (!v) {
    const plots = w.plots.filter(p => !p.far).map(p => { const xs = p.corners.map(c => c[0]), zs = p.corners.map(c => c[1]); return { p, x0: Math.min(...xs), z0: Math.min(...zs), x1: Math.max(...xs), z1: Math.max(...zs) }; });
    prepped.set(w, (v = { plots, grates: w.inter.filter(i => i.kind === 'grate') }));
  }
  return v;
}

/** Whether he's been within a cell of a box, at street level or above. */
function near(ex: Record<string, 1>, x0: number, z0: number, x1: number, z1: number) {
  const c = MAP.cell;
  for (let i = Math.floor(x0 / c) - 1; i <= Math.floor(x1 / c) + 1; i++) for (let j = Math.floor(z0 / c) - 1; j <= Math.floor(z1 / c) + 1; j++) if (ex[`${i},${j},0`] || ex[`${i},${j},1`]) return true;
  return false;
}

/** The map drawn, looking at `v` (standing: him, at MAPV.m). */
export function drawMap(c: HTMLCanvasElement, g: Game, v: MapView) {
  const s = g.state, w = g.world, p = s.player.pos, here = layerAt(w, p.x, p.y, p.z), ex = s.explored ?? {}, ctx = c.getContext('2d');
  if (!ctx) return;
  const { w: W, h: H } = MAPV, { cx, cz, m } = v, X = (x: number) => W / 2 + (x - cx) / m, Z = (z: number) => H / 2 + (z - cz) / m;
  const vx0 = cx - (W / 2) * m, vx1 = cx + (W / 2) * m, vz0 = cz - (H / 2) * m, vz1 = cz + (H / 2) * m;
  const inView = (x: number, z: number) => x > vx0 && x < vx1 && z > vz0 && z < vz1;
  ctx.fillStyle = '#061016'; ctx.fillRect(0, 0, W, H);
  ctx.font = "11px 'Courier New', monospace"; ctx.textBaseline = 'top'; ctx.lineWidth = 1;
  // The buildings: every one, by its type (U-104).
  ctx.globalAlpha = here === -1 ? 0.35 : 1;
  for (const b of prep(w).plots) {
    if (b.x1 < vx0 || b.x0 > vx1 || b.z1 < vz0 || b.z0 > vz1) continue;
    ctx.fillStyle = b.p.type ? TYPE[b.p.type][0] : SEALED;
    ctx.beginPath(); b.p.corners.forEach(([x, z], i) => (i ? ctx.lineTo(X(x), Z(z)) : ctx.moveTo(X(x), Z(z)))); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1d2c34'; ctx.stroke();
  }
  // Underground: the tunnels he's walked.
  if (here === -1) {
    ctx.globalAlpha = 1; ctx.fillStyle = '#4f7a8c';
    const c0 = Math.floor(vx0 / MAP.cell), c1 = Math.floor(vx1 / MAP.cell), r0 = Math.floor(vz0 / MAP.cell), r1 = Math.floor(vz1 / MAP.cell), cs = MAP.cell / m;
    for (let i = c0; i <= c1; i++) for (let j = r0; j <= r1; j++) if (ex[`${i},${j},-1`]) ctx.fillRect(X(i * MAP.cell), Z(j * MAP.cell), cs, cs);
  }
  ctx.globalAlpha = 1;
  // The ways down he's come across: a ring each.
  ctx.strokeStyle = '#7aa6b8';
  for (const i of prep(w).grates) if (inView(i.x, i.z) && near(ex, i.x, i.z, i.x, i.z)) { ctx.beginPath(); ctx.arc(X(i.x), Z(i.z), 2.5, 0, Math.PI * 2); ctx.stroke(); }
  // The districts, named.
  ctx.fillStyle = '#7aa6b8';
  for (const [k, [zh, en]] of Object.entries(DISTRICT_NAMES)) { const L = GEO.landmarks[k]; if (L && inView(L.x, L.z)) ctx.fillText(`${zh} ${en}`, X(L.x) - 30, Z(L.z) - 6); }
  // The key places he knows of (M10-40): a diamond each, named; one new since he last had the map up ringed.
  // (Off the map: at its edge, the way it lies, and how far.)
  for (const q of keyPlaces(w)) {
    if (s.known?.[q.id] === undefined) continue;
    if (!inView(q.x, q.z)) {
      const dx = q.x - cx, dz = q.z - cz, k = Math.min((W / 2 - 8) * m / Math.max(1e-6, Math.abs(dx)), (H / 2 - 8) * m / Math.max(1e-6, Math.abs(dz)));
      const ex = W / 2 + (dx * k) / m, ez = H / 2 + (dz * k) / m;
      ctx.fillStyle = '#a87838'; ctx.beginPath(); ctx.arc(ex, ez, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a89070'; ctx.fillText(`${q.zh} ${Math.round(Math.hypot(q.x - p.x, q.z - p.z))}m`, Math.min(W - 70, Math.max(2, ex - 30)), Math.min(H - 12, Math.max(14, ez + (ez > H / 2 ? -14 : 4))));
      continue;
    }
    ctx.fillStyle = '#e8a04a'; ctx.strokeStyle = '#061016';
    ctx.beginPath(); ctx.moveTo(X(q.x), Z(q.z) - 5); ctx.lineTo(X(q.x) + 5, Z(q.z)); ctx.lineTo(X(q.x), Z(q.z) + 5); ctx.lineTo(X(q.x) - 5, Z(q.z)); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8c090'; ctx.fillText(`${q.zh} ${q.en}`, X(q.x) + 7, Z(q.z) - 5);
    if (isNew(s, q.id)) { ctx.strokeStyle = MARK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X(q.x), Z(q.z), 9 + 2 * Math.sin(s.tick / 8), 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1; }
  }
  const line = (pts: { x: number; z: number }[]) => { ctx.beginPath(); pts.forEach((q, k) => (k ? ctx.lineTo(X(q.x), Z(q.z)) : ctx.moveTo(X(q.x), Z(q.z)))); ctx.stroke(); };
  // The drones' beats and docks of the districts she's heard on the SDR (M5-08).
  for (const d of Object.keys(s.sdr?.heard ?? {})) for (const b of droneBeats(w, d)) {
    const P = w.patrols[b];
    ctx.strokeStyle = '#4f7aa0'; line([...P.pts, P.pts[0]]);
    if (P.dock !== undefined) { const k = w.docks[P.dock]; ctx.fillStyle = '#7fa8cc'; ctx.fillRect(X(k.x) - 2.5, Z(k.z) - 2.5, 5, 5); }
  }
  // The machines he's logged more than once (M5-07): their routes through where they were seen; each sighting a dot.
  const by = new Map<number, Sighting[]>();
  for (const x of s.sightings ?? []) by.set(x.u, [...(by.get(x.u) ?? []), x]);
  ctx.fillStyle = ctx.strokeStyle = '#b0503c';
  for (const xs of by.values()) { if (xs.length > 1) line(xs); for (const x of xs) ctx.fillRect(X(x.x) - 1.5, Z(x.z) - 1.5, 3, 3); }
  // His own marks (M10-14); a place picked out from the Logs, ringed (M10-16).
  drawMarks(ctx, s.marks ?? [], X, Z);
  if (v.hi) { ctx.strokeStyle = MARK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(v.hi.x), Z(v.hi.z), 9, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1; }
  // Him, and which way he faces; the layer he's on; a scale.
  const f = forward(s.player.yaw), hx = X(p.x), hz = Z(p.z);
  ctx.fillStyle = ctx.strokeStyle = '#e6f7ff'; ctx.fillRect(hx - 2, hz - 2, 4, 4);
  ctx.beginPath(); ctx.moveTo(hx, hz); ctx.lineTo(hx + f.x * 10, hz + f.z * 10); ctx.stroke();
  const L = LAYERS.find(q => q.l === here)!;
  ctx.fillStyle = '#bfe6f5'; ctx.fillText(`${L.zh} ${L.en} · 北 N ↑`, 4, 4);
  ctx.strokeStyle = '#7aa6b8'; ctx.beginPath(); ctx.moveTo(W - 4 - 100 / m, H - 8); ctx.lineTo(W - 4, H - 8); ctx.stroke(); ctx.fillStyle = '#7aa6b8'; ctx.fillText('100 m', W - 4 - 100 / m, H - 22);
}

/** His marks: a pin, a straight line, or words. */
function drawMarks(ctx: CanvasRenderingContext2D, marks: Mark[], X: (x: number) => number, Z: (z: number) => number) {
  ctx.strokeStyle = ctx.fillStyle = MARK; ctx.lineWidth = 1.5;
  for (const k of marks) {
    const x = X(k.x), z = Z(k.z);
    if (k.x2 !== undefined && k.z2 !== undefined) { ctx.beginPath(); ctx.moveTo(x, z); ctx.lineTo(X(k.x2), Z(k.z2)); ctx.stroke(); }
    else if (k.text) ctx.fillText(k.text, x, z - 6);
    else { ctx.beginPath(); ctx.moveTo(x, z); ctx.lineTo(x, z - 7); ctx.stroke(); ctx.beginPath(); ctx.arc(x, z - 9, 2.5, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.lineWidth = 1;
}

/** Under the map: what the colours are, and what he's explored. */
export function mapKey(g: Game): string {
  const n = Object.keys(g.state.explored ?? {}).length;
  return `<div>${Object.values(TYPE).map(([c, zh, en]) => `<i style="color:${c}">■</i> ${zh} <span>${en}</span>`).join(' ')} <i style="color:${SEALED}">■</i> <span>sealed</span> <i style="color:#7aa6b8">○</i> <span>way down</span> <i style="color:#e8a04a">◆</i> <span>key place</span></div>` +
    `<div data-k="cells">已探索 ${n} 格 <span>${n} cells explored</span></div>` + docks(g);
}

/** Under the map (M5-08): the drones of the district he's in, if she's heard them: when each is next home on its dock
 *  and off it again, soonest first. */
function docks(g: Game): string {
  const s = g.state, p = s.player.pos, d = districtOf(p.x, p.z);
  if (!s.sdr?.heard[d]) return '';
  const beats = new Set(droneBeats(g.world, d)), now = s.time;
  const rows = s.units.filter(u => !u.dead && beats.has(u.patrol)).map(u => ({ u, w: dockTimes(g.world, u, now) })).filter(r => r.w).sort((a, b) => a.w!.back - b.w!.back).slice(0, 4);
  return `<div data-k="docks">无人机 Drones · ${DISTRICT_NAMES[d]?.[0] ?? d}: ` + rows.map(({ u, w }) => (w!.back <= now ? `#${u.id} 在停机坪到 <span>docked till</span> ${clockText(w!.out)}` : `#${u.id} 回 <span>back</span> ${clockText(w!.back)} · 出 <span>out</span> ${clockText(w!.out)}`)).join(' · ') + `</div>`;
}
