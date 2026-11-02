// Tracking tags (M4-22, DESIGN section 6). A quadruped that's after him and can see him out past its prod's reach
// fires its tag launcher every 6 s: three times in five a tracking tag sticks to his clothes (he feels the thump,
// no more), and it stays there, giving his way home away (M4-23), until he finds it with an SDR dongle and picks it
// off, or takes his jacket off and goes over it by hand, slower (the backpack's button, U-099).
import { DT, type SimState } from './types';
import type { World } from '../world/world';
import { TAG, SIGHT, TRACK } from '../data/units';
import { SCALE } from './clock';
import { raidTime } from './raid';
import { visibility } from './perception';
import { onUseId } from './use';
import { onCmd } from './commands';
import { rand } from './rng';
import type { Pose, Unit } from './units';

/** Every tick, for a quadruped that's after him (fire.ts): its launcher. */
export function launcher(s: SimState, w: World, u: Unit, at: Pose, d: number) {
  u.tagIn = Math.max(0, (u.tagIn ?? 0) - DT);
  if (u.tagIn > 0 || (u.id + s.tick) % 6 || d <= TAG.near || d > TAG.reach || u.blind || u.disarmed || visibility(s, w, u.kind, at) < SIGHT.min) return;
  u.tagIn = TAG.every;
  s.events.push({ t: 'noise', x: at.x, y: at.y + 0.8, z: at.z, r: TAG.noise, kind: 'tag' });
  if (rand(s.rng) >= TAG.chance) return;
  s.player.tag = true;
  s.events.push({ t: 'msg', text: 'something thumped into your jacket: a tracker? An SDR dongle finds it, or search your jacket (backpack)' });
}

// The SDR dongle (M4-22): its chirp finds a tag on him, and he picks it off.
onUseId('sdr', s => {
  if (s.task) return;
  if (!s.player.tag) { s.events.push({ t: 'msg', text: 'the dongle hears no tracker on you' }); return; }
  s.task = { id: 'untag', t: 0, dur: TAG.remove };
  s.events.push({ t: 'msg', text: 'a tracker chirping on your jacket: picking it off' });
});

// By hand (U-099): the jacket off and gone over seam by seam, on his feet; it finds one if it's there.
onCmd((s, cmd) => {
  if (cmd.c !== 'act' || cmd.name !== 'search' || s.task || s.player.mode !== 'ground') return;
  s.task = { id: 'untag', t: 0, dur: TAG.search };
  s.events.push({ t: 'msg', text: 'jacket off: going over it by hand' });
});

/** Every tick: picking a tag off, if he is (or searching for one by hand: on his feet). */
export function stepTag(s: SimState) {
  if (s.task?.id !== 'untag') return;
  if (s.player.mode !== 'ground') { s.task = null; s.events.push({ t: 'msg', text: 'interrupted' }); return; }
  s.task.t += DT;
  if (s.task.t < s.task.dur) return;
  s.task = null;
  s.events.push({ t: 'msg', text: s.player.tag ? 'tracking tag off and crushed' : 'nothing stuck to your jacket' });
  s.player.tag = false;
}

/** Every tick (M4-23, U-013): followed home. Coming into a hideout's area (within 25 m of its bed) with a machine's
 *  eyes on him in the last 10 s, or a tag on him, or seen while he's there, and they know where it is. Nothing tells
 *  him so. */
export function stepTrack(s: SimState) {
  if (!s.shelters.length) return;
  const p = s.player.pos;
  let saw = -Infinity;
  for (const u of s.units) if (u.saw !== undefined && u.saw > saw) saw = u.saw;
  for (const h of s.shelters) {
    const near = Math.hypot(p.x - h.x, p.y - h.y, p.z - h.z) <= TRACK.near;
    if (near && !h.compromised && (saw === s.time || (!h.near && (s.player.tag || s.time - saw <= TRACK.after * SCALE)))) {
      h.compromised = true;
      h.raid = raidTime(s, h.id);
    }
    h.near = near;
  }
}
