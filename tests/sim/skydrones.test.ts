// M4-87 (U-065): drones everywhere. Many more, over the roofs and down between the blocks, slow, stopping to scan;
// one shot from the suppressed pistol brings one down without the network hearing; its wreck gives up scrap.
import { describe, it, expect } from 'vitest';
import { raycast } from '../../src/world/geom';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { unitPose } from '../../src/sim/units';
import { teleport } from '../../src/sim/player';
import { addItem, grid } from '../../src/sim/inventory';
import { allInters } from '../../src/sim/interact';
import { fillContainer } from '../../src/sim/containers';
import { UNITS } from '../../src/data/units';
import { run, secs, aim, LMB, RMB } from './helpers';

const w = getWorld('yuzhong');
const inPlot = (x: number, z: number) => w.plots.find(p => !p.far && p.corners.every((a, i) => { const b = p.corners[(i + 1) % p.corners.length]; return (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]) >= 0; }) || p.corners.every((a, i) => { const b = p.corners[(i + 1) % p.corners.length]; return (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]) <= 0; }));

describe('drones everywhere (M4-87)', () => {
  it('fly over and between the buildings, come down to one quiet shot, and leave scrap', () => {
    const s = createState(1, w), drones = s.units.filter(u => u.kind === 'drone' && u.patrol >= 0 && !u.extra);
    expect(drones.length).toBeGreaterThanOrEqual(80);
    expect(UNITS.drone.patrol).toBeLessThanOrEqual(5);
    let over = 0, between = 0, n = 0;
    for (const u of drones) for (const h of [10, 14, 18]) { const q = unitPose(w, u, h * 3600); if (!q.active) continue; n++; const p = inPlot(q.x, q.z); if (p && q.y > p.top) over++; else if (!p) between++; }
    expect(over / n).toBeGreaterThan(0.2);
    expect(between / n).toBeGreaterThan(0.2);
    // One hovering 15 m off, unaware of him: a single suppressed round, and down it comes; no machine 60 m off knows.
    s.time = 12 * 3600; s.flags.god = true; s.flags.clear = true;
    // (One out in the open with somewhere 15 m off it he can stand and see it clear: the buildings round differ by
    // their type each run, M5-35.)
    const clearFrom = (q: { x: number; y: number; z: number }) => [[15, -8, 0], [-15, -8, 0], [0, -8, 15], [0, -8, -15], [15, 0, 0], [-15, 0, 0], [0, 0, 15], [0, 0, -15]].map(([dx, dy, dz]) => ({ x: q.x + dx, y: q.y + dy, z: q.z + dz }))
      .find(p => { const ey = p.y + 1.62, d = Math.hypot(q.x - p.x, q.y - ey, q.z - p.z); return !raycast(w.index, p.x, ey, p.z, (q.x - p.x) / d, (q.y - ey) / d, (q.z - p.z) / d, d - 0.6); });
    const u = [...drones].reverse().find(d => { const p = unitPose(w, d, s.time); return p.active && !p.docked && clearFrom(p); })!, q = unitPose(w, u, s.time), spot = clearFrom(q)!;
    u.stop = { ...q, yaw: Math.atan2(q.x - spot.x, q.z - spot.z), t: s.time }; // (Facing away from him: it hasn't seen him.)
    teleport(s.player, spot.x, spot.y, spot.z); s.flags.noclip = true;
    addItem(s, s.inv.pack, 'pistol', 1, { charge: 15 });
    const gun = s.inv.pack.items.find(i => i.id === 'pistol')!; gun.mods = ['suppressor'];
    s.inv.hotbar[0] = gun.uid; s.inv.held = 1;
    for (let k = 0; k < 20; k++) { aim(s, q.x, q.y, q.z); run(s, w, 1, { buttons: RMB }); }
    let loud = 0;
    // (Only what's made where it falls: not the machines firing at him, floating there in the open, nor what dives at him.)
    const hear = (st: typeof s) => { for (const e of st.events) if (e.t === 'noise' && e.kind !== 'gunfire' && Math.hypot(e.x - q.x, e.z - q.z) < 6) loud = Math.max(loud, e.r); };
    for (let k = 0; k < 3 && !u.dead; k++) { aim(s, q.x, q.y, q.z); run(s, w, 1, { pressed: LMB, buttons: LMB | RMB }, hear); run(s, w, secs(0.5), { buttons: RMB }, hear); }
    expect(u.dead).toBe(true);
    run(s, w, secs(10), {}, hear);
    // (The hive noticed no silence: it hadn't seen him; and nothing it made was heard past 45 m: a suppressed round,
    // a light drone falling.)
    expect(s.hive.silent.length).toBe(0);
    expect(loud).toBeLessThanOrEqual(45);
    // Its wreck searched: two rotors, its radio and camera modules, a battery pack.
    const it = allInters(s, w).find(i => i.id === `wreck:${u.id}`)!;
    s.containers[it.id] = grid(6, 4); fillContainer(s, it);
    expect([...new Set(s.containers[it.id].items.map(i => i.id))].sort()).toEqual(['battpack', 'cammod', 'radiomod', 'rotor']);
  });
});
