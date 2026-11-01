// M5-07: binoculars and patrol logs. Held up (aim) on a machine 150 m off, three seconds logs it (not two, not without
// them up): its kind, where it is, the time and which way it's heading; kept on it, more lines, along its route (what
// her map draws its route through).
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs, aim, RMB } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { unitPose } from '../../src/sim/units';
import { BINOS, bearing } from '../../src/sim/binoculars';
import type { Patrol } from '../../src/world/world';

describe('binoculars and patrol logs (M5-07)', () => {
  it('logs a machine watched for three seconds, and its route as he keeps on it', () => {
    const beat: Patrol = { kind: 'street', unit: 'quadruped', pts: [{ x: -40, y: 0, z: -150 }, { x: 40, y: 0, z: -150 }], dwell: [0, 0], hours: [0, 24] };
    const { world: w, state: s } = setup([floor(0, 300)], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [beat] });
    s.time = 12 * 3600; s.flags.god = true; s.player.posture = 'crouch';
    const u = s.units[0], follow = (st: typeof s) => { const q = unitPose(w, u, st.time); aim(st, q.x, q.y + 0.5, q.z); };
    addItem(s, s.inv.pack, 'binoculars', 1);
    s.inv.hotbar[0] = s.inv.pack.items.find(i => i.id === 'binoculars')!.uid; s.inv.held = 1;
    follow(s);
    // Looked at without them up: nothing.
    run(s, w, secs(4), {}, follow);
    expect(s.sightings ?? []).toHaveLength(0);
    // Up: two seconds isn't enough; three is.
    run(s, w, secs(2), { buttons: RMB }, follow);
    expect(s.sightings ?? []).toHaveLength(0);
    let logged = 0;
    run(s, w, secs(1.2), { buttons: RMB }, st => { follow(st); for (const e of st.events) if (e.t === 'logged') logged++; });
    expect(logged).toBe(1);
    const [a] = s.sightings!, q = unitPose(w, u, a.t);
    expect(a.kind).toBe('quadruped');
    expect(Math.hypot(a.x - q.x, a.z - q.z)).toBeLessThan(0.01);
    expect(a.t).toBeGreaterThan(12 * 3600);
    expect(a.head).toBeCloseTo(bearing(q.yaw), 5);
    expect([90, 270]).toContain(Math.round(a.head)); // (east or west, along its street)
    // Kept on it: a line every five seconds, from along its way.
    run(s, w, secs(BINOS.again * 2), { buttons: RMB }, follow);
    expect(s.sightings!.length).toBe(3);
    expect(new Set(s.sightings!.map(x => x.u)).size).toBe(1);
    expect(Math.abs(s.sightings![2].x - a.x) + Math.abs(s.sightings![1].x - a.x)).toBeGreaterThan(1);
  });
});
