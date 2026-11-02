// Anna's Map page (M5-06, U-096, DESIGN section 12): the whole city top-down from the start, north up, him in the
// middle: every building's footprint, the districts named, his hideouts. Where he's been (the 10 m cells round him,
// sim/automap.ts) it fills in: each building's type, the ways down. On the layer he's on: underground, the city
// dimmed over the tunnels he's walked. Over it, what the SDR heard (drone beats, docks: M5-08) and the routes of
// machines logged more than once (M5-07). The key places marked from the start, so he knows where to look (U-102).
import type { Game } from '../game';
import type { World, Plot, Inter } from '../world/world';
import type { BuildingType } from '../world/city/types';
import { clockText } from '../sim/clock';
import { MAP, LAYERS, layerAt } from '../sim/automap';
import { forward } from '../sim/move';
import type { Sighting } from '../sim/binoculars';
import { droneBeats } from '../sim/sdr';
import { districtOf } from '../sim/district';
import { dockTimes } from '../sim/units';
import { GEO } from '../world/geo';
import { DISTRICT_NAMES } from '../world/yuzhong/lots';
import { SECURE } from '../world/yuzhong/secure';

/** The canvas (px) and metres to a pixel. */
export const MAPV = { w: 520, h: 300, m: 1.25 };
/** Each type's colour, and a building whose type he doesn't know (or one that can't be entered). */
const TYPE: Record<BuildingType, [string, string, string]> = {
  residential: ['#9a8050', '住宅', 'homes'], office: ['#5a8aa8', '办公', 'offices'], clinic: ['#62a878', '诊所', 'clinics'],
  workshop: ['#b07838', '工坊', 'workshops'], military: ['#c04a36', '军事', 'military'], mall: ['#a8689a', '商场', 'malls'],
};
const UNKNOWN = '#16150f', SEALED = '#58544a';

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

/** The key places (U-102): the high-security sites, the construction site, the pier, the cableway, the metro
 *  stations, the Grand Tunnel and the air-raid shelter; where each is. */
const PLACES: [string, string, string][] = [
  ['Construction site', '工地', 'Construction site'], ['River-police pier: gangway', '水警码头', 'River-police pier'],
  ['Grand Tunnel entrance', '大隧道', 'Grand Tunnel'], ['Air-raid shelter', '防空洞', 'Air-raid shelter'],
];
const placesOf = new WeakMap<World, { x: number; z: number; zh: string; en: string }[]>();
export function keyPlaces(w: World) {
  let v = placesOf.get(w);
  if (v) return v;
  v = (w.secure ?? []).map(q => { const d = SECURE.find(x => x.id === q.id)!; return { x: q.x, z: q.z, zh: d.zh, en: d.en }; });
  for (const [name, zh, en] of PLACES) { const t = w.teleports.find(q => q.name === name); if (t) v.push({ x: t.x, z: t.z, zh, en }); }
  const cw = GEO.landmarks.cablewayNorth;
  if (cw && w.name === 'yuzhong') v.push({ x: cw.x, z: cw.z, zh: '长江索道', en: 'Yangtze cableway' });
  // (The metro stations, one mark each.)
  for (const t of w.teleports) if (t.name.startsWith('Metro ') && !t.name.startsWith('Metro station') && !t.name.startsWith('Metro tunnel') && !v.some(q => q.zh === `地铁${t.name.slice(6)}`)) v.push({ x: t.x, z: t.z, zh: `地铁${t.name.slice(6)}`, en: 'metro' });
  placesOf.set(w, v);
  return v;
}

/** Whether he's been within a cell of a box, at street level or above. */
function near(ex: Record<string, 1>, x0: number, z0: number, x1: number, z1: number) {
  const c = MAP.cell;
  for (let i = Math.floor(x0 / c) - 1; i <= Math.floor(x1 / c) + 1; i++) for (let j = Math.floor(z0 / c) - 1; j <= Math.floor(z1 / c) + 1; j++) if (ex[`${i},${j},0`] || ex[`${i},${j},1`]) return true;
  return false;
}

/** The buildings he knows the type of, worked out again as he explores more. */
let known = { w: null as World | null, n: -1, set: new Set<Plot>() };
function knownPlots(g: Game) {
  const ex = g.state.explored ?? {}, n = Object.keys(ex).length;
  if (known.w !== g.world || known.n !== n) known = { w: g.world, n, set: new Set(prep(g.world).plots.filter(b => near(ex, b.x0, b.z0, b.x1, b.z1)).map(b => b.p)) };
  return known.set;
}

/** How many buildings were in view at the last drawing, and how many of those he knows. */
let seen = { inView: 0, known: 0 };

/** The map drawn. */
export function drawMap(c: HTMLCanvasElement, g: Game) {
  const s = g.state, w = g.world, p = s.player.pos, here = layerAt(w, p.x, p.y, p.z), ex = s.explored ?? {}, ctx = c.getContext('2d'), out = { inView: 0, known: 0 };
  if (!ctx) return;
  seen = out;
  const { w: W, h: H, m } = MAPV, X = (x: number) => W / 2 + (x - p.x) / m, Z = (z: number) => H / 2 + (z - p.z) / m;
  const vx0 = p.x - (W / 2) * m, vx1 = p.x + (W / 2) * m, vz0 = p.z - (H / 2) * m, vz1 = p.z + (H / 2) * m;
  const inView = (x: number, z: number) => x > vx0 && x < vx1 && z > vz0 && z < vz1;
  ctx.fillStyle = '#080908'; ctx.fillRect(0, 0, W, H);
  ctx.font = "11px 'Courier New', monospace"; ctx.textBaseline = 'top'; ctx.lineWidth = 1;
  // The buildings: all of them, those he knows filled in by their type.
  const kn = knownPlots(g);
  ctx.globalAlpha = here === -1 ? 0.35 : 1;
  for (const b of prep(w).plots) {
    if (b.x1 < vx0 || b.x0 > vx1 || b.z1 < vz0 || b.z0 > vz1) continue;
    out.inView++;
    const k = kn.has(b.p);
    if (k) out.known++;
    ctx.fillStyle = !k ? UNKNOWN : b.p.type ? TYPE[b.p.type][0] : SEALED;
    ctx.beginPath(); b.p.corners.forEach(([x, z], i) => (i ? ctx.lineTo(X(x), Z(z)) : ctx.moveTo(X(x), Z(z)))); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3a3326'; ctx.stroke();
  }
  // Underground: the tunnels he's walked.
  if (here === -1) {
    ctx.globalAlpha = 1; ctx.fillStyle = '#9a8250';
    const c0 = Math.floor(vx0 / MAP.cell), c1 = Math.floor(vx1 / MAP.cell), r0 = Math.floor(vz0 / MAP.cell), r1 = Math.floor(vz1 / MAP.cell), cs = MAP.cell / m;
    for (let i = c0; i <= c1; i++) for (let j = r0; j <= r1; j++) if (ex[`${i},${j},-1`]) ctx.fillRect(X(i * MAP.cell), Z(j * MAP.cell), cs, cs);
  }
  ctx.globalAlpha = 1;
  // The ways down he's come across: a ring each.
  ctx.strokeStyle = '#c8a96a';
  for (const i of prep(w).grates) if (inView(i.x, i.z) && near(ex, i.x, i.z, i.x, i.z)) { ctx.beginPath(); ctx.arc(X(i.x), Z(i.z), 2.5, 0, Math.PI * 2); ctx.stroke(); }
  // The districts, named.
  ctx.fillStyle = '#7d7563';
  for (const [k, [zh, en]] of Object.entries(DISTRICT_NAMES)) { const L = GEO.landmarks[k]; if (L && inView(L.x, L.z)) ctx.fillText(`${zh} ${en}`, X(L.x) - 30, Z(L.z) - 6); }
  // The key places (U-102): a diamond each, named.
  // (Off the map: at its edge, the way it lies, and how far.)
  for (const q of keyPlaces(w)) {
    if (!inView(q.x, q.z)) {
      const dx = q.x - p.x, dz = q.z - p.z, k = Math.min((W / 2 - 8) * m / Math.max(1e-6, Math.abs(dx)), (H / 2 - 8) * m / Math.max(1e-6, Math.abs(dz)));
      const ex = W / 2 + (dx * k) / m, ez = H / 2 + (dz * k) / m;
      ctx.fillStyle = '#a87838'; ctx.beginPath(); ctx.arc(ex, ez, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a89070'; ctx.fillText(`${q.zh} ${Math.round(Math.hypot(dx, dz))}m`, Math.min(W - 70, Math.max(2, ex - 30)), Math.min(H - 12, Math.max(14, ez + (ez > H / 2 ? -14 : 4))));
      continue;
    }
    ctx.fillStyle = '#e8a04a'; ctx.strokeStyle = '#080908';
    ctx.beginPath(); ctx.moveTo(X(q.x), Z(q.z) - 5); ctx.lineTo(X(q.x) + 5, Z(q.z)); ctx.lineTo(X(q.x), Z(q.z) + 5); ctx.lineTo(X(q.x) - 5, Z(q.z)); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8c090'; ctx.fillText(`${q.zh} ${q.en}`, X(q.x) + 7, Z(q.z) - 5);
  }
  // His hideouts.
  for (const h of s.shelters) { ctx.fillStyle = '#ffd890'; ctx.strokeStyle = '#080908'; ctx.beginPath(); ctx.moveTo(X(h.x), Z(h.z) - 5); ctx.lineTo(X(h.x) + 4, Z(h.z) + 3); ctx.lineTo(X(h.x) - 4, Z(h.z) + 3); ctx.closePath(); ctx.fill(); ctx.stroke(); }
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
  // Him, and which way he faces; the layer he's on; a scale.
  const f = forward(s.player.yaw);
  ctx.fillStyle = ctx.strokeStyle = '#ffd890'; ctx.fillRect(W / 2 - 2, H / 2 - 2, 4, 4);
  ctx.beginPath(); ctx.moveTo(W / 2, H / 2); ctx.lineTo(W / 2 + f.x * 10, H / 2 + f.z * 10); ctx.stroke();
  const L = LAYERS.find(q => q.l === here)!;
  ctx.fillStyle = '#c8a96a'; ctx.fillText(`${L.zh} ${L.en} · 北 N ↑`, 4, 4);
  ctx.strokeStyle = '#7d7563'; ctx.beginPath(); ctx.moveTo(W - 4 - 100 / m, H - 8); ctx.lineTo(W - 4, H - 8); ctx.stroke(); ctx.fillStyle = '#7d7563'; ctx.fillText('100 m', W - 4 - 100 / m, H - 22);
}

/** Under the map: what the colours are, and what he's explored. */
export function mapKey(g: Game): string {
  const n = Object.keys(g.state.explored ?? {}).length;
  return `<div>${Object.values(TYPE).map(([c, zh, en]) => `<i style="color:${c}">■</i> ${zh} <span>${en}</span>`).join(' ')} <i style="color:${SEALED}">■</i> <span>sealed</span> <i style="color:#c8a96a">○</i> <span>way down</span> <i style="color:#ffd890">▲</i> <span>hideout</span> <i style="color:#e8a04a">◆</i> <span>key place</span></div>` +
    `<div data-k="cells">已探索 ${n} 格 <span>${n} cells explored</span> · <span data-k="known">${seen.known} of ${seen.inView} buildings here known</span></div>` + docks(g);
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
