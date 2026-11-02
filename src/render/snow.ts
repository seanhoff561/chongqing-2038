// Snow (U-097): flakes falling round him outdoors, as many as it's snowing hard: soft discs of different sizes, the
// small ones mostly, drifting down at about a metre a second, swaying and tumbling (glinting as they turn), slanting
// on the wind; lit by the sky, dim at night. All on the GPU: each flake keeps its place in a box that tiles space
// round the camera, so he moves through still snow. Hidden under a roof or underground.
import * as THREE from 'three';
import { mulberry } from './rand';

const N = 14000, BOX = 24;

export class Snow {
  readonly pts: THREE.Points;
  private u = { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uLight: { value: 1 }, uScale: { value: 400 } };

  constructor(scene: THREE.Scene) {
    const r = mulberry(31), seed = new Float32Array(N * 4), pos = new Float32Array(N * 3);
    // (Sizes: most flakes a few millimetres, now and then a clump of them two centimetres across.)
    for (let i = 0; i < N; i++) { seed[i * 4] = r() * BOX; seed[i * 4 + 1] = r() * BOX; seed[i * 4 + 2] = r() * BOX; seed[i * 4 + 3] = r(); }
    const g = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)).setAttribute('seed', new THREE.BufferAttribute(seed, 4));
    const m = new THREE.ShaderMaterial({
      uniforms: this.u, transparent: true, depthWrite: false, fog: false,
      vertexShader: `attribute vec4 seed; uniform float uT, uScale; uniform vec3 uCam; varying float vA;
        float wrap(float v) { return mod(v, ${BOX}.0) - ${BOX / 2}.0; }
        void main() {
          float s = seed.w, size = 0.01 + 0.025 * s * s * s + step(0.98, s) * 0.015, fall = 0.75 + 0.5 * fract(s * 7.3);
          float ph = s * 61.0, sway = 0.35 + 0.3 * fract(s * 3.1);
          vec3 p = vec3(seed.x + uT * 0.35 + sin(uT * (0.6 + fract(s * 5.7)) + ph) * sway, seed.y - uT * fall, seed.z + cos(uT * (0.5 + fract(s * 9.1)) + ph * 1.3) * sway * 0.8);
          vec3 w = uCam + vec3(wrap(p.x - uCam.x), wrap(p.y - uCam.y), wrap(p.z - uCam.z));
          vec4 mv = viewMatrix * vec4(w, 1.0);
          gl_Position = projectionMatrix * mv;
          float d = -mv.z;
          gl_PointSize = max(2.0, size * uScale / max(d, 0.05));
          // (Fading in from the box's far edge and out right at the eye; a glint as it turns.)
          vA = smoothstep(${BOX / 2}.0, ${BOX / 2 - 5}.0, length(w - uCam)) * smoothstep(0.15, 0.6, d) * (0.65 + 0.35 * sin(uT * (2.0 + 4.0 * fract(s * 13.0)) + ph));
        }`,
      fragmentShader: `uniform float uLight; varying float vA;
        void main() { float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard; gl_FragColor = vec4(vec3(0.93, 0.95, 1.0) * uLight, vA * smoothstep(0.5, 0.2, r)); }`,
    });
    this.pts = new THREE.Points(g, m);
    this.pts.frustumCulled = false; this.pts.visible = false;
    scene.add(this.pts);
  }

  /** amount 0..1; light 0..1 (the sky's); covered: a roof or the ground over his head; h the canvas's height in
   *  pixels and fov the camera's (degrees), for the flakes' size. */
  update(t: number, cam: THREE.Vector3, amount: number, covered: boolean, light: number, h: number, fov: number) {
    const on = amount > 0.02 && !covered;
    this.pts.visible = on;
    if (!on) return;
    this.pts.geometry.setDrawRange(0, Math.floor(N * Math.min(1, amount)));
    this.u.uT.value = t; this.u.uCam.value.copy(cam); this.u.uLight.value = light;
    this.u.uScale.value = h / 2 / Math.tan((fov * Math.PI) / 360);
  }
}
