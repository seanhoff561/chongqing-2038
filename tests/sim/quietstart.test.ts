// U-075: a new run starts quiet. For its first minutes no machine whose beat comes near where he starts is out (none
// seen there), and the cameras round it are dark; after, they're back on their beats.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { startRun, QUIET } from '../../src/sim/run';
import { unitPose } from '../../src/sim/units';
import { teleport } from '../../src/sim/player';
import { SCALE } from '../../src/sim/clock';

describe('quiet start (U-075)', () => {
  it('keeps the machines near the start away for its first minutes', () => {
    const w = getWorld('yuzhong'), s = createState(1, w), home = w.teleports.find(t => t.name.startsWith("Friends' hideout"))!;
    teleport(s.player, home.x, home.y, home.z);
    startRun(s, w);
    const near = (t: number) => s.units.filter(u => { const q = unitPose(w, u, t); return q.active && u.cam === undefined && Math.hypot(q.x - home.x, q.z - home.z) < QUIET.r * 0.8; }).length;
    for (const m of [0, 3, 7]) expect(near(s.time + m * 60 * SCALE), `${m} min`).toBe(0);
    expect(s.units.filter(u => u.quiet).length).toBeGreaterThan(5);
    expect(near(s.time + (QUIET.minutes + 2) * 60 * SCALE) + near(s.time + (QUIET.minutes + 6) * 60 * SCALE)).toBeGreaterThan(0);
  });
});
