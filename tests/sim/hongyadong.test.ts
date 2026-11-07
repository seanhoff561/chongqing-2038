// M6-03: Hongyadong, the stilt complex stacked down the Jialing cliff (yuzhong/hongyadong.ts): its street entrances
// at 12, 30 and 44 m over its foot on the riverside street, balconies and walkways, lit by night, shops to search;
// and he climbs from the riverfront to the top through it on his own legs, by its houses' stairs.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { MAT } from '../../src/world/mats';
import { HY } from '../../src/world/yuzhong/hongyadong';
import { heightAt } from '../../src/world/heightfield';
import { walkPath } from './walker';
import { run } from './helpers';

const w = getWorld('yuzhong');

describe('Hongyadong (M6-03)', () => {
  it('has its street entrances at 12, 30 and 44 m, its stilt houses lit and stocked', () => {
    const ins = w.features.filter(f => f.kind === 'hy:entrance').map(f => Math.round(f.y - HY.foot));
    expect(ins.sort((a, b) => a - b)).toEqual([12, 30, 44]);
    // Each entrance on ground (or the steps on to it) a stride or two off the terrace's edge.
    for (const f of w.features.filter(q => q.kind === 'hy:entrance')) expect(Math.abs((heightAt(w.ground!, f.x, f.z) ?? -99) - f.y), `entrance at ${f.y}`).toBeLessThan(5);
    const shops = w.inter.filter(i => i.id.startsWith('hongyadong-') && i.kind === 'container');
    expect(shops.length, 'shelves and crates to search').toBeGreaterThan(20);
    expect(shops.filter(i => (i.data as { loot?: string })?.loot).length, 'some stocked').toBeGreaterThan(3);
    const HL = w.teleports.find(t => t.name === 'hongyadong')!;
    const near = (x: number, z: number) => Math.hypot(x - HL.x, z - HL.z) < 160;
    expect(w.decor.filter(s => s.mat === MAT.neon && near(s.x0, s.z0)).length, 'gold neon along its eaves').toBeGreaterThan(100);
    expect(w.decor.filter(s => s.mat === MAT.neon && s.tint === 0xff3418 && near(s.x0, s.z0)).length, 'red lanterns').toBeGreaterThan(200);
  });

  it('is climbed from the riverfront to the top through its houses', () => {
    const s = createState(5, w), way = w.features.filter(f => f.kind === 'hy:route').sort((a, b) => a.group - b.group);
    s.flags.god = true; s.flags.clear = true; s.time = 12 * 3600; s.units.length = 0;
    expect(way.length).toBeGreaterThan(20);
    teleport(s.player, way[0].x, way[0].y + 0.3, way[0].z);
    run(s, w, 3);
    const r = walkPath(s, w, way.slice(1), false, 0.5);
    expect(r.reached, `stopped at ${r.at.x.toFixed(1)},${r.at.y.toFixed(1)},${r.at.z.toFixed(1)}, point ${r.reached} of ${way.length - 1}`).toBe(way.length - 1);
    // Off its top on the clifftop path by Cangbai Road, 44 m over the riverside street he came in from.
    expect(s.player.pos.y - way[0].y).toBeGreaterThan(38);
  }, 600000);
});
