// Rain (M3-13, M3-63): streaks falling slanted on the wind in a box around the camera, as many as the rain is heavy
// (just the rain: the splashes that flicked up round his feet are gone, U-051). Hidden underground or under a roof.
// All on the GPU (M9-12): each streak keeps its place in a box that tiles space, so the camera moves through still
// rain, and nothing is written per frame but the time, the camera and the draw range.
import * as THREE from 'three';
import { mulberry } from './rand';

const N = 3000, BOX = 28, LEN = 0.42, FALL = 8.5, SLANT = 0.08;

export class Rain {
  readonly lines: THREE.LineSegments;
  private u = { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uOpacity: { value: 0.16 } };

  constructor(scene: THREE.Scene) {
    const r = mulberry(77), seed = new Float32Array(N * 2 * 4), pos = new Float32Array(N * 2 * 3);
    // (Both ends of a streak share its seed; w says which end, 0 the bottom, 1 the top.)
    for (let i = 0; i < N; i++) {
      const x = r() * BOX, y = r() * BOX, z = r() * BOX;
      seed.set([x, y, z, 0, x, y, z, 1], i * 8);
    }
    const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)).setAttribute('seed', new THREE.BufferAttribute(seed, 4));
    const mat = new THREE.ShaderMaterial({
      uniforms: this.u, transparent: true, depthWrite: false, fog: false,
      vertexShader: `attribute vec4 seed; uniform float uT; uniform vec3 uCam;
        float wrap(float v) { return mod(v, ${BOX}.0) - ${BOX / 2}.0; }
        void main() {
          vec3 w = uCam + vec3(wrap(seed.x - uCam.x + uT * ${(FALL * SLANT).toFixed(3)}), wrap(seed.y - uT * ${FALL.toFixed(1)} - uCam.y), wrap(seed.z - uCam.z));
          w += seed.w * vec3(${(-LEN * SLANT).toFixed(4)}, ${LEN}, 0.02);
          gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
        }`,
      fragmentShader: `uniform float uOpacity; void main() { gl_FragColor = vec4(0.706, 0.737, 0.769, uOpacity); }`,
    });
    this.lines = new THREE.LineSegments(geo, mat);
    this.lines.frustumCulled = false;
    this.lines.visible = false;
    scene.add(this.lines);
  }

  /** amount 0..1; covered: a roof or the ground is over his head. */
  update(t: number, cam: THREE.Vector3, amount: number, covered: boolean) {
    const on = amount > 0.02 && !covered;
    this.lines.visible = on;
    if (!on) return;
    this.lines.geometry.setDrawRange(0, Math.floor(N * Math.min(1, amount)) * 2);
    this.u.uT.value = t; this.u.uCam.value.copy(cam); this.u.uOpacity.value = 0.05 + 0.11 * amount;
  }
}
