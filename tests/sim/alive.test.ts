// M4-59 (U-051): machines that move like they're alive. Drones search: they drop to look over building faces and never
// fly a straight line for long. Walkers drift off the dead straight line and stop to look at doors and bins beside their
// way, turning their heads, then go on.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { unitPose } from '../../src/sim/units';
import { SCALE } from '../../src/sim/clock';

const w = getWorld('yuzhong'), s = createState(1, w), NOON = 12 * 3600;
const pose = (u: (typeof s.units)[number], sec: number) => unitPose(w, u, NOON + sec * SCALE);
/** How near a point is to a building's wall below its roof (m), Infinity if none within 40 m. */
function toWall(x: number, y: number, z: number) {
  let best = Infinity;
  for (const p of w.plots) {
    if (p.far || y > p.top) continue;
    const n = p.corners.length;
    for (let k = 0; k < n; k++) {
      const [ax, az] = p.corners[k], [bx, bz] = p.corners[(k + 1) % n], vx = bx - ax, vz = bz - az, l = vx * vx + vz * vz;
      const t = l ? Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l)) : 0;
      best = Math.min(best, Math.hypot(x - ax - vx * t, z - az - vz * t));
    }
  }
  return best;
}

describe('machines alive (M4-59)', () => {
  it("a drone looks over building faces every minute or so, and doesn't fly straight", () => {
    const drones = s.units.filter(u => u.kind === 'drone' && u.patrol >= 0 && w.patrols[u.patrol].hours[1] - w.patrols[u.patrol].hours[0] === 24 && !u.extra).slice(0, 4);
    expect(drones.length).toBeGreaterThanOrEqual(3);
    for (const u of drones) {
      // Its first ten minutes out of the dock by day.
      let faces = 0, minutes = 0, near = false, crooked = 0;
      for (let t0 = 0; t0 < 1200 && minutes < 10; t0 += 60) {
        const ps = Array.from({ length: 121 }, (_, i) => pose(u, t0 + i * 0.5));
        if (ps.some(q => q.docked || !q.active)) continue;
        minutes++;
        for (const q of ps) { const n = toWall(q.x, q.y, q.z) < 6.5; if (n && !near) faces++; near = n; }
        // Off the straight line between where it was and where it is 20 s later, by more than 2 m.
        for (let i = 0; i + 40 < ps.length; i += 40) {
          const a = ps[i], b = ps[i + 40], L = Math.hypot(b.x - a.x, b.z - a.z) || 1;
          if (ps.slice(i, i + 40).some(q => Math.abs((q.x - a.x) * (b.z - a.z) - (q.z - a.z) * (b.x - a.x)) / L > 2)) crooked++;
        }
      }
      expect(minutes, `drone ${u.id}`).toBeGreaterThanOrEqual(5);
      expect(faces / minutes, `drone ${u.id} faces a minute`).toBeGreaterThanOrEqual(0.7);
      expect(crooked / (minutes * 3), `drone ${u.id} crooked share`).toBeGreaterThan(0.6);
    }
  });
  it('walkers stop to look along their beats, heads turning, and drift off the line between', () => {
    const walkers = s.units.filter(u => (u.kind === 'quadruped' || u.kind === 'humanoid') && u.patrol >= 0 && w.patrols[u.patrol].crowd && !u.mate).slice(0, 6);
    expect(walkers.length).toBe(6);
    for (const u of walkers) {
      const p = w.patrols[u.patrol], L = p.pts.slice(1).reduce((a, q, i) => a + Math.hypot(q.x - p.pts[i].x, q.z - p.pts[i].z), 0);
      // Looking stops on its beat: at least one each 120 m.
      expect(Object.keys(p.look ?? {}).length, `beat ${u.patrol}`).toBeGreaterThanOrEqual(Math.floor(L / 120));
      // Over five minutes: stood looking (still, its head turning by more than 0.6 rad), and off its line at times.
      let looks = 0, still = 0, yaw0 = 0, swept = 0;
      let prev = pose(u, 0);
      for (let i = 1; i < 600; i++) {
        const q = pose(u, i * 0.5), moved = Math.hypot(q.x - prev.x, q.z - prev.z);
        if (moved < 0.01) { if (!still) { yaw0 = q.yaw; swept = 0; } still++; swept = Math.max(swept, Math.abs(q.yaw - yaw0)); }
        else { if (still >= 3 && swept > 0.6) looks++; still = 0; }
        prev = q;
      }
      expect(looks, `walker ${u.id}`).toBeGreaterThanOrEqual(1);
    }
  });
});
