// The dev perception overlay (M4-30, ?dev=1): what the machines near him can see and how much they know. Each of the
// nearest machines' sight drawn as a fan on the ground's plane at its eye (its field of view out to its range just
// now), coloured by its alert (green unaware, amber suspicious, red engaged, grey out); a list of them with their
// awareness as bars; and his district's alert and where the network last placed him.
import * as THREE from 'three';
import type { Game } from '../game';
import { unitPose, isOff } from '../sim/units';
import { SENSES } from '../data/units';
import { rangeOf } from '../sim/perception';
import { districtOf } from '../sim/district';

const SHOW = { units: 16, reach: 120, arc: 16 };
const COLOR: Record<string, number> = { unaware: 0x44dd66, suspicious: 0xffaa22, engaged: 0xff3322, out: 0x777777 };

export class PerceptionOverlay {
  on = false;
  private lines: THREE.LineSegments;
  private list: HTMLDivElement;

  constructor(private game: Game) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SHOW.units * (SHOW.arc + 2) * 2 * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(SHOW.units * (SHOW.arc + 2) * 2 * 3), 3));
    this.lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true, opacity: 0.85 }));
    this.lines.frustumCulled = false; this.lines.renderOrder = 10; this.lines.visible = false;
    game.view.scene.add(this.lines);
    this.list = document.createElement('div');
    this.list.id = 'perception';
    this.list.style.cssText = 'position:fixed;right:8px;top:8px;font:11px monospace;color:#ddd;background:rgba(0,0,0,0.6);padding:6px;display:none;z-index:20;min-width:220px';
    document.body.appendChild(this.list);
  }

  toggle(on = !this.on) { this.on = on; this.lines.visible = on; this.list.style.display = on ? 'block' : 'none'; if (on) this.update(); }

  /** Twice a second while it's on. */
  update() {
    if (!this.on) return;
    const g = this.game, s = g.state, w = g.world, p = s.player.pos;
    const near = s.units.map(u => ({ u, q: unitPose(w, u, s.time) })).filter(({ u, q }) => q.active && u.cam === undefined && Math.hypot(q.x - p.x, q.z - p.z) < SHOW.reach)
      .sort((a, b) => Math.hypot(a.q.x - p.x, a.q.z - p.z) - Math.hypot(b.q.x - p.x, b.q.z - p.z)).slice(0, SHOW.units);
    const pos = this.lines.geometry.getAttribute('position') as THREE.BufferAttribute, col = this.lines.geometry.getAttribute('color') as THREE.BufferAttribute;
    let v = 0;
    const seg = (a: THREE.Vector3Like, b: THREE.Vector3Like, c: THREE.Color) => { pos.setXYZ(v, a.x, a.y, a.z); col.setXYZ(v++, c.r, c.g, c.b); pos.setXYZ(v, b.x, b.y, b.z); col.setXYZ(v++, c.r, c.g, c.b); };
    for (const { u, q } of near) {
      const S = SENSES[u.kind], r = rangeOf(s, u.kind), half = (S.fov * Math.PI) / 360, eye = { x: q.x, y: q.y + S.eye, z: q.z }, c = new THREE.Color(COLOR[isOff(s, u) ? 'out' : u.state] ?? 0xffffff);
      const at = (a: number) => ({ x: eye.x + Math.sin(q.yaw + a) * r, y: eye.y, z: eye.z + Math.cos(q.yaw + a) * r });
      seg(eye, at(-half), c); seg(eye, at(half), c);
      for (let k = 0; k < SHOW.arc; k++) seg(at(-half + (2 * half * k) / SHOW.arc), at(-half + (2 * half * (k + 1)) / SHOW.arc), c);
    }
    for (let k = v; k < pos.count; k++) pos.setXYZ(k, 0, -1e4, 0);
    pos.needsUpdate = col.needsUpdate = true;
    const d = districtOf(p.x, p.z), D = s.hive.districts[d], k = s.hive.lkp;
    this.list.innerHTML = `<b>${d}</b>: ${D?.state ?? 'unaware'}${k ? ` · last placed ${Math.round(Math.hypot(k.x - p.x, k.z - p.z))} m off` : ''}<br>` +
      near.map(({ u, q }) => `${u.kind.padEnd(9)} ${String(Math.round(Math.hypot(q.x - p.x, q.z - p.z))).padStart(3)} m <span style="display:inline-block;width:${Math.round(Math.min(1.5, u.aware ?? 0) * 40)}px;height:7px;background:#${(COLOR[u.state] ?? 0xffffff).toString(16).padStart(6, '0')}"></span> ${u.state}`).join('<br>');
  }
}
