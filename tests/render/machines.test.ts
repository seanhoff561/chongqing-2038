// M4-26 (U-031): the machines' rigs. Every kind has a model; a humanoid's hands are on its rifle's grip and fore-end at
// the low ready and aiming (the rifle then up under its eye, pointing ahead); its stride swings its feet and crouching
// lowers it; a quadruped trots on diagonal pairs; drones' rotors turn.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { RIGS, type Anim } from '../../src/render/machines';
import { UNITS } from '../../src/data/units';

const M = Array.from({ length: 16 }, () => new THREE.Matrix4());
const pose = (k: keyof typeof RIGS, a: Partial<Anim>) => { RIGS[k].pose({ speed: 0, phase: 0, aim: 0, crouch: 0, t: 0, ...a }, M); return M; };
const pt = (i: number, x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(M[i]);

describe("the machines' models (M4-26)", () => {
  it('has a model for every kind of machine, its parts white with lit eyes', () => {
    for (const k of Object.keys(UNITS) as (keyof typeof RIGS)[]) {
      expect(RIGS[k], k).toBeDefined();
      expect(RIGS[k].parts.length, k).toBeGreaterThan(0);
    }
    for (const k of ['humanoid', 'quadruped', 'drone', 'hunter', 'turret', 'camera'] as const) {
      const g = RIGS[k].parts.map(p => p.attributes), lit = g.some(a => Array.from(a.glow.array).some(v => v > 0));
      const white = g.some(a => { const c = a.color.array; for (let i = 0; i < c.length; i += 3) if (c[i] > 0.7 && c[i + 1] > 0.7 && c[i + 2] > 0.7) return true; return false; });
      expect(lit && white, k).toBe(true);
    }
  });
  it("a humanoid's hands hold its rifle, low and aimed; aimed, it's up under the eye and pointing ahead", () => {
    for (const aim of [0, 1]) {
      pose('humanoid', { aim });
      expect(pt(6, 0, -0.33, 0).distanceTo(pt(11, 0, -0.1, -0.02)), `grip ${aim}`).toBeLessThan(0.03);
      expect(pt(4, 0, -0.33, 0).distanceTo(pt(11, 0, -0.06, 0.2)), `fore-end ${aim}`).toBeLessThan(0.03);
    }
    pose('humanoid', { aim: 1 });
    const muzzle = pt(11, 0, 0.02, 0.76), grip = pt(11, 0, 0, 0), eye = pt(2, 0, 0.15, 0.15);
    expect(muzzle.z - grip.z).toBeGreaterThan(0.6);
    expect(Math.abs(muzzle.y - grip.y)).toBeLessThan(0.25);
    expect(eye.y - grip.y).toBeGreaterThan(0.1);
    expect(eye.y - grip.y).toBeLessThan(0.45);
    pose('humanoid', { aim: 0 });
    expect(pt(11, 0, 0.02, 0.76).y).toBeLessThan(pt(11, 0, 0, 0).y - 0.2);
  });
  it('strides, its feet swinging fore and aft; crouched, it is half a metre lower', () => {
    const foot = (phase: number) => (pose('humanoid', { speed: 2.5, phase }), pt(8, 0, -0.46, 0.05));
    const a = foot(Math.PI / 2), b = foot(-Math.PI / 2);
    expect(Math.abs(a.z - b.z)).toBeGreaterThan(0.4);
    const head = (crouch: number) => (pose('humanoid', { crouch }), pt(2, 0, 0.14, 0).y);
    expect(head(0) - head(1)).toBeGreaterThan(0.3);
    expect(head(0)).toBeGreaterThan(1.8);
  });
  it('a quadruped trots on diagonal pairs; rotors turn', () => {
    pose('quadruped', { speed: 3, phase: 0.8 });
    const feet = [2, 4, 6, 8].map(i => pt(i + 1, 0, -0.38, 0).z - pt(i, 0, 0, 0).z);
    expect(Math.abs(feet[0] - feet[3])).toBeLessThan(0.02);
    expect(Math.abs(feet[0] - feet[1])).toBeGreaterThan(0.1);
    for (const k of ['drone', 'hunter'] as const) {
      const tip = (t: number) => (pose(k, { t }), pt(1, 0.15, 0, 0));
      expect(tip(0).distanceTo(tip(0.01)), k).toBeGreaterThan(0.05);
    }
  });
});
