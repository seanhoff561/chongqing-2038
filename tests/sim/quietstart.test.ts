// U-075, U-104: a new run starts with the machines out on their beats everywhere from the first second, except that for
// its first minutes none is out within about 40 m of the hideout's way out (the grate he climbs out by); after, those
// are back on their beats too. (Was: everything whose beat came within 160 m of the start was off; U-104 wants the
// machines out from the start, just not at his door.)
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { startRun, QUIET } from '../../src/sim/run';
import { unitPose, isOff } from '../../src/sim/units';
import { SCALE } from '../../src/sim/clock';

describe('quiet start (U-075, U-104)', () => {
  it('has machines out everywhere from the first second, but none within 40 m of the way out for its first minutes', () => {
    const w = getWorld('yuzhong'), s = createState(1, w), out = w.inter.find(i => i.id === 'airraid-grate')!;
    startRun(s, w);
    expect(QUIET.r).toBe(40);
    const on = (t: number) => s.units.filter(u => !isOff({ time: t }, u)).map(u => unitPose(w, u, t)).filter(q => q.active);
    const d = (q: { x: number; z: number }) => Math.hypot(q.x - out.x, q.z - out.z);
    expect(on(s.time).filter(q => d(q) > QUIET.r).length).toBeGreaterThan(20);
    for (const m of [0, 3, 7]) expect(on(s.time + m * 60 * SCALE).filter(q => d(q) <= QUIET.r).length, `${m} min`).toBe(0);
    // Those kept in are back out on their beats when the quiet minutes are up.
    const kept = s.units.filter(u => u.quiet !== undefined);
    expect(kept.length).toBeGreaterThan(0);
    for (const u of kept) expect(u.quiet).toBe(s.time + QUIET.minutes * 60 * SCALE);
  });
});
