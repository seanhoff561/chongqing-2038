// Roller shutters drawn (M5-23b): over each shopfront doorway pulled down to the ground, corrugated steel under its
// box housing; prised up, it's raised off the ground the gap he crawls under. Only those near him are drawn.
import * as THREE from 'three';
import type { SimState } from '../sim/types';
import type { World, Inter } from '../world/world';
import { frameOut } from '../world/geom';
import { doorSolid, SHUTTER } from '../sim/doors';
import { canvasTexture } from './textures';

const N = 16, NEAR = 45;

export class Shutters {
  private pool: THREE.Group[] = [];
  private of: World | null = null;
  private list: { it: Inter; x: number; z: number; y0: number; h: number; w: number; yaw: number }[] = [];

  constructor(scene: THREE.Scene) {
    const tex = canvasTexture('shutter', 64, 256, (g, w, h) => {
      g.fillStyle = '#7c8186'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 16) { g.fillStyle = '#5c6166'; g.fillRect(0, y, w, 3); g.fillStyle = '#9aa0a5'; g.fillRect(0, y + 8, w, 2); }
      g.fillStyle = 'rgba(90,60,40,0.35)'; for (let i = 0; i < 30; i++) g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 5, 1 + Math.random() * 3);
    });
    const steel = new THREE.MeshLambertMaterial({ map: tex }), dark = new THREE.MeshLambertMaterial({ color: 0x4a4e52 });
    for (let i = 0; i < N; i++) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.04).translate(0, 0.5, 0), steel));
      g.add(new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.3, 0.3), dark));
      g.visible = false; scene.add(g); this.pool.push(g);
    }
  }

  /** Every frame: the shutters near him, down or prised up. */
  update(s: SimState, w: World, cam: THREE.Vector3) {
    if (this.of !== w) {
      this.of = w;
      this.list = w.inter.filter(i => i.data?.shutter).flatMap(it => {
        const b = w.index.solids[doorSolid(it)];
        if (!b) return [];
        const e = b.rot ?? b, alongX = e.x1 - e.x0 > e.z1 - e.z0, [x, z] = frameOut(b, (e.x0 + e.x1) / 2, (e.z0 + e.z1) / 2), turn = b.rot ? Math.atan2(b.rot.s, b.rot.c) : 0;
        return [{ it, x, z, y0: (it.data!.y0 as number | undefined) ?? b.y0, h: b.y1 - b.y0, w: alongX ? e.x1 - e.x0 : e.z1 - e.z0, yaw: -turn + (alongX ? 0 : Math.PI / 2) }];
      });
    }
    let k = 0;
    for (const q of this.list) {
      if (k >= N || Math.hypot(q.x - cam.x, q.z - cam.z) > NEAR) continue;
      const g = this.pool[k++], up = s.wstate.open[q.it.id] ? SHUTTER.gap : 0, panel = g.children[0], box = g.children[1];
      g.visible = true; g.position.set(q.x, q.y0, q.z); g.rotation.y = q.yaw;
      panel.position.y = up; panel.scale.set(q.w, q.h - up, 1);
      box.position.y = q.h + 0.1; box.scale.x = q.w;
    }
    for (; k < N; k++) this.pool[k].visible = false;
  }
}
