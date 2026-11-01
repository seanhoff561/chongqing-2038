// The season on screen (M5-28): the trees' leaves turning gold and brown and thinning to bare branches, the grass drying
// to straw (uniforms the prop and ground materials read), and leaves falling round him outdoors while they're coming
// down, drifting and turning as they go.
import * as THREE from 'three';
import type { Season } from '../sim/season';

/** What the materials read: how turned the leaves are, how many gone, how dry the grass. */
export const SEASON_U = { turn: { value: 0.3 }, bare: { value: 0 }, straw: { value: 0 } };

const N = 140, BOX = 24;

export class Leaves {
  private pts: THREE.Points;
  private pos = new Float32Array(N * 3);
  private seed = new Float32Array(N * 4);

  constructor(scene: THREE.Scene) {
    let s = 9;
    const r = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
    for (let i = 0; i < N * 4; i++) this.seed[i] = r();
    const g = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xa8743a, size: 0.07, transparent: true, opacity: 0.9, depthWrite: false }));
    this.pts.frustumCulled = false; this.pts.visible = false;
    scene.add(this.pts);
  }

  /** Every frame: the materials' season; leaves falling round the camera if he's out under the sky. */
  update(se: Season, t: number, cam: THREE.Vector3, covered: boolean) {
    SEASON_U.turn.value = se.turn; SEASON_U.bare.value = se.bare; SEASON_U.straw.value = se.straw;
    const n = Math.floor(N * se.falling);
    this.pts.visible = n > 0 && !covered;
    if (!this.pts.visible) return;
    this.pts.geometry.setDrawRange(0, n);
    const half = BOX / 2, wrap = (v: number) => ((v % BOX) + BOX) % BOX - half;
    for (let i = 0; i < n; i++) {
      const a = this.seed[i * 4], b = this.seed[i * 4 + 1], c = this.seed[i * 4 + 2], d = this.seed[i * 4 + 3], fall = 0.6 + d * 0.6;
      this.pos[i * 3] = cam.x + wrap(a * BOX - cam.x + Math.sin(t * (0.7 + c) + d * 9) * 0.8);
      this.pos[i * 3 + 1] = cam.y + wrap(b * BOX - t * fall - cam.y);
      this.pos[i * 3 + 2] = cam.z + wrap(c * BOX - cam.z + Math.cos(t * (0.6 + a) + b * 7) * 0.8);
    }
    this.pts.geometry.attributes.position.needsUpdate = true;
  }
}
