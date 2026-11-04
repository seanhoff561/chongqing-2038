// M3-19: the Li family flat. An upper floor near the top of Shibati's stair, ransacked; on a run his father's badge
// and the cracked phone lie on its floor, he picks them up with F, and the phone plays its one voicemail.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { startRun } from '../../src/sim/run';
import { heightAt } from '../../src/world/heightfield';
import { districtAt } from '../../src/world/yuzhong/lots';
import { B } from '../../src/sim/types';
import { VOICEMAIL } from '../../src/data/dialogue';
import { run, aim, LMB } from './helpers';
import { localLight } from '../../src/sim/light';
import { walkUp, floorWay } from '../../src/world/yuzhong/liflat';
import { syncWorld } from '../../src/sim/doors';
import { lockWay } from '../../src/sim/locks';
import { settle } from './helpers';

const w = getWorld('yuzhong'), flat = w.teleports.find(t => t.name === 'Li family flat')!, top = w.teleports.find(t => t.name === 'Shibati top')!;
const things = w.features.filter(f => f.kind.startsWith('li:'));

describe('the Li family flat (M3-19)', () => {
  it('is an upper floor in Shibati near the top of the stair', () => {
    expect(flat).toBeTruthy();
    expect(districtAt(flat.x, flat.z).district).toBe('shibati');
    expect(flat.y - 1.5).toBeGreaterThan(heightAt(w.ground!, flat.x, flat.z)! + 2.5);
    expect(Math.hypot(flat.x - top.x, flat.z - top.z)).toBeLessThan(150);
  });
  it('has its ice-blue neon on the outside of the building, lit only after dark (U-104)', () => {
    const n = w.props.find(p => p.kind === 'flatneon')!;
    expect(n).toBeTruthy();
    expect(Math.hypot(n.x - flat.x, n.z - flat.z)).toBeLessThan(9);
    // Out in the open in front of it: lit at night, not by day.
    const x = n.x + Math.sin(n.yaw) * 1.5, z = n.z + Math.cos(n.yaw) * 1.5;
    expect(localLight(w, x, n.y, z, 23 * 3600)).toBeGreaterThan(0.2);
    expect(localLight(w, x, n.y, z, 12 * 3600)).toBeLessThan(localLight(w, x, n.y, z, 23 * 3600));
  });
  it('has been turned over', () => {
    const near = w.props.filter(p => p.kind.startsWith('f:') && Math.hypot(p.x - flat.x, p.z - flat.z) < 5 && Math.abs(p.y - (flat.y - 1.5)) < 0.2);
    expect(near.filter(p => p.text === 'fallen').length).toBeGreaterThanOrEqual(4);
    for (const k of ['f:papers', 'f:clothes', 'f:books']) expect(near.some(p => p.kind === k), k).toBe(true);
  });
  it('holds his father\'s badge and the phone; picked up, the phone plays the voicemail', () => {
    expect(things.map(f => f.kind).sort()).toEqual(['li:badge', 'li:phone']);
    const s = createState(1, w);
    startRun(s, w);
    expect(s.dropped.map(d => d.stack.id).sort()).toEqual(['badge', 'phone']);
    for (const f of things) {
      teleport(s.player, flat.x, flat.y - 1.45, flat.z);
      run(s, w, 30);
      // Walk to it (straight across the room), look down at it, F.
      teleport(s.player, f.x + 0.7, f.y + 0.02, f.z);
      run(s, w, 10);
      aim(s, f.x, f.y + 0.1, f.z);
      run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT });
      run(s, w, 5);
    }
    const pack = s.inv.pack.items.map(i => i.id);
    expect(pack).toContain('badge');
    expect(pack).toContain('phone');
    // In hand, the left mouse plays it.
    const phone = s.inv.pack.items.find(i => i.id === 'phone')!;
    s.inv.hotbar[0] = phone.uid; s.inv.held = 1;
    const said: string[] = [];
    run(s, w, 1, { pressed: LMB, buttons: LMB }, st => { for (const e of st.events) if (e.t === 'say') said.push(e.id); });
    expect(said).toEqual(VOICEMAIL.map(l => l.id));
  });
  it('he walks in from the street: in at its door, up the stairs, across its floor to the flat (M10-21, U-104)', async () => {
    await settle();
    const room = { x: flat.x, y: flat.y - 1.5, z: flat.z }, plot = walkUp(w, room)!;
    expect(plot).toBeTruthy();
    const s = createState(1, w), route = plot.route!, pre = `${plot.prefix}-`;
    // Every door on his way and on the flat's floor: forced, unlocked, opened by hand (E).
    const doors = w.inter.filter(it => it.kind === 'door' && it.id.startsWith(pre) && (it.y <= room.y + 1.5 || Math.abs(it.y - (room.y + 1.1)) < 1.2));
    for (const it of doors) {
      const way = lockWay(s, it, it.data?.lock as string | undefined);
      if (typeof way === 'string') continue;
      s.wstate.open[it.id] = true;
    }
    syncWorld(s, w);
    expect(lockWay(s, w.inter.find(it => it.id.startsWith(pre) && /street/.test(it.id))!, w.inter.find(it => it.id.startsWith(pre) && /street/.test(it.id))!.data?.lock as string | undefined), 'the street door forced').toEqual({ how: 'none', secs: 0, loud: false });
    // From the street, up the stairwell to the flat's floor.
    teleport(s.player, route[0].x, route[0].y + 0.05, route[0].z);
    run(s, w, 20);
    const up = route.findIndex(q => Math.abs(q.y - room.y) < 0.6);
    const go = (pts: { x: number; z: number }[]) => {
      for (const pt of pts) {
        let ok = false;
        for (let i = 0; i < 60 * 30 && !ok; i++) {
          const p = s.player.pos, dx = pt.x - p.x, dz = pt.z - p.z;
          if (Math.hypot(dx, dz) < 0.3) ok = true;
          else run(s, w, 1, { my: 1, yaw: Math.atan2(-dx, -dz) });
        }
        if (!ok) { stuck = `at ${s.player.pos.x.toFixed(1)},${s.player.pos.y.toFixed(1)},${s.player.pos.z.toFixed(1)} for ${pt.x.toFixed(1)},${pt.z.toFixed(1)} (${s.player.mode})`; return false; }
      }
      return true;
    };
    let stuck = '';
    expect(go(route.slice(1, up + 1)), `up the stairs: ${stuck}; to ${up}: ${route.slice(0, up + 1).map(q => `${q.x.toFixed(1)},${q.y.toFixed(1)},${q.z.toFixed(1)}`).join(' ')}`).toBe(true);
    expect(Math.abs(s.player.pos.y - room.y)).toBeLessThan(0.3);
    // Off the landing and across the floor's rooms to the flat, on his feet.
    const path = floorWay(w, plot, room)!;
    expect(path, 'a way across the floor to the flat').toBeTruthy();
    expect(go(path.filter((_, n) => n % 2 === 0 || n === path.length - 1)), 'across the floor').toBe(true);
    expect(Math.hypot(s.player.pos.x - room.x, s.player.pos.z - room.z)).toBeLessThan(1.5);
    expect(s.dead).toBeFalsy();
  }, 120000);
});
