// What's thrown, drawn (M5-19): the arc a throw will take while he aims with a throwable (right mouse), dotted to where
// it lands; things in the air; and the extinguisher's powder clouds, thick and pale, thinning as they go.
import * as THREE from 'three';
import type { SimState } from '../sim/types';
import type { World } from '../world/world';
import { THROW, THROWN, launch, fly } from '../sim/throw';
import { SCALE } from '../sim/clock';

const ARC = 90, FLYING = 6, CLOUDS = 4;

export class ThrowFx {
  private arc: THREE.Points;
  private flying: THREE.Mesh[] = [];
  private clouds: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    const g = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(ARC * 3), 3));
    this.arc = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffe0a0, size: 0.06, transparent: true, opacity: 0.8, depthWrite: false }));
    this.arc.frustumCulled = false; this.arc.visible = false;
    scene.add(this.arc);
    const ball = new THREE.SphereGeometry(0.06, 8, 6), dark = new THREE.MeshLambertMaterial({ color: 0x3a3e38 });
    for (let i = 0; i < FLYING; i++) { const m = new THREE.Mesh(ball, dark); m.visible = false; this.flying.push(m); scene.add(m); }
    const puff = new THREE.SphereGeometry(1, 16, 12);
    for (let i = 0; i < CLOUDS; i++) {
      const m = new THREE.Mesh(puff, new THREE.MeshLambertMaterial({ color: 0xe8e8e4, transparent: true, opacity: 0.9, depthWrite: false }));
      m.visible = false; m.renderOrder = 2; this.clouds.push(m); scene.add(m);
    }
  }

  /** Every frame: the arc if he's aiming a throwable (`id`), what's flying, the clouds. */
  update(s: SimState, w: World, id: string | null, aiming: boolean) {
    this.arc.visible = !!id && aiming && THROWN.has(id);
    if (this.arc.visible) {
      const o = launch(s, id!), a = this.arc.geometry.attributes.position as THREE.BufferAttribute;
      let n = 0, end: { x: number; y: number; z: number } | null = null;
      // (Every second tick's point, so the dots run to where it lands.)
      for (let k = 0; k < ARC * 2 && !end && n < ARC; k++) { end = fly(w, o); if (k % 2 === 0) a.setXYZ(n++, o.x, o.y, o.z); }
      if (end && n < ARC) a.setXYZ(n++, end.x, end.y, end.z);
      this.arc.geometry.setDrawRange(0, n); a.needsUpdate = true;
    }
    const t = s.thrown ?? [];
    this.flying.forEach((m, i) => { const o = t[i]; m.visible = !!o; if (o) m.position.set(o.x, o.y, o.z); });
    const c = s.smoke ?? [];
    this.clouds.forEach((m, i) => {
      const q = c[i]; m.visible = !!q;
      if (!q) return;
      const left = (q.until - s.time) / (THROW.smoke.secs * SCALE);
      m.position.set(q.x, q.y + 1, q.z); m.scale.setScalar(THROW.smoke.r * (1.15 - 0.15 * left));
      (m.material as THREE.MeshLambertMaterial).opacity = Math.min(0.92, left * 2.5);
    });
  }
}
