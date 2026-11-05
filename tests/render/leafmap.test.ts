// M10-62 (U-107): fallen leaves lie under and round the trees, thickest by the trunk and thinning outward, uneven, and
// none far from any tree.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { buildLeafMap, LEAFMAP, LEAFY, LEAF_REACH, leafFall } from '../../src/render/leafmap';

const w = getWorld('yuzhong');
buildLeafMap(w);
const tex = LEAFMAP.map.value, { width: W, height: H } = tex.image, data = tex.image.data as Uint8Array;
/** How thick they lie at (x, z), 0 to 1, read from the map as the shader does (nearest cell). */
const at = (x: number, z: number) => {
  const i = Math.floor((x - LEAFMAP.o.value.x) * LEAFMAP.s.value.x * W), j = Math.floor((z - LEAFMAP.o.value.y) * LEAFMAP.s.value.y * H);
  return i < 0 || j < 0 || i >= W || j >= H ? 0 : data[(j * W + i) * 4] / 255;
};

describe('fallen leaves under the trees (M10-62)', () => {
  it('fall thickest by the trunk, thinning out to nothing past 1.8 crowns', () => {
    const R = LEAFY.camphor[0];
    expect(leafFall('camphor', 0)).toBeGreaterThan(leafFall('camphor', R));
    expect(leafFall('camphor', R)).toBeGreaterThan(leafFall('camphor', R * 1.6));
    expect(leafFall('camphor', R * LEAF_REACH)).toBe(0);
    expect(leafFall('lamppost', 0)).toBe(0);
  });

  it('lie round the city\'s trees, thicker by them than out at their edge, and nowhere far from one', () => {
    const trees = w.props.filter(p => LEAFY[p.kind] && p.kind !== 'hedge');
    expect(trees.length).toBeGreaterThan(50);
    let nearer = 0;
    for (const t of trees.slice(0, 200)) {
      const R = LEAFY[t.kind][0];
      if (at(t.x, t.z) > at(t.x + R * 1.5, t.z)) nearer++;
    }
    expect(nearer / Math.min(200, trees.length)).toBeGreaterThan(0.8);
    // Far from every tree and bush (more than their reach), none.
    const far = (x: number, z: number) => w.props.every(p => !LEAFY[p.kind] || Math.hypot(p.x - x, p.z - z) > (LEAFY[p.kind][0] + (p.w ?? 0)) * LEAF_REACH + 3);
    let open = 0;
    for (let k = 0; k < 400 && open < 40; k++) {
      const t = trees[k % trees.length], x = t.x + 30 + (k * 7.3) % 60, z = t.z - 30 + (k * 13.1) % 60;
      if (!far(x, z)) continue;
      open++;
      expect(at(x, z), `${x.toFixed(0)}, ${z.toFixed(0)}`).toBe(0);
    }
    expect(open).toBeGreaterThan(10);
  });

  it('lie unevenly: the same distance out from different trees, not the same thickness', () => {
    const vals = new Set(w.props.filter(p => p.kind === 'camphor').slice(0, 40).map(p => Math.round(at(p.x + 2, p.z) * 20)));
    expect(vals.size).toBeGreaterThan(3);
  });
});
