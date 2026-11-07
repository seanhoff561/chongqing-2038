// Set dressing built from code by prop kind.
import * as THREE from 'three';
import type { Prop } from '../world/world';
import { material, night, iceNeonMap, ICE_NIGHT } from './materials';
import { MAT } from '../world/mats';
import { textTexture } from './textures';
import { mergeGeometries } from './view';
import { HANDLE } from '../world/city/access';
import { ChunkMerger } from './world-mesh';
import { libProp } from './props-lib';
import { tickSigns } from './signs';
import { siteBuilders } from './siteprops';
import { signBuilders } from './redsigns';

const lam = (color: number, emissive = 0) => new THREE.MeshLambertMaterial({ color, emissive });
const box = (w: number, h: number, d: number, x: number, y: number, z: number) => new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z);

type Builder = (p: Prop) => THREE.Object3D;

/** Brick vault over the chamber: walls to 1.8 m, an elliptical vault to the crown, ribs every 2.5 m. */
function arches(p: Prop): THREE.Object3D {
  const g = new THREE.Group();
  const L = p.w!, W = p.d!, spring = 1.8, rise = p.h! - spring;
  const pos: number[] = [], nor: number[] = [], uv: number[] = [];
  const seg = 12;
  for (let i = 0; i < seg; i++) {
    const a0 = (Math.PI * i) / seg, a1 = (Math.PI * (i + 1)) / seg;
    const z0 = Math.cos(a0) * W / 2, y0 = spring + Math.sin(a0) * rise, z1 = Math.cos(a1) * W / 2, y1 = spring + Math.sin(a1) * rise;
    const nz = -(Math.cos(a0) + Math.cos(a1)) / 2, ny = -(Math.sin(a0) + Math.sin(a1)) / 2;
    // The vault opens where the vent shaft rises.
    const spans: [number, number][] = p.gap && Math.abs(z0) < 1.3 && Math.abs(z1) < 1.3 ? [[0, p.gap[0]], [p.gap[1], L]] : [[0, L]];
    for (const [a, b] of spans) {
      const quad = [[a, y0, z0], [b, y1, z1], [b, y0, z0], [a, y0, z0], [a, y1, z1], [b, y1, z1]];
      const u = [[a, i], [b, i + 1], [b, i], [a, i], [a, i + 1], [b, i + 1]];
      quad.forEach((q, k) => { pos.push(q[0], q[1], q[2]); nor.push(0, ny, nz); uv.push(u[k][0] / 2, u[k][1] * 0.35); });
    }
  }
  // Brick wall facings from floor to the springing line.
  for (const side of [-1, 1]) {
    const z = side * (W / 2 - 0.01);
    const quad = side < 0 ? [[0, 0, z], [L, 0, z], [L, spring, z], [0, 0, z], [L, spring, z], [0, spring, z]] : [[L, 0, z], [0, 0, z], [0, spring, z], [L, 0, z], [0, spring, z], [L, spring, z]];
    for (const q of quad) { pos.push(q[0], q[1], q[2]); nor.push(0, 0, -side); uv.push(q[0] / 2, q[1] / 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const vault = new THREE.Mesh(geo, material(MAT.brick));
  g.add(vault);
  const ribs: THREE.BufferGeometry[] = [];
  for (let x = 1.25; x < L; x += 2.5)
    for (let i = 0; i < seg; i++) {
      const a = (Math.PI * (i + 0.5)) / seg;
      const r = new THREE.BoxGeometry(0.25, 0.12, (Math.PI * W) / 2 / seg + 0.05);
      r.rotateX(-a + Math.PI / 2).translate(x, spring + Math.sin(a) * rise - 0.04, Math.cos(a) * (W / 2 - 0.04));
      ribs.push(r);
    }
  g.add(new THREE.Mesh(mergeGeometries(ribs), material(MAT.brick)));
  return g;
}

function lamp(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.05, 10).translate(0, 0.025, 0), lam(0x333333)));
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 10).translate(0, 0.12, 0), lam(0xffd9a0, 0xffb060)));
  const light = new THREE.PointLight(0xffb870, 6, 14, 1.6);
  light.position.y = 0.3;
  g.add(light);
  return g;
}

/** The neon round the start hideout (U-107): canvas text, optionally vertical, ice blue and lit only after dark. */
function neon(p: Prop): THREE.Object3D {
  const vertical = (p.h ?? 0) > (p.w ?? 1);
  const text = vertical ? p.text!.split('').join('\n') : p.text!;
  const fg = '#ffffff';
  const g = new THREE.Group();
  if (vertical) {
    const chars = p.text!.split('');
    chars.forEach((ch, i) => {
      const { tex } = textTexture(ch, { fg, size: 64, pad: 6 });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(p.w!, p.w!), iceNeonMap(tex));
      m.position.y = -i * p.w! * 1.05;
      g.add(m);
    });
  } else {
    const { tex, aspect } = textTexture(text, { fg, size: 64, pad: 8 });
    g.add(new THREE.Mesh(new THREE.PlaneGeometry(p.h! * aspect, p.h!), iceNeonMap(tex)));
  }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x0a0a0c }));
  back.position.z = -0.03;
  g.add(back);
  g.userData.fit = () => {
    const bb = new THREE.Box3().setFromObject(g.children[0]);
    if (vertical) { back.scale.set(p.w! * 1.2, p.text!.length * p.w! * 1.05 + 0.1, 1); back.position.y = -(p.text!.length - 1) * p.w! * 0.525; }
    else back.scale.set(bb.max.x - bb.min.x + 0.2, p.h! * 1.2, 1);
  };
  g.userData.fit();
  return g;
}

/** Scripted machines crossing over the hideout grate: decor only, they cannot perceive anything. */
function patrolDecor(): THREE.Object3D {
  const g = new THREE.Group();
  const drone = new THREE.Group();
  drone.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.6), lam(0x222428)));
  for (const [x, z] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) drone.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 12).translate(x, 0.1, z), lam(0x555555)));
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xe8f0ff }));
  led.position.y = -0.1;
  drone.add(led);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.5, 14, 16, 1, true).translate(0, -7, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  drone.add(beam);
  const bot = new THREE.Group();
  bot.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 1.1).translate(0, 0.65, 0), lam(0x2e3034)));
  for (const [x, z] of [[-0.25, -0.4], [0.25, -0.4], [-0.25, 0.4], [0.25, 0.4]]) bot.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.08).translate(x, 0.27, z), lam(0x3a3c40)));
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.05).translate(0, 0.75, -0.58), new THREE.MeshBasicMaterial({ color: 0xe8f0ff }));
  bot.add(eye);
  g.add(drone, bot);
  g.userData.tick = (t: number) => {
    const a = t * 0.15;
    drone.position.set(Math.sin(a) * 18, 9 + Math.sin(t * 0.6) * 0.5, Math.sin(a * 2) * 5);
    const k = ((t * 0.06) % 1) * 2 - 1;
    bot.position.set(k * 22, 0, 1.6);
    bot.rotation.y = -Math.PI / 2;
    for (let i = 1; i <= 4; i++) bot.children[i].rotation.x = Math.sin(t * 6 + i * Math.PI / 2) * 0.4;
  };
  g.userData.always = true;
  return g;
}

/** The factory (M3-57b): a stack's red warning light; a floodlight's beam from its mast down onto a gate. */
const BEACON = new THREE.MeshBasicMaterial({ color: 0xff2414 });
const FLOOD = new THREE.MeshBasicMaterial({ color: 0xdfeaff, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });

const builders: Record<string, Builder> = {
  ...siteBuilders,
  ...signBuilders,
  arches,
  beacon: () => new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), BEACON),
  floodlight: () => new THREE.Mesh(new THREE.ConeGeometry(4.5, 15, 16, 1, true).translate(0, -7.5, 0).rotateX(-0.63), FLOOD),
  lamp,
  neon,
  patrolDecor,
  stilts: p => {
    const parts: THREE.BufferGeometry[] = [];
    const o = p.w! / 2 - 0.1;
    for (const [x, z] of [[-o, -o], [o, -o], [-o, o], [o, o]]) parts.push(new THREE.BoxGeometry(0.1, p.h!, 0.1).translate(x, p.h! / 2, z));
    return new THREE.Mesh(mergeGeometries(parts), material(MAT.metal));
  },
  // The alley's neon light, bright enough to read the alley by after dark (U-050), ice blue and out by day (U-107).
  // (Its reach kept to the alley: a point light shines through rock.)
  neonGlow: () => {
    const l = new THREE.PointLight(ICE_NIGHT.getHex(), 0, 11, 1.3);
    l.userData.tick = () => { l.intensity = 14 * Math.max(0, (night.k - 0.35) / 0.65); };
    l.userData.always = true;
    return l;
  },
  // The vent's light into the chamber under it (M4-41, U-050): daylight down the shaft by day (more with the grate up and
  // the bags off it), the alley's ice-blue neon by night flooding the chamber, and a beam of it down the shaft (M10-52);
  // p.h the shaft's height.
  ventlight: p => {
    const g = new THREE.Group(), light = new THREE.PointLight(0xe8eeff, 0, 22, 1.5), h = p.h!;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.0, h, 12, 1, true).translate(0, h / 2, 0),
      new THREE.MeshBasicMaterial({ color: 0xe8eeff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    light.position.y = 2.5;
    g.add(light, beam);
    const day = new THREE.Color(0xe8eeff), neon = new THREE.Color(0xbfe6f5);
    g.userData.tick = (_t: number, open: Record<string, boolean>) => {
      const k = night.k, up = open[p.text!] ? 1.6 : 1;
      light.color.copy(day).lerp(neon, k);
      light.intensity = ((1 - k) * 6 + k * 5) * up;
      beam.material.color.copy(light.color);
      beam.material.opacity = ((1 - k) * 0.07 + k * 0.06) * up;
    };
    g.userData.always = true;
    return g;
  },
  mattress: () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(box(2.0, 0.16, 1.1, 0, -0.16, 0), lam(0x5d5546)));
    g.add(new THREE.Mesh(box(0.5, 0.1, 0.8, -0.7, 0, 0), lam(0x7a7262)));
    g.add(new THREE.Mesh(box(1.2, 0.04, 1.05, 0.35, 0, 0.02), lam(0x3d4a52)));
    return g;
  },
  workbench: () => {
    const g = new THREE.Group();
    const wood = lam(0x5a4632), steel = lam(0x55595c);
    g.add(new THREE.Mesh(box(2.4, 0.06, 0.75, 0, -0.06, 0), wood));
    for (const [x, z] of [[-1.1, -0.3], [1.1, -0.3], [-1.1, 0.3], [1.1, 0.3]]) g.add(new THREE.Mesh(box(0.06, 0.84, 0.06, x, -0.9, z), steel));
    g.add(new THREE.Mesh(box(0.2, 0.12, 0.15, 0.95, 0, -0.2), steel));
    g.add(new THREE.Mesh(box(0.35, 0.03, 0.25, -0.1, 0, 0.05), lam(0x2a3a2a)));
    g.add(new THREE.Mesh(box(0.25, 0.08, 0.1, 0.4, 0, 0.15), lam(0x8a2a20)));
    return g;
  },
  crate: p => new THREE.Mesh(box(p.w!, p.h!, p.d!, 0, 0, 0), material(MAT.crate)),
  carbattery: () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(box(0.3, 0.19, 0.18, 0, 0, 0), lam(0x1a1a1a)));
    g.add(new THREE.Mesh(box(0.03, 0.03, 0.03, -0.1, 0.19, 0), lam(0xaa2020)));
    g.add(new THREE.Mesh(box(0.03, 0.03, 0.03, 0.1, 0.19, 0), lam(0x202020)));
    return g;
  },
  inverter: () => new THREE.Mesh(box(0.22, 0.08, 0.14, 0, 0, 0), lam(0x6a6e70)),
  rubble: p => {
    // (Its stones one mesh: nine draw calls a fall drawn across the city were a tenth of the budget, M9-02.)
    const parts: THREE.BufferGeometry[] = [], at = new THREE.Object3D();
    for (let i = 0; i < 9; i++) {
      const r = 0.25 + ((i * 37) % 10) / 25;
      at.position.set(((i * 53) % 10) / 10 * p.w! - p.w! / 2, r * 0.7 + ((i * 17) % 5) / 6 * (p.h! - r), ((i * 29) % 7) / 7 * 0.8 - 0.4);
      at.rotation.set(i, i * 2, i * 3);
      at.updateMatrix();
      parts.push(new THREE.DodecahedronGeometry(r, 0).applyMatrix4(at.matrix));
    }
    const m = new THREE.Mesh(mergeGeometries(parts), material(MAT.stone));
    if (!p.text) return m;
    // A fall that's cleared (M4-24): gone once its interactable is open.
    const g = new THREE.Group();
    g.add(m);
    g.userData.tick = (_t: number, open: Record<string, boolean>) => { m.visible = !open[p.text!]; };
    return g;
  },
  grate: p => {
    const parts: THREE.BufferGeometry[] = [];
    const n = Math.round(p.w! / 0.12);
    for (let i = 0; i <= n; i++) parts.push(new THREE.BoxGeometry(0.03, 0.06, p.w!).translate(-p.w! / 2 + (i / n) * p.w!, 0, 0));
    for (const z of [-p.w! / 2, 0, p.w! / 2]) parts.push(new THREE.BoxGeometry(p.w!, 0.07, 0.05).translate(0, 0, z));
    const m = new THREE.Mesh(mergeGeometries(parts), lam(0x2c2e30));
    if (!p.text) return m;
    // One that opens (M3-72): it swings up on its hinges along its -x edge as its interactable opens.
    const g = new THREE.Group(), hinge = new THREE.Group();
    hinge.position.x = -p.w! / 2;
    m.position.x = p.w! / 2;
    hinge.add(m);
    g.add(hinge);
    g.userData.tick = (_t: number, open: Record<string, boolean>) => { const want = open[p.text!] ? 1.75 : 0; hinge.rotation.z += (want - hinge.rotation.z) * 0.12; };
    return g;
  },
  // A steel trapdoor or roof hatch (M3-83): a plate with a lip, swinging up on its -x edge as its interactable opens.
  hatch: p => {
    const w = p.w!, plate = mergeGeometries([new THREE.BoxGeometry(w, 0.04, w), new THREE.BoxGeometry(0.06, 0.04, 0.16).translate(w * 0.42, 0.04, 0)]);
    const g = new THREE.Group(), hinge = new THREE.Group(), m = new THREE.Mesh(plate, lam(0x3a3836));
    hinge.position.x = -w / 2;
    m.position.x = w / 2;
    hinge.add(m);
    g.add(hinge);
    g.userData.tick = (_t: number, open: Record<string, boolean>) => { const want = open[p.text!] ? 1.75 : 0; hinge.rotation.z += (want - hinge.rotation.z) * 0.12; };
    return g;
  },
  // Rubbish bags heaped over the start hideout's grate (M3-72): shoved off to its +x side while it's open.
  cover: p => {
    const g = new THREE.Group(), heap = libProp({ ...p, kind: 'bags' })!;
    g.add(heap);
    g.userData.tick = (_t: number, open: Record<string, boolean>) => { const want = open[p.text!] ? 2.4 : 0; heap.position.x += (want - heap.position.x) * 0.12; };
    return g;
  },
  graffiti: p => {
    const { tex, aspect } = textTexture(p.text!, { fg: 'rgba(210,205,190,0.75)', size: 44, font: '"Noto Sans CJK SC", sans-serif' });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5 * aspect, 0.5), new THREE.MeshLambertMaterial({ map: tex, transparent: true }));
    return m;
  },
};

type Tick = (t: number, open: Record<string, boolean>) => void;
/** Each frame's animation (`changed` whether something in the world opened or shut since the last frame), returning
 *  whether it's still moving (so wants the next frame whatever happens). */
type Ticker = (t: number, open: Record<string, boolean>, changed: boolean) => boolean;
const ticking: Ticker[] = [];
/** Those still moving after the last frame that looked at them all. */
const busy: Ticker[] = [];
/** Frames a prop following the world state (a grate, a gate sliding) is animated after a change: it has eased home. */
const SETTLE = 150;
/** The world state's open things as tickProps last saw them. */
let seen: Record<string, boolean> | null = null;
const was = new Map<string, boolean>();
/** Whether anything opened or shut since the last frame (so the thousands of doors and panes needn't be looked at
 *  every frame: M3-53). */
function openChanged(open: Record<string, boolean>): boolean {
  let changed = open !== seen, n = 0;
  seen = open;
  for (const k in open) { n++; const v = !!open[k]; if (was.get(k) !== v) { was.set(k, v); changed = true; } }
  if (n !== was.size) { was.clear(); for (const k in open) was.set(k, !!open[k]); changed = true; }
  return changed;
}
/** Animate props that move (scripted patrols, doors following the world state). All of them are looked at when
 *  something opened or shut or `shown` (what's drawn near him was looked at again, view.ts); between, only those still
 *  moving (M3-53: thousands of doors and panes, most of them still and out of sight). */
export function tickProps(t: number, open: Record<string, boolean> = {}, shown = true) {
  // Floodlit beams show after dark only (U-031).
  FLOOD.opacity = 0.08 * night.k;
  tickSigns(t);
  const changed = openChanged(open);
  if (changed || shown) { busy.length = 0; for (const f of ticking) if (f(t, open, changed)) busy.push(f); return; }
  let n = 0;
  for (const f of busy) if (f(t, open, false)) busy[n++] = f;
  busy.length = n;
}

/** Small things, a few pixels from further off: merged apart and drawn only near the camera (view.ts DETAIL). */
const SMALL = new Set(['jbox', 'chalkmouse', 'weeds', 'trash', 'debris', 'boxes', 'bags', 'pot', 'scooter', 'bike', 'sign', 'bin', 'rebar', 'shrub', 'garden', 'bench', 'mahjong', 'drum', 'stall',
  'cablebundle', 'dish', 'antenna', 'stilts', 'laundry', 'dronewreck', 'bangbang']);

/** Loose litter and clutter, nothing in the way or to hide in: the graphics draw a share of it (GFX.props). */
const LITTER = new Set(['weeds', 'trash', 'debris', 'pot', 'scooter', 'bike', 'sign', 'rebar', 'shrub', 'cablebundle', 'dish', 'antenna', 'laundry', 'dronewreck', 'bangbang']);
const keep = (p: Prop, share: number) => share >= 1 || !LITTER.has(p.kind) || (((Math.round(p.x * 7) * 73856093) ^ (Math.round(p.z * 7) * 19349663)) >>> 0) % 1000 / 1000 < share;

/** Props: animated ones stay separate; static meshes (and the parts of static library props) merge per chunk, the
 *  small ones on their own; of the loose litter, `share` of it. */
export function buildProps(props: Prop[], share = 1): THREE.Group {
  ticking.length = busy.length = 0;
  const g = new THREE.Group(), big = new ChunkMerger(), small = new ChunkMerger(), swing: Prop[] = [];
  for (const p of props) {
    if (!keep(p, share)) continue;
    if (p.kind === 'door' || p.kind === 'pane' || p.kind === 'chain' || p.kind === 'padlock') { swing.push(p); continue; }
    const b = builders[p.kind];
    const o = b ? b(p) : libProp(p);
    if (!o) continue;
    o.position.set(p.x, p.y, p.z);
    o.rotation.y = p.yaw;
    const merger = SMALL.has(p.kind) ? small : big;
    // (Out of sight, its cell hidden, it waits: M10-04. Its own visibility it may set itself, so only its parents'.)
    // (One following the world state only, a grate or a gate, is animated for a while after a change or after it shows
    // again; one that moves of itself, or with the night, every frame it's in view.)
    if (o.userData.tick) {
      const f = o.userData.tick as Tick, always = !!o.userData.always;
      let left = SETTLE;
      ticking.push((t, open, changed) => {
        if (o.parent?.visible === false || o.parent?.parent?.visible === false) { left = SETTLE; return false; }
        if (changed) left = SETTLE;
        if (!always && left <= 0) return false;
        left--; f(t, open);
        return always || left > 0;
      });
    }
    // Grates and hatches that open and the bags over them (M3-72, M3-73a, M3-83), hundreds of them in the basements, and
    // the falls that are cleared (M4-24), down in the tunnels: drawn near only.
    if (p.kind === 'grate' || p.kind === 'cover' || p.kind === 'hatch' || p.kind === 'rubble') o.userData.chunk = o.userData.detail = true;
    if ((o as THREE.Mesh).isMesh && !o.userData.tick && o.children.length === 0) merger.add(o as THREE.Mesh);
    // (A group that doesn't move, its pieces all meshes, merges into its chunk as a mesh does: kept whole, each piece
    // was a draw call wherever it was in view, from across the city: M9-02.)
    else if (!o.userData.tick && (!b || o.children.every(c => (c as THREE.Mesh).isMesh && !c.children.length))) { o.updateMatrixWorld(true); for (const c of [...o.children]) merger.add(c as THREE.Mesh); }
    else g.add(o);
  }
  for (const m of big.build(mergeGeometries)) g.add(m);
  for (const m of small.build(mergeGeometries)) { m.userData.detail = true; g.add(m); }
  for (const m of swingers(swing)) g.add(m);
  return g;
}

/** Whether a prop is one of the small ones, drawn near only. */
export const isSmall = (p: Prop) => SMALL.has(p.kind);

/** Small props by themselves (M4-01c: the big city builds them a cell at a time as he nears it), merged per chunk
 *  and drawn near only; `share` of the loose litter. */
/** Small props already built, kept to be used again (M4-83: building every one anew made a cell's streaming a hitch):
 *  a few looks of each kind and size (to half a metre), every prop that hashes to a look drawn as it. */
const LOOKS = 6, made = new Map<string, THREE.Object3D | null>();
const half = (v?: number) => (v === undefined ? '' : Math.round(v * 2));
function look(p: Prop): THREE.Object3D | null {
  const k = `${p.kind}|${half(p.w)}|${half(p.h)}|${half(p.d)}|${p.text ?? ''}|${p.gap ?? ''}|${(((Math.round(p.x * 13) * 73856093) ^ (Math.round(p.z * 7) * 19349663)) >>> 0) % LOOKS}`;
  let o = made.get(k);
  if (o === undefined) { const b = builders[p.kind]; o = b ? b(p) : libProp(p); made.set(k, o); }
  return o;
}

export function smallProps(props: Prop[], share = 1): THREE.Mesh[] {
  const small = new ChunkMerger();
  for (const p of props) {
    if (!keep(p, share)) continue;
    const o = look(p);
    if (!o) continue;
    o.position.set(p.x, p.y, p.z);
    o.rotation.y = p.yaw;
    if ((o as THREE.Mesh).isMesh && o.children.length === 0) small.add(o as THREE.Mesh);
    else { o.updateMatrixWorld(true); for (const c of [...o.children]) small.add(c as THREE.Mesh); }
  }
  const out = small.build(mergeGeometries) as THREE.Mesh[];
  for (const m of out) m.userData.detail = true;
  return out;
}

/** Doors and window panes (M3-36), thousands of them: one instanced mesh of each per 64 m chunk, culled with the
 *  city's chunks and drawn only near; a door swings open (its slab turned about its hinge) and a pane goes when its
 *  interactable's world state opens. */
function swingers(props: Prop[]): THREE.Mesh[] {
  const chunks = new Map<string, Prop[]>();
  // (The locks, few and small, a coarser grid: a draw for 128 m square, not 64.)
  for (const p of props) { const lock = p.kind === 'chain' || p.kind === 'padlock', g = lock ? 128 : 64; const k = `${lock ? 'lock' : p.kind}:${Math.floor(p.x / g)},${Math.floor(p.z / g)}`; (chunks.get(k) ?? chunks.set(k, []).get(k)!).push(p); }
  const out: THREE.Mesh[] = [], m = new THREE.Matrix4(), q = new THREE.Matrix4(), sc = new THREE.Matrix4(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (const ps of chunks.values()) {
    if (ps[0].kind === 'chain' || ps[0].kind === 'padlock') { out.push(locks(ps)); continue; }
    const door = ps[0].kind === 'door';
    // A unit slab: a door's from its hinge along +x, a pane's about its middle; each scaled to its size.
    const mesh = new THREE.InstancedMesh(door ? leaf().clone() : new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), material(door ? MAT.metal : MAT.glass), ps.length);
    const place = (i: number, a: number) => {
      const p = ps[i];
      m.makeTranslation(p.x, p.y, p.z).multiply(q.makeRotationY(p.yaw + a)).multiply(sc.makeScale(p.w!, p.h!, p.d ?? (door ? 0.06 : 0.03)));
      mesh.setMatrixAt(i, m);
    };
    ps.forEach((_, i) => place(i, 0));
    mesh.computeBoundingSphere();
    mesh.computeBoundingBox();
    mesh.geometry.boundingBox = mesh.boundingBox!.clone();
    mesh.userData.chunk = { x: ps[0].x, z: ps[0].z };
    mesh.userData.detail = true;
    const angle = new Float32Array(ps.length), gone = new Uint8Array(ps.length);
    // (Looked at only when something's opened or shut, or a door's still swinging: M3-53.)
    let stale = true, swinging = false;
    ticking.push((_t, open, changed) => {
      // (Out of range, it catches up once it's drawn again.)
      if (!mesh.visible || !mesh.parent?.visible) { stale = true; return false; }
      if (!changed && !stale && !swinging) return false;
      let moved = false;
      stale = swinging = false;
      for (let i = 0; i < ps.length; i++) {
        const o = !!open[ps[i].text!];
        if (door) {
          const want = o ? 1.45 : 0;
          if (Math.abs(angle[i] - want) < 1e-3) continue;
          angle[i] += (want - angle[i]) * 0.15;
          if (Math.abs(angle[i] - want) < 1e-3) angle[i] = want;
          else swinging = true;
          place(i, angle[i]);
        } else {
          if (+o === gone[i]) continue;
          gone[i] = +o;
          if (o) mesh.setMatrixAt(i, zero); else place(i, 0);
        }
        moved = true;
      }
      if (moved) mesh.instanceMatrix.needsUpdate = true;
      return swinging;
    });
    out.push(mesh);
  }
  return out;
}

/** A door's leaf (each chunk's its own copy: its bounds are set to the chunk's, U-090), a unit slab from its hinge along
 *  +x, with a lever handle on each face near its free edge (U-083):
 *  a round rose against the face and the lever back toward the hinge, at HANDLE's height (in the leaf's unit frame,
 *  so it's scaled with the door, a little smaller on a small one). */
let leafGeo: THREE.BufferGeometry | null = null;
function leaf() {
  if (leafGeo) return leafGeo;
  const x = 0.5 + HANDLE.u, y = HANDLE.y, parts: THREE.BufferGeometry[] = [new THREE.BoxGeometry(1, 1, 1).translate(0.5, 0.5, 0)];
  for (const s of [-1, 1]) {
    parts.push(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 10).rotateX(Math.PI / 2).scale(1, 0.48, 1).translate(x + 0.04, y, s * 0.75));
    parts.push(new THREE.BoxGeometry(0.15, 0.007, 0.35).translate(x - 0.025, y, s * 1.05));
  }
  return (leafGeo = mergeGeometries(parts));
}

/** A chunk's chains (rings) and padlocks (blocks) on chained and locked doors (U-066, U-079), merged into one mesh
 *  (one draw for the lot); a door's go when it's forced, their corners pulled to one point. */
function locks(ps: Prop[]): THREE.Mesh {
  const ring = new THREE.TorusGeometry(0.5, 0.17, 4, 8).translate(0, 0.5, 0).toNonIndexed(), block = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0).toNonIndexed();
  const m = new THREE.Matrix4(), q = new THREE.Matrix4(), sc = new THREE.Matrix4(), from = [0];
  const parts = ps.map(p => {
    const g = (p.kind === 'chain' ? ring : block).clone().applyMatrix4(m.makeTranslation(p.x, p.y, p.z).multiply(q.makeRotationY(p.yaw)).multiply(sc.makeScale(p.w!, p.h!, p.d ?? 0.03)));
    from.push(from[from.length - 1] + g.getAttribute('position').count);
    return g;
  });
  const mesh = new THREE.Mesh(mergeGeometries(parts)!, material(MAT.concrete)), pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute, rest = (pos.array as Float32Array).slice();
  mesh.geometry.computeBoundingSphere();
  mesh.userData.chunk = { x: ps[0].x, z: ps[0].z };
  mesh.userData.detail = true;
  const gone = new Uint8Array(ps.length);
  let stale = true;
  ticking.push((_t, open, changed) => {
    if (!mesh.visible || !mesh.parent?.visible) { stale = true; return false; }
    if (!changed && !stale) return false;
    stale = false;
    let moved = false;
    for (let i = 0; i < ps.length; i++) {
      const o = +!!open[ps[i].text!];
      if (o === gone[i]) continue;
      gone[i] = o; moved = true;
      for (let k = from[i]; k < from[i + 1]; k++) { const j = o ? from[i] * 3 : k * 3; pos.setXYZ(k, rest[j], rest[j + 1], rest[j + 2]); }
    }
    if (moved) pos.needsUpdate = true;
    return false;
  });
  return mesh;
}

