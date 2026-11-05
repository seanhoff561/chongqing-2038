// The map editor's view (M10-32): a free camera flown over the map (right drag looks; W A S D, Q and E fly, Shift
// faster; the wheel goes forward and back), the ghost of what's being placed or dragged, the selected piece's outline
// and its handles (red sizes it across, blue in depth, green up; white lifts it, yellow turns it), the spawn point (a
// green figure and an arrow the way he'll face), and rays from the cursor into it.
import * as THREE from 'three';
import type { Piece } from '../world/sets/usermap';
import { PIECES, boxOf } from '../world/sets/pieces';

export type Handle = 'w' | 'h' | 'd' | 'lift' | 'turn';
const COLOR: Record<Handle, number> = { w: 0xff5a4a, d: 0x4a8aff, h: 0x5ad06a, lift: 0xffffff, turn: 0xffd040 };
export type Ray = { o: THREE.Vector3; d: THREE.Vector3 };

/** A point of a piece's own frame in the world. */
export const toWorld = (p: Piece, lx: number, ly: number, lz: number) => new THREE.Vector3(p.x + lx * Math.cos(p.yaw) + lz * Math.sin(p.yaw), p.y + ly, p.z - lx * Math.sin(p.yaw) + lz * Math.cos(p.yaw));

/** Where a ray enters a piece's box (padded so a thin one can be clicked), or null. */
export function enterPiece(r: Ray, p: Piece): number | null {
  const c = Math.cos(p.yaw), s = Math.sin(p.yaw), ox = r.o.x - p.x, oz = r.o.z - p.z, b = boxOf(p);
  const o = [ox * c - oz * s, r.o.y - p.y, ox * s + oz * c], d = [r.d.x * c - r.d.z * s, r.d.y, r.d.x * s + r.d.z * c];
  let t0 = 0, t1 = Infinity;
  for (let k = 0; k < 3; k++) {
    const pad = Math.max(0, 0.15 - (b[k + 3] - b[k]) / 2), lo = b[k] - pad, hi = b[k + 3] + pad;
    if (Math.abs(d[k]) < 1e-9) { if (o[k] < lo || o[k] > hi) return null; continue; }
    const a = (lo - o[k]) / d[k], z = (hi - o[k]) / d[k];
    t0 = Math.max(t0, Math.min(a, z)); t1 = Math.min(t1, Math.max(a, z));
  }
  return t0 <= t1 ? t0 : null;
}

/** The handles a piece has, each where it sits in its own frame. */
export function handlesOf(p: Piece): [Handle, number, number, number][] {
  const b = boxOf(p), mx = (b[0] + b[3]) / 2, my = (b[1] + b[4]) / 2, mz = (b[2] + b[5]) / 2, size = PIECES[p.kind]?.size ?? '';
  const out: [Handle, number, number, number][] = [['lift', mx, b[4] + 0.6, mz]];
  if (size.includes('w')) out.push(['w', b[3], my, mz]);
  if (size.includes('d')) out.push(['d', mx, my, b[5]]);
  if (size.includes('h') && p.kind !== 'pool') out.push(['h', mx, b[4], b[2]]);
  if (!PIECES[p.kind]?.fixed) out.push(['turn', mx, b[1] + 0.05, p.kind === 'spawn' ? -0.9 : b[5] + 0.7]);
  return out;
}

export class EditView {
  readonly pos = new THREE.Vector3(0, 9, 16);
  yaw = 0;
  pitch = -0.55;
  readonly keys = new Set<string>();
  private readonly group = new THREE.Group();
  private readonly ghost = new THREE.Group();
  private readonly ghostBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0.3, depthWrite: false }));
  private readonly outline = new THREE.Group();
  private readonly outlineBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0x8fd8ff, depthTest: false, transparent: true }));
  private readonly spawn = new THREE.Group();
  private readonly balls = new Map<Handle, THREE.Mesh>();
  private readonly caster = new THREE.Raycaster();

  constructor(private readonly scene: THREE.Scene) {
    this.ghost.add(this.ghostBox);
    this.outline.add(this.outlineBox);
    this.outlineBox.renderOrder = 10;
    const green = new THREE.MeshBasicMaterial({ color: 0x5ad06a, transparent: true, opacity: 0.55, depthWrite: false });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.8, 12), green), arrow = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 8), green);
    body.position.y = 0.9;
    arrow.rotation.x = -Math.PI / 2;
    arrow.position.set(0, 1.6, -0.55);
    this.spawn.add(body, arrow);
    for (const h of Object.keys(COLOR) as Handle[]) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: COLOR[h], depthTest: false, transparent: true }));
      m.renderOrder = 11;
      this.balls.set(h, m);
      this.group.add(m);
    }
    this.group.add(this.ghost, this.outline, this.spawn);
    scene.add(this.group);
  }

  /** Flies the camera for dt and puts it on cam. */
  fly(cam: THREE.PerspectiveCamera, dt: number) {
    const k = (c: string) => (this.keys.has(c) ? 1 : 0), v = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 30 : 10) * dt;
    const f = k('KeyW') - k('KeyS'), r = k('KeyD') - k('KeyA'), u = k('KeyE') - k('KeyQ');
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    this.pos.x += (-sy * cp * f + cy * r) * v;
    this.pos.y = Math.max(0.3, this.pos.y + (sp * f + u) * v);
    this.pos.z += (-cy * cp * f - sy * r) * v;
    cam.position.copy(this.pos);
    cam.rotation.set(this.pitch, this.yaw, 0);
    cam.updateMatrixWorld();
  }

  /** Forward and back along the look, by the wheel. */
  dolly(m: number) {
    const cp = Math.cos(this.pitch);
    this.pos.add(new THREE.Vector3(-Math.sin(this.yaw) * cp * m, Math.sin(this.pitch) * m, -Math.cos(this.yaw) * cp * m));
    this.pos.y = Math.max(0.3, this.pos.y);
  }

  /** The ray from the camera through a point on the canvas. */
  rayAt(cam: THREE.PerspectiveCamera, el: HTMLElement, cx: number, cy: number): Ray {
    const r = el.getBoundingClientRect();
    this.caster.setFromCamera(new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), cam);
    return { o: this.caster.ray.origin.clone(), d: this.caster.ray.direction.clone() };
  }

  /** Draws the ghost (a piece being placed or dragged), the selected piece's outline and handles, the spawn point. */
  show(cam: THREE.Camera, sel: Piece | null, ghost: Piece | null, spawn: Piece | undefined) {
    const fit = (g: THREE.Group, m: THREE.Object3D, p: Piece | null) => {
      g.visible = !!p;
      if (!p) return;
      const b = boxOf(p);
      g.position.set(p.x, p.y, p.z);
      g.rotation.set(0, p.yaw, 0);
      m.position.set((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2);
      m.scale.set(Math.max(0.03, b[3] - b[0]), Math.max(0.03, b[4] - b[1]), Math.max(0.03, b[5] - b[2]));
    };
    fit(this.ghost, this.ghostBox, ghost);
    fit(this.outline, this.outlineBox, sel);
    this.spawn.visible = !!spawn;
    if (spawn) { this.spawn.position.set(spawn.x, spawn.y, spawn.z); this.spawn.rotation.set(0, spawn.yaw, 0); }
    for (const m of this.balls.values()) m.visible = false;
    if (!sel) return;
    for (const [h, x, y, z] of handlesOf(sel)) {
      const m = this.balls.get(h)!, at = toWorld(sel, x, y, z);
      m.position.copy(at);
      m.scale.setScalar(this.ballSize(cam, at));
      m.visible = true;
    }
  }

  private ballSize = (cam: THREE.Camera, at: THREE.Vector3) => Math.min(1.2, Math.max(0.07, cam.position.distanceTo(at) * 0.018));

  /** The handle of the selected piece under the ray, if any. */
  handleAt(cam: THREE.Camera, r: Ray, sel: Piece): Handle | null {
    let best: Handle | null = null, bt = Infinity;
    for (const [h, x, y, z] of handlesOf(sel)) {
      const c = toWorld(sel, x, y, z), rad = this.ballSize(cam, c) * 1.4, v = c.clone().sub(r.o), t = v.dot(r.d);
      if (t > 0 && v.lengthSq() - t * t < rad * rad && t < bt) { bt = t; best = h; }
    }
    return best;
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse(o => (o as THREE.Mesh).geometry?.dispose());
  }
}

/** Where along a line (a + u e) the ray passes closest. */
export function alongLine(r: Ray, a: THREE.Vector3, e: THREE.Vector3): number {
  const w = a.clone().sub(r.o), b = e.dot(r.d), den = 1 - b * b;
  return den < 1e-6 ? 0 : (b * w.dot(r.d) - w.dot(e)) / den;
}

/** Where the ray meets a plane through a with normal n, or null. */
export function onPlane(r: Ray, a: THREE.Vector3, n: THREE.Vector3): THREE.Vector3 | null {
  const dn = r.d.dot(n);
  if (Math.abs(dn) < 1e-6) return null;
  const t = a.clone().sub(r.o).dot(n) / dn;
  return t > 0 ? r.o.clone().addScaledVector(r.d, t) : null;
}
