// The four ways out's far ends (M10-51, DESIGN section 10): an 'ending:<route>' zone each, where crossing into it ends
// the run on that route (sim/escape.ts). Each lies where only its way gets him: off the far end of the Dongshuimen
// Bridge on the Nan'an bank; out over the Yangtze on the cableway's line at the cabins' height; on the open river past
// Chaotianmen's tip, downstream of the river police's buoys; and in the metro's running tunnel on east past the
// crossover under Xiaoshizi, under the river.
import type { World, Zone } from '../world';
import { GEO } from '../geo';
import { heightAt } from '../heightfield';
import { streets, WATER_Y } from './ground';

export function exitZones(w: World): Zone[] {
  const L = GEO.landmarks, g = w.ground!, out: Zone[] = [], h = (x: number, z: number) => heightAt(g, x, z) ?? WATER_Y;
  const box = (route: string, x: number, z: number, r: number, y0: number, y1: number) => out.push({ kind: `ending:${route}`, box: { x0: x - r, y0, z0: z - r, x1: x + r, y1, z1: z + r } });
  // The bridge: where its deck comes down onto the far bank (of its points across the river, on dry ground well up off
  // the water, the nearest Xiaoshizi).
  const XS = L.xiaoshizi, dist = (p: [number, number]) => Math.hypot(p[0] - XS.x, p[1] - XS.z);
  const far = streets().filter(s => s.name === '东水门大桥').flatMap(s => s.pts).filter(p => dist(p) > 700 && (heightAt(g, p[0], p[1]) ?? -Infinity) > WATER_Y + 20).sort((a, b) => dist(a) - dist(b))[0];
  if (far) box('bridge', far[0], far[1], 25, h(far[0], far[1]) - 6, h(far[0], far[1]) + 12);
  // The cableway: three fifths of the way along its ropes (yuzhong/cableway.ts), well up off the water.
  const [N, S] = w.features.filter(f => f.kind === 'cable:rope');
  if (N && S) box('cable', N.x + (S.x - N.x) * 0.6, N.z + (S.z - N.z) * 0.6, 40, WATER_Y + 20, WATER_Y + 160);
  // The river: past the tip, on and under the water, a long way from either bank.
  const T = L.chaotianmen;
  if (T) box('boat', T.x + 500, T.z - 480, 120, WATER_Y - 40, WATER_Y + 6);
  // Under the ground: the running tunnel's level, on east from the crossover chamber under Xiaoshizi.
  const tube = w.teleports.find(t => t.name === 'Metro tunnel');
  if (tube && XS) out.push({ kind: 'ending:tunnel', box: { x0: XS.x + 16, y0: tube.y - 3, z0: tube.z - 8, x1: XS.x + 60, y1: tube.y + 6, z1: tube.z + 8 } });
  return out;
}
