// Snow lying (U-097): on the ground, roofs, ledges and anything else facing up and open to the sky, as deep as the
// sim's cover, patchy at first and whole once it's lain a while; never indoors or under a roof. What's open to the
// sky is read from a top-down map of the highest solid over each 2 m of the city (built once, when it's first
// needed): a surface at or above that height is out in the open.
import * as THREE from 'three';
import { SEASON_U } from './season';
import { MAT } from '../world/mats';
import { LEAFMAP } from './leafmap';
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

/** One layer of fallen leaves on a grid (p in cells, a leaf a cell at most), `dens` the share of cells with one,
 *  `gold` the share that are a ginkgo's; painted over `col`. */
const LEAF_GLSL = `uniform sampler2D uLeafMap;
uniform vec2 uLeafO, uLeafS;
uniform float uWet;
void leafLayer(vec2 p, float dens, float gold, float seed, inout vec3 col) {
  vec2 li = floor(p);
  float h = snowHash(li + seed * 41.0), h2 = fract(h * 97.13), h3 = fract(h * 31.71), h4 = fract(h * 57.37), h5 = fract(h * 13.7);
  if (h >= dens) return;
  // (Off the cell's middle, its own size and turn; its stem end at -y.)
  vec2 f = fract(p) - 0.5 - (vec2(h3, h4) - 0.5) * 0.4;
  float ang = h2 * 6.2832, sz = 0.75 + 0.5 * h3;
  vec2 q = vec2(cos(ang) * f.x - sin(ang) * f.y, sin(ang) * f.x + cos(ang) * f.y) / sz;
  float a = atan(q.x, q.y), r = length(q), edge;
  bool ginkgo = h5 < gold;
  if (ginkgo) {
    // A ginkgo's fan, notched in the middle of its edge.
    vec2 s = q + vec2(0.0, 0.2);
    float fa = atan(s.x, s.y), fr = length(s);
    edge = (abs(fa) < 0.95 ? 1.0 : 0.0) * (fr < 0.36 - 0.07 * exp(-fa * fa * 60.0) ? 1.0 : 0.0) * (fr > 0.03 ? 1.0 : 0.0);
  } else if (h5 < gold + (1.0 - gold) * 0.5) {
    // Lobed, five points (a plane tree's or a maple's).
    edge = r < 0.19 * (0.62 + 0.38 * pow(abs(cos(2.5 * a)), 0.7)) ? 1.0 : 0.0;
  } else {
    // An oval with a point (a camphor's, a fig's).
    float y = q.y / 0.3;
    edge = (abs(y) < 1.0 && abs(q.x) < 0.13 * (1.0 - y * y) * (1.0 + 0.25 * y)) ? 1.0 : 0.0;
  }
  // (Some broken, a bite out of one side.)
  if (fract(h * 7.31) < 0.2 && dot(q, vec2(cos(h4 * 6.3), sin(h4 * 6.3))) > 0.05) edge = 0.0;
  if (edge < 0.5) return;
  // Browns, tans, golds, rusts and reds; a ginkgo's bright gold; each a little lighter or darker.
  float k = fract(h * 3.97);
  vec3 c = k < 0.3 ? vec3(0.36, 0.21, 0.09) : k < 0.5 ? vec3(0.55, 0.40, 0.19) : k < 0.68 ? vec3(0.70, 0.50, 0.13) : k < 0.85 ? vec3(0.56, 0.20, 0.07) : vec3(0.40, 0.11, 0.06);
  if (ginkgo) c = vec3(0.86, 0.66, 0.12);
  c *= 0.8 + 0.35 * h4;
  // Curled: lit on one side, shaded on the other and at its rim; its midrib and veins darker.
  float side = q.x / (0.2 * sz);
  c *= 0.82 + 0.22 * smoothstep(-1.0, 1.0, side) - 0.12 * smoothstep(0.12, 0.3, r);
  if (!ginkgo && abs(q.x) < 0.012 && abs(q.y) < 0.27) c *= 0.7;
  if (!ginkgo && abs(abs(q.x) - (q.y + 0.1) * 0.6) < 0.008 && q.y > -0.1) c *= 0.85;
  if (ginkgo && fract(atan(q.x, q.y + 0.2) * 9.0) < 0.12) c *= 0.9;
  // (Older ones under the newer: the second layer darker; all of them darker wet.)
  c *= (1.0 - 0.18 * seed) * (1.0 - 0.4 * uWet);
  col = c;
}
`;

/** Into a material's shaders: the snow over what it draws. */
/** `leaves` and `straw`: GLSL for how thick fallen leaves lie on it (0 none, 1 grass's) and how far its grass dries to
 *  straw with the season (U-104), '' for neither. */
export function snowPatch(sh: THREE.WebGLProgramParametersWithUniforms, leaves = '', straw = '') {
  sh.uniforms.uSnow = SEASON_U.snow; sh.uniforms.uLitter = SEASON_U.litter; sh.uniforms.uDry = SEASON_U.straw; sh.uniforms.uTops = TOPS.map; sh.uniforms.uTopsO = TOPS.o; sh.uniforms.uTopsS = TOPS.s;
  sh.uniforms.uLeafMap = LEAFMAP.map; sh.uniforms.uLeafO = LEAFMAP.o; sh.uniforms.uLeafS = LEAFMAP.s; sh.uniforms.uWet = SEASON_U.wet;
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSnowW;\nvarying float vSnowUp;')
    .replace('#include <project_vertex>', '#include <project_vertex>\nvSnowW = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvSnowUp = normalize(mat3(modelMatrix) * objectNormal).y;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vSnowW;\nvarying float vSnowUp;\nuniform float uSnow;\nuniform float uLitter;\nuniform float uDry;\nuniform sampler2D uTops;\nuniform vec2 uTopsO, uTopsS;\nfloat snowHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n' + LEAF_GLSL)
    .replace('#include <color_fragment>', `#include <color_fragment>
${straw ? `// (The grass drying to straw, as the open ground's does: M5-28.)
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.4))) * vec3(1.25, 1.05, 0.62), uDry * 0.8 * (${straw}));
` : ''}${leaves ? `// Fallen leaves (U-104, U-107): under and round the trees (the leaf map), two overlapping layers of them, each leaf
// its own shape (lobed, a ginkgo's fan, an oval with a point; some broken), turned, curled, veined, in browns, golds
// and reds, darker wet.
if (uLitter > 0.001 && vSnowUp > 0.7) {
  vec4 lm = texture2D(uLeafMap, (vSnowW.xz - uLeafO) * uLeafS);
  vec2 dq = vSnowW.xz * 0.45, df = fract(dq), de = df * df * (3.0 - 2.0 * df), dc = floor(dq);
  float drift = mix(mix(snowHash(dc + 7.0), snowHash(dc + vec2(8, 7)), de.x), mix(snowHash(dc + vec2(7, 8)), snowHash(dc + 8.0), de.x), de.y);
  float dens = uLitter * mix(0.35, 1.0, ${leaves}) * pow(lm.r, 0.8) * (0.45 + 1.1 * drift) * 2.2;
  if (dens > 0.002) {
    // (Far off, too small to see one by one: the ground tinted by them.)
    float far = smoothstep(6.0, 28.0, length(vSnowW - cameraPosition));
    diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.48, 0.30, 0.12), vec3(0.8, 0.6, 0.12), lm.g) * (1.0 - 0.4 * uWet), min(0.85, dens * 0.8) * far);
    if (far < 1.0) {
      // (By the trunk a third layer: a carpet of them.)
      if (dens > 0.5) leafLayer(mat2(0.6, -0.8, 0.8, 0.6) * vSnowW.xz * 4.6 + 33.0, (dens - 0.5) * 1.4, lm.g, 1.0, diffuseColor.rgb);
      leafLayer(mat2(0.8, 0.6, -0.6, 0.8) * vSnowW.xz * 3.9 + 17.0, dens * 0.8, lm.g, 0.6, diffuseColor.rgb);
      leafLayer(vSnowW.xz * 3.1, dens, lm.g, 0.0, diffuseColor.rgb);
    }
  }
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
