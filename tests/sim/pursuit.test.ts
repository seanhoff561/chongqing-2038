// M4-46 (U-050): relentless pursuit. A quadruped that has him follows him off the street and down a stairway into the
// underground city, the way he went.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { run, secs } from './helpers';

const w = getWorld('yuzhong');

describe('pursuit (M4-46)', () => {
  it('follows him down a stairway into the underground', () => {
    const all = w.features.filter(f => f.kind === 'descentRoute'), first = Math.min(...all.map(f => Math.floor(f.group / 100)));
    const d = all.filter(f => Math.floor(f.group / 100) === first).sort((a, b) => a.group - b.group);
    const s = createState(1, w), p = s.player;
    s.time = 12 * 3600; s.flags.clear = true; s.flags.god = true;
    // Him at the stairway's mouth; a quadruped that has him 12 m behind on the street.
    const q = s.units.find(u => u.kind === 'quadruped' && u.patrol >= 0)!;
    s.units = [q];
    const l = Math.hypot(d[1].x - d[0].x, d[1].z - d[0].z), bx = d[0].x - ((d[1].x - d[0].x) / l) * 12, bz = d[0].z - ((d[1].z - d[0].z) / l) * 12;
    teleport(p, d[0].x, d[0].y + 0.05, d[0].z);
    q.trip = { kind: 'hunt', path: [], i: 0, pos: { x: bx, y: d[0].y, z: bz }, yaw: 0, scan: 0, back: false, left: { x: bx, y: d[0].y, z: bz }, leftAt: s.time };
    Object.assign(q, { aware: 1.5, state: 'engaged', seen: { ...p.pos }, saw: s.time });
    run(s, w, 10);
    // Down the stairway, landing by landing.
    for (const f of d.slice(1)) for (let i = 0; i < secs(30) && Math.hypot(p.pos.x - f.x, p.pos.z - f.z) > 0.4; i++) run(s, w, 1, { my: 1, yaw: Math.atan2(-(f.x - p.pos.x), -(f.z - p.pos.z)) });
    run(s, w, secs(6));
    expect(p.pos.y).toBeLessThan(d[0].y - 8);
    const at = q.trip!.pos;
    expect(at.y, `it's at ${at.x.toFixed(0)},${at.y.toFixed(0)},${at.z.toFixed(0)}`).toBeLessThan(d[0].y - 5);
    expect(Math.hypot(at.x - p.pos.x, at.z - p.pos.z)).toBeLessThan(20);
  });
});
