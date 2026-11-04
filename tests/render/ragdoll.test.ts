// M10-47: a machine on the ground destroyed comes down as a ragdoll: its parts fall and settle on the ground (none
// under it), lie still within 3 s, lower than it stood; the same machine falls the same way each time.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { RIGS } from '../../src/render/machines';
import { ragdoll, settle, type Ground } from '../../src/render/ragdoll';

function down(kind: 'humanoid' | 'quadruped', id: number, ground: Ground) {
  const rig = RIGS[kind], M = rig.parts.map(() => new THREE.Matrix4()), at = new THREE.Matrix4().makeRotationY(1).setPosition(5, 0, 3);
  rig.pose({ speed: 1.8, phase: 0.7, aim: 0, crouch: 0, t: 0, v: id }, M);
  const r = ragdoll(M.map(m => m.premultiply(at)), rig.parts, new THREE.Vector3(5, 0, 3), id);
  let t = 0;
  while (!settle(r, 1 / 60, ground) && t < 5) t += 1 / 60;
  return { r, t };
}
/** The lowest and highest of a part's box corners in the world. */
function span(r: ReturnType<typeof ragdoll>, j: number, g: THREE.BufferGeometry) {
  const b = g.boundingBox!, v = new THREE.Vector3();
  let lo = Infinity, hi = -Infinity;
  for (let k = 0; k < 8; k++) {
    v.set(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z).applyMatrix4(r.parts[j].m);
    lo = Math.min(lo, v.y); hi = Math.max(hi, v.y);
  }
  return { lo, hi };
}

describe('a machine destroyed comes down (M10-47)', () => {
  for (const kind of ['humanoid', 'quadruped'] as const)
    for (const id of [1, 2, 7]) it(`a ${kind} (${id}) settles on the ground within 3 s, lying lower than it stood`, () => {
      const { r, t } = down(kind, id, () => 0);
      expect(t).toBeLessThan(3);
      let top = -Infinity;
      RIGS[kind].parts.forEach((g, j) => { const s = span(r, j, g); expect(s.lo, `part ${j}`).toBeGreaterThan(-0.02); top = Math.max(top, s.hi); });
      expect(top).toBeLessThan(kind === 'humanoid' ? 1.1 : 0.6);
      // (Still: more time moves nothing.)
      const before = r.parts.map(b => b.m.clone());
      settle(r, 1, () => 0);
      r.parts.forEach((b, j) => expect(b.m.equals(before[j])).toBe(true));
    });
  it('lands on the ground under each part (a step), and falls the same way each time', () => {
    const step: Ground = x => (x > 5.3 ? -0.5 : 0);
    const a = down('humanoid', 3, step), b = down('humanoid', 3, step);
    RIGS.humanoid.parts.forEach((g, j) => {
      expect(a.r.parts[j].m.equals(b.r.parts[j].m)).toBe(true);
      const p = a.r.parts[j].p;
      expect(span(a.r, j, g).lo, `part ${j}`).toBeGreaterThan(step(p.x, p.y, p.z) - 0.02);
    });
  });
});
