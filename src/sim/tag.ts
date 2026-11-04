// Tracking tags (M4-22, DESIGN section 6). A quadruped that's after him and can see him out past its prod's reach
// fires its tag launcher every 6 s: three times in five a tracking tag sticks to his clothes (he feels the thump,
// no more), and it stays there, giving him away wherever he goes (U-104), until he finds it with an SDR dongle and
// picks it off, or takes his jacket off and goes over it by hand, slower (the backpack's button, U-099). Followed home
// or seen at a hideout, that hideout's given away too; there, they know where to find him.
import { DT, type SimState } from './types';
import type { World } from '../world/world';
import { TAG, SIGHT, TRACK } from '../data/units';
import { SCALE } from './clock';
import { giveAway, alertOf, districtOf } from './district';
import { sendSquad } from './converge';
import { sleepHooks } from './sleep';
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
  s.events.push({ t: 'msg', text: 'something thumped into your jacket' });
}

// The SDR dongle (M4-22): its chirp finds a tag on him, and he picks it off.
onUseId('sdr', s => {
  if (s.task) return;
  if (!s.player.tag) { s.events.push({ t: 'msg', text: 'no tracker' }); return; }
  s.task = { id: 'untag', t: 0, dur: TAG.remove };
  s.events.push({ t: 'msg', text: 'a tracker on your jacket' });
});

// By hand (U-099): the jacket off and gone over seam by seam, on his feet; it finds one if it's there.
onCmd((s, cmd) => {
  if (cmd.c !== 'act' || cmd.name !== 'search' || s.task || s.player.mode !== 'ground') return;
  s.task = { id: 'untag', t: 0, dur: TAG.search };
  s.events.push({ t: 'msg', text: 'jacket off' });
});

/** Every tick: picking a tag off, if he is (or searching for one by hand), on his feet. */
export function stepTag(s: SimState) {
  if (s.task?.id !== 'untag') return;
  // (A moment off his feet, a step down the stairs, doesn't stop it; climbing or hanging does.)
  if (s.player.mode !== 'ground' && s.player.mode !== 'air') { s.task = null; s.events.push({ t: 'msg', text: 'interrupted' }); return; }
  s.task.t += DT;
  if (s.task.t < s.task.dur) return;
  s.task = null;
  s.events.push({ t: 'msg', text: s.player.tag ? 'tracking tag off and crushed' : 'nothing stuck to your jacket' });
  s.player.tag = false;
}

/** Every tick (M4-23, U-013): followed home. Coming into a hideout's area (within 25 m of its bed) with a machine's
 *  eyes on him in the last 10 s, or a tag on him, or seen while he's there, and they know where it is. Nothing tells
 *  him so. */
export function stepTrack(s: SimState, w: World) {
  const p = s.player.pos;
  let saw = -Infinity;
  for (const u of s.units) if (u.saw !== undefined && u.saw > saw) saw = u.saw;
  let home = false;
  for (const h of s.shelters) {
    const near = Math.hypot(p.x - h.x, p.y - h.y, p.z - h.z) <= TRACK.near;
    if (near && !h.compromised && (saw === s.time || (!h.near && (s.player.tag || s.time - saw <= TRACK.after * SCALE)))) h.compromised = true;
    h.near = near;
    if (near && h.compromised) home = true;
  }
  // Tracked (U-104): a tag on him, or at a hideout they know, his position goes to them every ten minutes, and they
  // come hunting him where he is: the machines near, and (if it's news to them) the nearest garage's squad.
  if (!s.player.tag && !home) { s.pinged = undefined; return; }
  if (s.pinged !== undefined && s.time - s.pinged < TRACK.ping) return;
  s.pinged = s.time;
  const at = { x: p.x, y: p.y, z: p.z }, was = alertOf(s, districtOf(at.x, at.z));
  giveAway(s, w, at);
  // (News to them, the nearest garage's squad goes too; already after him, they're only kept told.)
  if (was !== 'engaged' && was !== 'searching') sendSquad(s, w, at);
}

/** Tracked, asleep: he wakes to them coming (U-104). */
export const tracked = (s: SimState) => s.player.tag || s.shelters.some(h => h.compromised && h.near);
sleepHooks.fates.push(s => (tracked(s) ? { at: s.time + TRACK.ping, cause: 'hunted', why: 'something outside wakes you', wake: true } : null));
