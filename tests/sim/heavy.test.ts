// M4-26b (U-038): street heavies. A 3 m walker up and down each district's longest main street, day and night; it sees
// him as the machines do and opens up with its rotary cannon; it takes a hit by place: its armour turns pistol rounds
// to the body, its sensor head doesn't.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { unitPose } from '../../src/sim/units';
import { setup, floor, run, secs, LMB, RMB } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { UNITS, ZONES } from '../../src/data/units';
import type { Patrol } from '../../src/world/world';

/** A heavy standing d m in front of him, facing him, by day. */
function facing(d: number) {
  const beat: Patrol = { kind: 'street', unit: 'heavy', pts: [{ x: 0, y: 0, z: -d }, { x: 0, y: 0, z: -d + 0.01 }], dwell: [600, 600], hours: [0, 24] };
  const { world, state } = setup([floor(0, 200)], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [beat] });
  state.time = 12 * 3600; state.flags.clear = true; state.flags.god = true;
  return { world, state, u: state.units[0] };
}

describe('street heavies (M4-26b)', () => {
  it("walks each district's longest main street, on the road, day and night", () => {
    const w = getWorld('yuzhong'), beats = w.patrols.filter(p => p.unit === 'heavy');
    expect(beats.length).toBeGreaterThanOrEqual(4);
    const main = w.streets.filter(s => ['primary', 'secondary', 'tertiary'].includes(s.kind));
    const onRoad = (q: { x: number; z: number }) => main.some(s => s.pts.some(([x, z], i) => i > 0 && (() => { const [ax, az] = s.pts[i - 1], vx = x - ax, vz = z - az, l = vx * vx + vz * vz, t = l ? Math.max(0, Math.min(1, ((q.x - ax) * vx + (q.z - az) * vz) / l)) : 0; return Math.hypot(q.x - ax - vx * t, q.z - az - vz * t) < 2; })()));
    for (const p of beats) {
      expect(p.hours).toEqual([0, 24]);
      expect(p.pts.slice(1).reduce((a, q, i) => a + Math.hypot(q.x - p.pts[i].x, q.z - p.pts[i].z), 0)).toBeGreaterThan(120);
      expect(p.pts.every(onRoad)).toBe(true);
    }
    // They're out: on the move, at noon and at 03:00.
    const s = createState(1, w), them = s.units.filter(u => u.kind === 'heavy' && !u.extra);
    expect(them.length).toBe(beats.length);
    for (const h of [12, 3]) {
      const t = h * 3600, moved = them.filter(u => { const a = unitPose(w, u, t), b = unitPose(w, u, t + 600); return a.active && Math.hypot(a.x - b.x, a.z - b.z) > 1; });
      expect(moved.length, `${h}:00`).toBeGreaterThanOrEqual(Math.ceil(them.length / 2));
    }
  });
  it('sees him and opens up with its cannon: bursts of six, every 2 s', () => {
    const t = facing(30);
    const hits: number[] = [];
    let shots = 0;
    run(t.state, t.world, secs(12), {}, s => { for (const e of s.events) { if (e.t === 'hurt' && e.cause === 'cannon') hits.push(s.tick); if (e.t === 'shot') shots++; } });
    expect(t.u.state).toBe('engaged');
    expect(shots).toBeGreaterThanOrEqual(12);
    expect(hits.length).toBeGreaterThan(0);
  });
  it("takes pistol rounds by place: its armour turns them on the body; three in its sensor head take a share", () => {
    const shootAt = (y: number) => {
      const t = facing(8);
      t.state.flags.god = true;
      addItem(t.state, t.state.inv.pack, 'pistol', 1, { charge: 15 });
      t.state.inv.hotbar[0] = t.state.inv.pack.items.find(i => i.id === 'pistol')!.uid; t.state.inv.held = 1;
      for (let k = 0; k < 3; k++) {
        const q = unitPose(t.world, t.u, t.state.time), p = t.state.player.pos, d = Math.hypot(q.x - p.x, q.z - p.z);
        const pitch = Math.atan2(q.y + y - p.y - 1.62, d), yaw = Math.atan2(-(q.x - p.x), -(q.z - p.z));
        run(t.state, t.world, secs(0.6), { pitch, yaw, buttons: RMB });
        run(t.state, t.world, 1, { pitch, yaw, pressed: LMB, buttons: LMB | RMB });
      }
      return t.u;
    };
    const body = shootAt(2.0), head = shootAt(2.85);
    const lost = (u: typeof body) => UNITS.heavy.hp - (u.hp ?? UNITS.heavy.hp);
    expect(lost(head)).toBeGreaterThan(lost(body) * 5);
    expect(Object.keys(head.hits ?? {})).toContain('head');
    expect(ZONES.heavy.body).toBeLessThan(ZONES.humanoid.body);
  });
});
