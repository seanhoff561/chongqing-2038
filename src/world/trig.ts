// sin, cos, tan and atan2 the same to the last bit in every browser and in Node: fdlibm's, as Node's V8 has them.
// Engines' own Math.sin and the rest differ in the last bit (Chrome's from Node's), and the city's build rounds and
// compares what they give, so the same seed built a different city in the browser than in the tests. The city is
// built with these (src/world never calls Math's); tests/sim/samecity.test.ts and tests/e2e/samecity.e2e.mjs hold it.
const F = new Float64Array(1), U = new Int32Array(F.buffer);
/** A double's high and low 32-bit words, and a double from them (little-endian, as every engine the game runs on). */
const hi = (x: number) => { F[0] = x; return U[1]; };
const lo = (x: number) => { F[0] = x; return U[0]; };
const make = (h: number, l: number) => { U[1] = h; U[0] = l; return F[0]; };

const PIO2_1 = 1.57079632673412561417e+00, PIO2_1T = 6.07710050650619224932e-11, PIO2_2 = 6.07710050630396597660e-11,
  PIO2_2T = 2.02226624879595063154e-21, PIO2_3 = 2.02226624871116645580e-21, PIO2_3T = 8.47842766036889956997e-32;
const NPIO2_HW = [0x3FF921FB, 0x400921FB, 0x4012D97C, 0x401921FB, 0x401F6A7A, 0x4022D97C, 0x4025FDBB, 0x402921FB, 0x402C463A, 0x402F6A7A,
  0x4031475C, 0x4032D97C, 0x40346B9C, 0x4035FDBB, 0x40378FDB, 0x403921FB, 0x403AB41B, 0x403C463A, 0x403DD85A, 0x403F6A7A, 0x40407E4C,
  0x4041475C, 0x4042106C, 0x4042D97C, 0x4043A28C, 0x40446B9C, 0x404534AC, 0x4045FDBB, 0x4046C6CB, 0x40478FDB, 0x404858EB, 0x404921FB];
/** x less the nearest multiple n of pi/2, as Y0 + Y1; returns n. */
let Y0 = 0, Y1 = 0;
function remPio2(x: number): number {
  const hx = hi(x), ix = hx & 0x7fffffff;
  if (ix < 0x4002d97c) { // |x| < 3pi/4
    const s = hx > 0 ? 1 : -1;
    let z = x - s * PIO2_1;
    if (ix !== 0x3ff921fb) { Y0 = z - s * PIO2_1T; Y1 = (z - Y0) - s * PIO2_1T; }
    else { z -= s * PIO2_2; Y0 = z - s * PIO2_2T; Y1 = (z - Y0) - s * PIO2_2T; }
    return s;
  }
  // (Past 2^19 pi/2 fdlibm needs its long reduction; no angle in a city comes near it.)
  if (ix > 0x413921fb) throw new Error(`trig: angle ${x} out of range`);
  const t = Math.abs(x), n = (t * 6.36619772367581382433e-01 + 0.5) | 0;
  let r = t - n * PIO2_1, w = n * PIO2_1T;
  Y0 = r - w;
  if (!(n < 32 && ix !== NPIO2_HW[n - 1])) {
    const j = ix >> 20;
    if (j - ((hi(Y0) >> 20) & 0x7ff) > 16) {
      let u = r; w = n * PIO2_2; r = u - w; w = n * PIO2_2T - ((u - r) - w); Y0 = r - w;
      if (j - ((hi(Y0) >> 20) & 0x7ff) > 49) { u = r; w = n * PIO2_3; r = u - w; w = n * PIO2_3T - ((u - r) - w); Y0 = r - w; }
    }
  }
  Y1 = (r - Y0) - w;
  if (hx < 0) { Y0 = -Y0; Y1 = -Y1; return -n; }
  return n;
}

function kSin(x: number, y: number, iy: number): number {
  if ((hi(x) & 0x7fffffff) < 0x3e400000) return x;
  const z = x * x, v = z * x, r = 8.33333333332248946124e-03 + z * (-1.98412698298579493134e-04 + z * (2.75573137070700676789e-06 + z * (-2.50507602534068634195e-08 + z * 1.58969099521155010221e-10)));
  return iy === 0 ? x + v * (-1.66666666666666324348e-01 + z * r) : x - ((z * (0.5 * y - v * r) - y) - v * -1.66666666666666324348e-01);
}

function kCos(x: number, y: number): number {
  const ix = hi(x) & 0x7fffffff;
  if (ix < 0x3e400000) return 1;
  const z = x * x, r = z * (4.16666666666666019037e-02 + z * (-1.38888888888741095749e-03 + z * (2.48015872894767294178e-05 + z * (-2.75573143513906633035e-07 + z * (2.08757232129817482790e-09 + z * -1.13596475577881948265e-11)))));
  if (ix < 0x3fd33333) return 1 - (0.5 * z - (z * r - x * y));
  const qx = ix > 0x3fe90000 ? 0.28125 : make(ix - 0x00200000, 0);
  return (1 - qx) - ((0.5 * z - qx) - (z * r - x * y));
}

const T = [3.33333333333334091986e-01, 1.33333333333201242699e-01, 5.39682539762260521377e-02, 2.18694882948595424599e-02, 8.86323982359930005737e-03,
  3.59207910759131235356e-03, 1.45620945432529025516e-03, 5.88041240820264096874e-04, 2.46463134818469906812e-04, 7.81794442939557092300e-05,
  7.14072491382608190305e-05, -1.85586374855275456654e-05, 2.59073051863633712884e-05];
function kTan(x: number, y: number, iy: number): number {
  const hx = hi(x), ix = hx & 0x7fffffff;
  if (ix < 0x3e300000) {
    if (((ix | lo(x)) | (iy + 1)) === 0) return 1 / Math.abs(x);
    if (iy === 1) return x;
    const w = x + y, z = make(hi(w), 0), v = y - (z - x), a = -1 / w, t = make(hi(a), 0), s = 1 + t * z;
    return t + a * (s + t * v);
  }
  const big = ix >= 0x3fe59428; // |x| >= 0.6744
  if (big) { if (hx < 0) { x = -x; y = -y; } x = (7.85398163397448278999e-01 - x) + (3.06161699786838301793e-17 - y); y = 0; }
  const z = x * x, w = z * z, s = z * x;
  let r = T[1] + w * (T[3] + w * (T[5] + w * (T[7] + w * (T[9] + w * T[11]))));
  const v = z * (T[2] + w * (T[4] + w * (T[6] + w * (T[8] + w * (T[10] + w * T[12])))));
  r = y + z * (s * (r + v) + y);
  r += T[0] * s;
  const ww = x + r;
  if (big) return (1 - ((hx >> 30) & 2)) * (iy - 2 * (x - (ww * ww / (ww + iy) - r)));
  if (iy === 1) return ww;
  const zz = make(hi(ww), 0), vv = r - (zz - x), a = -1 / ww, t = make(hi(a), 0), ss = 1 + t * zz;
  return t + a * (ss + t * vv);
}

export function sin(x: number): number {
  const ix = hi(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kSin(x, 0, 0);
  if (ix >= 0x7ff00000) return NaN;
  const n = remPio2(x) & 3;
  return n === 0 ? kSin(Y0, Y1, 1) : n === 1 ? kCos(Y0, Y1) : n === 2 ? -kSin(Y0, Y1, 1) : -kCos(Y0, Y1);
}

export function cos(x: number): number {
  const ix = hi(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kCos(x, 0);
  if (ix >= 0x7ff00000) return NaN;
  const n = remPio2(x) & 3;
  return n === 0 ? kCos(Y0, Y1) : n === 1 ? -kSin(Y0, Y1, 1) : n === 2 ? -kCos(Y0, Y1) : kSin(Y0, Y1, 1);
}

export function tan(x: number): number {
  const ix = hi(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kTan(x, 0, 1);
  if (ix >= 0x7ff00000) return NaN;
  const n = remPio2(x) & 1;
  return kTan(Y0, Y1, 1 - (n << 1));
}

const ATANHI = [4.63647609000806093515e-01, 7.85398163397448278999e-01, 9.82793723247329054082e-01, 1.57079632679489655800e+00],
  ATANLO = [2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17, 6.12323399573676603587e-17],
  AT = [3.33333333333329318027e-01, -1.99999999998764832476e-01, 1.42857142725034663711e-01, -1.11111104054623557880e-01, 9.09088713343650656196e-02,
    -7.69187620504482999495e-02, 6.66107313738753120669e-02, -5.83357013379057348645e-02, 4.97687799461593236017e-02, -3.65315727442169155270e-02,
    1.62858201153657823623e-02];
function atan(x: number): number {
  const hx = hi(x), ix = hx & 0x7fffffff;
  let id = -1;
  if (ix >= 0x44100000) { // |x| >= 2^66
    if (x !== x) return x;
    return hx > 0 ? ATANHI[3] + ATANLO[3] : -ATANHI[3] - ATANLO[3];
  }
  if (ix < 0x3fdc0000) { if (ix < 0x3e400000) return x; } // |x| < 0.4375
  else {
    x = Math.abs(x);
    if (ix < 0x3ff30000) { if (ix < 0x3fe60000) { id = 0; x = (2 * x - 1) / (2 + x); } else { id = 1; x = (x - 1) / (x + 1); } }
    else if (ix < 0x40038000) { id = 2; x = (x - 1.5) / (1 + 1.5 * x); }
    else { id = 3; x = -1 / x; }
  }
  const z = x * x, w = z * z;
  const s1 = z * (AT[0] + w * (AT[2] + w * (AT[4] + w * (AT[6] + w * (AT[8] + w * AT[10]))))), s2 = w * (AT[1] + w * (AT[3] + w * (AT[5] + w * (AT[7] + w * AT[9]))));
  if (id < 0) return x - x * (s1 + s2);
  const r = ATANHI[id] - ((x * (s1 + s2) - ATANLO[id]) - x);
  return hx < 0 ? -r : r;
}

const PI = 3.1415926535897931160E+00, PI_LO = 1.2246467991473531772E-16, PIO2 = 1.5707963267948965580E+00, PIO4 = 7.8539816339744827900E-01;
export function atan2(y: number, x: number): number {
  if (x !== x || y !== y) return NaN;
  const hx = hi(x), lx = lo(x), ix = hx & 0x7fffffff, hy = hi(y), ly = lo(y), iy = hy & 0x7fffffff;
  if (((hx - 0x3ff00000) | lx) === 0) return atan(y); // x = 1
  let m = ((hy >> 31) & 1) | ((hx >> 30) & 2);
  if ((iy | ly) === 0) return m < 2 ? y : m === 2 ? PI : -PI; // y = 0
  if ((ix | lx) === 0) return hy < 0 ? -PIO2 : PIO2; // x = 0
  if (ix === 0x7ff00000) {
    if (iy === 0x7ff00000) return [PIO4, -PIO4, 3 * PIO4, -3 * PIO4][m];
    return [0, -0, PI, -PI][m];
  }
  if (iy === 0x7ff00000) return hy < 0 ? -PIO2 : PIO2;
  const k = (iy - ix) >> 20;
  let z: number;
  if (k > 60) { z = PIO2 + 0.5 * PI_LO; m &= 1; } else if (hx < 0 && k < -60) z = 0; else z = atan(Math.abs(y / x));
  return m === 0 ? z : m === 1 ? -z : m === 2 ? PI - (z - PI_LO) : (z - PI_LO) - PI;
}
