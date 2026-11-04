// Snow lying (U-097): on the ground, roofs, ledges and anything else facing up and open to the sky, as deep as the
// sim's cover, patchy at first and whole once it's lain a while; never indoors or under a roof. What's open to the
// sky is read from a top-down map of the highest solid over each 2 m of the city (built once, when it's first
// needed): a surface at or above that height is out in the open.
import * as THREE from 'three';
import { SEASON_U } from './season';
import { MAT } from '../world/mats';
import { topAt, frameIn, type SolidIndex } from '../world/geom';

const CELL = 2;
export const TOPS = { map: { value: new THREE.DataTexture(new Float32Array([-1e4]), 1, 1, THREE.RedFormat, THREE.FloatType) }, o: { value: new THREE.Vector2() }, s: { value: new THREE.Vector2(1, 1) } };
TOPS.map.value.needsUpdate = true;
let built = false;

/** The map of tops for the world's solids (each 2 m cell whose middle a solid covers takes its top). */
export function buildTops(idx: SolidIndex) {
  if (built) return;
  built = true;
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  const all = idx.solids.filter(s => s.mat !== MAT.hidden && s.mat !== MAT.water);
  for (const s of all) { x0 = Math.min(x0, s.x0); z0 = Math.min(z0, s.z0); x1 = Math.max(x1, s.x1); z1 = Math.max(z1, s.z1); }
  if (!all.length) return;
  const w = Math.ceil((x1 - x0) / CELL) + 1, h = Math.ceil((z1 - z0) / CELL) + 1, top = new Float32Array(w * h).fill(-1e4);
  for (const s of all) {
    for (let j = Math.ceil((s.z0 - z0) / CELL - 0.5), j1 = Math.floor((s.z1 - z0) / CELL - 0.5); j <= j1; j++)
      for (let i = Math.ceil((s.x0 - x0) / CELL - 0.5), i1 = Math.floor((s.x1 - x0) / CELL - 0.5), k = j * w; i <= i1; i++) {
        // (A sloping or turned solid, its own top at the cell's middle: a pitched roof's slope, not its ridge.)
        const cx = x0 + (i + 0.5) * CELL, cz = z0 + (j + 0.5) * CELL;
        if (s.rot) { const [lx, lz] = frameIn(s, cx, cz), q = s.rot; if (lx < q.x0 || lx > q.x1 || lz < q.z0 || lz > q.z1) continue; }
        const y = s.ramp ? topAt(s, cx, cz) : s.y1;
        if (top[k + i] < y) top[k + i] = y;
      }
  }
  const t = new THREE.DataTexture(top, w, h, THREE.RedFormat, THREE.FloatType);
  t.needsUpdate = true;
  TOPS.map.value = t; TOPS.o.value.set(x0, z0); TOPS.s.value.set(1 / (w * CELL), 1 / (h * CELL));
}

/** Into a material's shaders: the snow over what it draws. */
export function snowPatch(sh: THREE.WebGLProgramParametersWithUniforms, leaves = 0) {
  sh.uniforms.uSnow = SEASON_U.snow; sh.uniforms.uLitter = SEASON_U.litter; sh.uniforms.uStraw = SEASON_U.straw; sh.uniforms.uTops = TOPS.map; sh.uniforms.uTopsO = TOPS.o; sh.uniforms.uTopsS = TOPS.s;
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSnowW;\nvarying float vSnowUp;')
    .replace('#include <project_vertex>', '#include <project_vertex>\nvSnowW = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvSnowUp = normalize(mat3(modelMatrix) * objectNormal).y;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vSnowW;\nvarying float vSnowUp;\nuniform float uSnow;\nuniform float uLitter;\nuniform float uStraw;\nuniform sampler2D uTops;\nuniform vec2 uTopsO, uTopsS;\nfloat snowHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }')
    .replace('#include <color_fragment>', `#include <color_fragment>
${leaves >= 1 ? `// (The grass drying to straw, as the open ground's does: M5-28.)
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.4))) * vec3(1.25, 1.05, 0.62), uStraw * 0.8);
` : ''}${leaves > 0 ? `// Fallen leaves (U-104): one here and there on a 30 cm grid, lying flat, gold, brown and rust; in drifts.
if (uLitter > 0.001 && vSnowUp > 0.7) {
  vec2 lc = vSnowW.xz * 3.3, li = floor(lc), lf = fract(lc) - 0.5;
  float lh = snowHash(li), lh2 = fract(lh * 97.13), drift = snowHash(floor(vSnowW.xz * 0.35));
  float ang = lh2 * 6.2832; vec2 lr = vec2(cos(ang) * lf.x - sin(ang) * lf.y, sin(ang) * lf.x + cos(ang) * lf.y);
  float leaf = step(lh, uLitter * ${leaves.toFixed(2)} * (0.45 + 0.7 * step(0.55, drift))) * (1.0 - smoothstep(0.26, 0.32, length(lr * vec2(1.0, 1.9))));
  vec3 leafCol = mix(mix(vec3(0.55, 0.30, 0.09), vec3(0.66, 0.48, 0.13), lh2), vec3(0.42, 0.15, 0.06), step(0.7, fract(lh * 13.7)));
  diffuseColor.rgb = mix(diffuseColor.rgb, leafCol * (0.7 + 0.3 * lh2), leaf);
}
` : ''}if (uSnow > 0.001) {
  float open = step(texture2D(uTops, (vSnowW.xz - uTopsO) * uTopsS).r - 0.3, vSnowW.y);
  // (Patchy as it starts to lie, in drifts a metre or two across, with a grain of its own; whole once it's deep.)
  vec2 q = vSnowW.xz * 0.6, f = fract(q), e = f * f * (3.0 - 2.0 * f), c = floor(q);
  float n = mix(mix(snowHash(c), snowHash(c + vec2(1, 0)), e.x), mix(snowHash(c + vec2(0, 1)), snowHash(c + 1.0), e.x), e.y) * 0.75 + snowHash(floor(vSnowW.xz * 9.0)) * 0.25;
  float k = open * smoothstep(0.55, 0.85, vSnowUp) * smoothstep(n - 0.05, n + 0.15, uSnow * 1.25);
  // (Not flat white: a soft unevenness and a grain, and what's under it showing through a little where it's thin.)
  float g = snowHash(floor(vSnowW.xz * 23.0)) * 0.06 + n * 0.08;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.8, 0.82, 0.87) + g, k * (0.86 + 0.08 * smoothstep(0.6, 1.0, uSnow)));
}`);
}
