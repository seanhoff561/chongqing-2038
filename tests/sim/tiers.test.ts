// M5-31: loot tiers. Tier 4 holds the drone hub's parts (a drone controller's makings, big battery packs, the thermal
// module); tier 1 none of the escape's components; a site container marked with its tier rolls from that tier.
import { describe, it, expect } from 'vitest';
import { loot } from '../../src/data/loot';
import { recipe } from '../../src/data/recipes';
import { item } from '../../src/data/items';
import { setup, floor } from './helpers';
import { rollLoot } from '../../src/sim/loot';
import { grid } from '../../src/sim/inventory';
import type { Inter } from '../../src/world/world';

const ESCAPE = ['boatkey', 'hvfuse', 'opkey', 'metrokey', 'blastcard', 'schedule', 'canif', 'jerrycan', 'carbattery', 'drone', 'dronectl', 'netcreds'];

describe('loot tiers (M5-31)', () => {
  it('fill tier 4 with the drone hub, keep tier 1 plain, and site containers roll their tier', () => {
    for (const k of ['tier1', 'tier2', 'tier3', 'tier4']) for (const e of loot[k].items) expect(() => item(e.id), `${k}: ${e.id}`).not.toThrow();
    const t4 = new Set(loot.tier4.items.map(e => e.id));
    for (const [id] of recipe('dronectl')!.parts) expect(t4.has(id), id).toBe(true);
    for (const id of ['powercell', 'thermalmod']) expect(t4.has(id), id).toBe(true);
    for (const e of loot.tier1.items) expect(ESCAPE, e.id).not.toContain(e.id);
    const { state: s } = setup([floor()], { x: 0, y: 0, z: 0, yaw: 0 }), got = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const it: Inter = { id: `site${i}`, kind: 'container', x: 0, y: 0, z: 0, r: 0.5, zh: '', en: '', data: { type: 'crate', tier: 4 } };
      s.containers[it.id] = grid(6, 6); rollLoot(s, it);
      for (const x of s.containers[it.id].items) got.add(x.id);
    }
    for (const id of got) expect(t4.has(id), id).toBe(true);
    expect(got.size).toBeGreaterThan(4);
  });
});
