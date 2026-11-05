// M6-17: Jiefangbei station's control room. Its four ways in (each walked to its heart by tests/sim/underground.test.ts:
// the deck, the cable gallery's door, the hall, the tracks), its tier 3 keys and drawers, the pump panel and the track
// door Route D will use, and its hazards: the live third rail (stepped on he dies; jumped, or with the traction
// breaker open, he lives) and the face-recognition gates' scan line (walked through upright it alerts; ducked under,
// nothing).
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { RAIL } from '../../src/sim/metro';
import { B, type SimState } from '../../src/sim/types';
import { run, aim, secs } from './helpers';

const w = getWorld('yuzhong'), ins = (k: string) => w.inter.find(i => i.id === k)!;
type V3 = { x: number; y: number; z: number };

function at(q: V3) {
  const s = createState(1, w);
  s.units.length = 0; s.flags.clear = true;
  teleport(s.player, q.x, q.y + 0.05, q.z);
  run(s, w, 10);
  return s;
}
/** Stood a step off it, E held until it's done (or refused). */
function work(s: SimState, id: string, hold: number) {
  const it = ins(id);
  aim(s, it.x, it.y, it.z);
  run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT });
  run(s, w, secs(hold), { buttons: B.INTERACT });
}
/** From beside the track across the third rail toward the hall's wall, until he's well past it (jumping it as he
 *  comes to it, if `hop`). */
function cross(s: SimState, to: V3, rail: V3, hop: boolean) {
  const p = s.player.pos;
  for (let t = 0; t < secs(3) && !s.dead && !((p.z - rail.z) * (to.z - rail.z) > 0 && Math.abs(p.z - rail.z) > 1.5); t++) {
    const near = Math.abs(p.z - rail.z) < 1.6 && Math.abs(p.z - rail.z) > 1.1 && s.player.onGround;
    run(s, w, 1, { my: 1, yaw: Math.atan2(-(to.x - p.x), -(to.z - p.z)), buttons: B.SPRINT | (hop && Math.abs(p.z - rail.z) < 1.6 ? B.JUMP : 0), pressed: hop && near ? B.JUMP : 0 });
  }
}

describe('the metro control room (M6-17)', () => {
  it('has four ways in, its tier 3 drawers and cabinet, its keys, the pump panel and the track door', () => {
    for (const k of ['deck', 'cable', 'hall', 'tracks']) expect(w.features.some(f => f.kind === `in:metro:${k}`), k).toBe(true);
    for (const k of ['metro-drawers', 'metro-cabinet']) expect(ins(k).data?.tier).toBe(3);
    // The maintenance key in a staff locker opens the control room, its back door and the track door; the blast door's
    // card is with the night staff at the end of the line (Xiaoshizi's service room).
    expect(w.inter.some(i => i.id.startsWith('metro-locker') && (i.data?.items as [string, number][] | undefined)?.some(([k]) => k === 'metrokey'))).toBe(true);
    for (const k of ['metro-control', 'metro-back', 'metro-track']) expect(ins(k).data?.key, k).toBe('metrokey');
    expect((ins('svc-locker2').data?.items as [string, number][])[0][0]).toBe('blastcard');
    // The pump panel: dead until the feeder's powered (Route D, M7-11), then it starts the pumps.
    const panel = ins('metro-pumps'), s = at({ x: panel.x - 0.8, y: panel.y - 1.3, z: panel.z });
    work(s, 'metro-pumps', RAIL.pumps + 0.5);
    expect(s.wstate.open['metro-pumps']).toBeFalsy();
    s.wstate.open['metro-feeder'] = true;
    work(s, 'metro-pumps', RAIL.pumps + 0.5);
    expect(s.wstate.open['metro-pumps']).toBe(true);
  });

  it('has a live third rail by the tracks: stepped on, he dies; jumped, he lives; with the traction breaker open, he walks over it', () => {
    const [r0, r1] = w.rail!, mid = (r0.a.z + r1.a.z) / 2, rail = { x: r0.a.x + 53, y: r0.a.y, z: r0.a.z }, toward = Math.sign(rail.z - mid);
    const track = { x: rail.x, y: rail.y - 0.3, z: rail.z - toward * 2.6 }, wall = { x: rail.x, y: track.y, z: rail.z + toward * 1.8 };
    const stepped = at(track);
    cross(stepped, wall, rail, false);
    expect(stepped.dead).toBe('shock');
    const jumped = at(track);
    cross(jumped, wall, rail, true);
    expect(jumped.dead, 'jumped').toBeFalsy();
    expect(Math.sign(jumped.player.pos.z - rail.z)).toBe(toward);
    // The breaker in the control room thrown: the rail's dead.
    const b = ins('metro-traction'), off = at({ x: b.x - 0.8, y: b.y - 1.3, z: b.z });
    work(off, 'metro-traction', RAIL.breaker + 0.5);
    expect(off.wstate.open['metro-traction']).toBe(true);
    teleport(off.player, track.x, track.y + 0.05, track.z);
    run(off, w, 10);
    cross(off, wall, rail, false);
    expect(off.dead, `breaker open ${off.wstate.open['metro-traction']}`).toBeFalsy();
  });

  it("has face-recognition gates: walked through upright, their scan line alerts; ducked under, it doesn't", () => {
    const a = w.features.find(f => f.kind === 'metro:gates:a')!, b = w.features.find(f => f.kind === 'metro:gates:b')!;
    const cam = w.cameras.findIndex(c => c.kind === 'tripwire' && Math.hypot(c.x - a.x, c.z - a.z) < 0.1);
    expect(cam).toBeGreaterThanOrEqual(0);
    const L = Math.hypot(b.x - a.x, b.z - a.z), nx = -(b.z - a.z) / L, nz = (b.x - a.x) / L, m = { x: (a.x + b.x) / 2, y: a.y, z: (a.z + b.z) / 2 };
    for (const [crouch, alerts] of [[false, true], [true, false]] as const) {
      const s = createState(1, w), u = s.units.find(q => q.cam === cam)!;
      s.flags.clear = true;
      teleport(s.player, m.x - nx * 3, m.y + 0.05, m.z - nz * 3);
      run(s, w, 10, { buttons: crouch ? B.CROUCH : 0 });
      let most = 0;
      for (let t = 0; t < secs(4); t++) { run(s, w, 1, { my: 1, yaw: Math.atan2(-nx, -nz), buttons: crouch ? B.CROUCH : 0 }); most = Math.max(most, u.aware ?? 0); }
      expect(Math.hypot(s.player.pos.x - m.x, s.player.pos.z - m.z), 'through the gates').toBeGreaterThan(1.5);
      expect(most >= 1, `crouched ${crouch}`).toBe(alerts);
    }
  });
});
