// M5-35 (U-091): building types rolled for each run. Homes most of all, then offices, a few clinics, workshops and
// military posts; another run, other buildings. Each type's rooms (and their lining) and what's left in them differ;
// a military post's armoury beats a kitchen; its doors are mostly locked and always watched; fewer street doors are
// chained or locked than before.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { TYPES, typeOf, type BuildingType } from '../../src/world/city/types';
import { createState } from '../../src/sim/sim';
import { rollLoot } from '../../src/sim/loot';
import { grid } from '../../src/sim/inventory';
import { item } from '../../src/data/items';
import type { Inter } from '../../src/world/world';

describe('building types (M5-35)', () => {
  it('come out near their shares, and differ from run to run', () => {
    const ids = Array.from({ length: 4000 }, (_, i) => i), a = ids.map(i => typeOf(i, 7)), b = ids.map(i => typeOf(i, 8));
    for (const t of Object.keys(TYPES) as BuildingType[]) expect(a.filter(x => x === t).length / ids.length, t).toBeCloseTo(TYPES[t].share, 1);
    expect(a.filter((x, i) => x !== b[i]).length / ids.length).toBeGreaterThan(0.25);
  });
  it('furnish and stock each type its own way, a military post best, behind locked doors and a camera', () => {
    const w = getWorld('yuzhong'), posts = w.plots.filter(p => p.type === 'military' && p.route);
    expect(posts.length).toBeGreaterThan(2);
    expect(w.plots.filter(p => p.type === 'office').length).toBeGreaterThan(posts.length);
    // Their rooms: armouries and barracks.
    const rooms = (k: string) => w.features.filter(f => f.kind === `inside:${k}`).length;
    expect(rooms('armory') + rooms('barracks')).toBeGreaterThan(3);
    expect(rooms('ward') + rooms('clinic')).toBeGreaterThan(0);
    // An armoury's stock against a kitchen's: guns, ammunition, the machines' kit.
    const s = createState(3, w), stock = (loot: string) => {
      let good = 0;
      for (let i = 0; i < 300; i++) {
        const it: Inter = { id: `t${loot}${i}`, kind: 'container', x: 0, y: 0, z: 0, r: 0.5, zh: '', en: '', data: { type: 'locker', loot } };
        s.containers[it.id] = grid(6, 6); rollLoot(s, it);
        good += s.containers[it.id].items.filter(x => ['weapon', 'ammo', 'device', 'throw'].includes(item(x.id).cat) || ['suppressor', 'reddot', 'scope4x', 'thermalmod'].includes(x.id)).length;
      }
      return good;
    };
    expect(stock('armory')).toBeGreaterThan(5 * Math.max(1, stock('kitchen')));
    // Street doors: fewer chained or locked than the old 62%; a post's mostly.
    const street = w.inter.filter(i => i.kind === 'door' && i.id.includes('.street'));
    const shut = (ds: Inter[]) => ds.filter(d => d.data?.lock === 'locked' || d.data?.lock === 'chained').length / ds.length;
    expect(shut(street)).toBeLessThan(0.56);
    const postDoors = street.filter(d => posts.some(p => Math.hypot(p.route![0].x - d.x, p.route![0].z - d.z) < 3));
    expect(shut(postDoors)).toBeGreaterThan(0.6);
    // Watched: a camera over every post's door.
    for (const p of posts) expect(w.cameras.some(c => c.kind === 'camera' && Math.hypot(c.x - p.route![0].x, c.z - p.route![0].z) < 3), `post ${posts.indexOf(p)}`).toBe(true);
  });
});
