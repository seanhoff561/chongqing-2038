// M6-09: the western border wall across the Eling neck (yuzhong/borderwall.ts): floodlit, turrets on it looking into
// the city, and no way across it within his movement: run at it he stops at its face, any way up onto it ends on its
// live crest (dead), nothing goes over its back, and its ends stand out in the rivers where the sonar has him.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { farOut } from '../../src/sim/river';
import { raycast } from '../../src/world/geom';
import { MAT } from '../../src/world/mats';
import { heightAt } from '../../src/world/heightfield';
import { BORDER } from '../../src/world/yuzhong/borderwall';
import { WATER_Y } from '../../src/world/yuzhong/ground';
import { B } from '../../src/sim/types';
import { run, secs } from './helpers';

const w = getWorld('yuzhong'), g = w.ground!, X = (BORDER.x0 + BORDER.x1) / 2;
const panels = w.solids.filter(s => s.mat === MAT.concrete && s.x0 === BORDER.x0 && s.x1 === BORDER.x1).sort((a, b) => a.z0 - b.z0);
const ends = w.features.filter(f => f.kind === 'border:end').sort((a, b) => a.z - b.z);
const panelAt = (z: number) => panels.find(s => s.z0 <= z && s.z1 >= z);

describe('the western border wall (M6-09)', () => {
  it('stands across the neck from river to river, floodlit, its turrets looking into the city', () => {
    expect(ends.length).toBe(2);
    // (Unbroken from one end to the other, 10 m or more over the ground along it; its ends out in the water.)
    for (let z = ends[0].z; z <= ends[1].z; z += 0.5) {
      const s = panelAt(z), y = heightAt(g, X, z) ?? -Infinity;
      expect(s, `a gap at z ${z}`).toBeDefined();
      expect(s!.y1 - Math.max(y, WATER_Y), `at z ${z}`).toBeGreaterThanOrEqual(BORDER.h - 0.01);
    }
    for (const e of ends) {
      expect(heightAt(g, X, e.z)!, 'in the river').toBeLessThan(WATER_Y);
      expect(farOut(w, BORDER.x1 + 3, e.z + (e === ends[0] ? -3 : 3), WATER_Y), 'round its end the sonar has him').toBe(true);
    }
    const len = ends[1].z - ends[0].z, lights = w.props.filter(p => p.kind === 'floodlight' && p.x < 4);
    expect(lights.length).toBeGreaterThanOrEqual(Math.floor(len / BORDER.flood) - 1);
    const turrets = (w.cameras ?? []).filter(c => c.kind === 'turret' && c.x < 4);
    expect(turrets.length).toBeGreaterThanOrEqual(Math.floor(len / BORDER.turret) - 1);
    for (const t of turrets) expect(Math.sin(t.yaw), 'looking east').toBeGreaterThan(0.99);
  });

  it('stops him at its face: run and jumped at, he never gets past it', () => {
    // (Where the ground in front of it is open: nothing between 12 m out and its face at head height.)
    const open = panels.map(s => (s.z0 + s.z1) / 2).filter(z => {
      const y = heightAt(g, 12, z);
      if (y === null || y < WATER_Y + 1) return false;
      const h = raycast(w.index, 12, y + 1.6, z, -1, 0, 0, 12);
      return !!h && Math.abs(12 - h.t - BORDER.x1) < 0.2;
    });
    expect(open.length, 'open ground before it').toBeGreaterThan(5);
    for (const z of open.filter((_, i) => i % Math.ceil(open.length / 6) === 0)) {
      const s = createState(3, w);
      s.flags.god = true; s.flags.clear = true; s.time = 12 * 3600; s.units.length = 0;
      teleport(s.player, 10, (heightAt(g, 10, z) ?? 0) + 0.2, z);
      run(s, w, 10);
      // Sprinting at it, jumping at its face (a wall kick up it), again and again for 6 s.
      let near = Infinity;
      for (let i = 0; i < secs(6) / 30; i++) run(s, w, 30, { yaw: Math.PI / 2, pitch: 0.6, my: 1, buttons: B.SPRINT | (i % 2 ? B.JUMP : 0), pressed: i % 2 ? B.JUMP : 0 }, q => { near = Math.min(near, q.player.pos.x); });
      expect(near, 'up against it').toBeLessThan(BORDER.x1 + 1);
      expect(s.player.pos.x, `at z ${z.toFixed(0)}`).toBeGreaterThan(BORDER.x1);
      expect(s.player.pos.y, 'not up on it').toBeLessThan(panelAt(z)!.y1 - 3);
    }
  });

  it('kills him on its crest however he got there, and lets nothing over its back', () => {
    for (const s0 of panels.filter((_, i) => i % 40 === 7)) {
      const z = (s0.z0 + s0.z1) / 2;
      for (const x of [BORDER.x0 + 0.1, X, BORDER.x1 + BORDER.lip - 0.1]) for (const crawl of [false, true]) {
        const s = createState(3, w);
        s.flags.clear = true; s.units.length = 0;
        teleport(s.player, x, s0.y1 + 0.05, z);
        if (crawl) s.player.posture = 'crawl';
        run(s, w, 3, crawl ? { buttons: B.CRAWL } : {});
        expect(s.dead, `on its crest at ${x.toFixed(1)}, z ${z.toFixed(0)}${crawl ? ', crawling' : ''}`).toBe('shock');
      }
      // (Thrown or jumped over it from a roof, anything comes down on its crest: over its back, all the way up.)
      for (let y = s0.y1 + 1; y < s0.y1 + 400; y += 7) {
        const h = raycast(w.index, 10, y, z, -1, 0, 0, 20);
        expect(h && 10 - h.t, `over it at ${y.toFixed(0)}`).toBeGreaterThan(BORDER.x0 - 1.01);
      }
    }
  });
});
