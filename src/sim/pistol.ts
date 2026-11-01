// His pistol (M4-21, DESIGN section 6). Left mouse fires a round along his look, thrown off it by the spread: wide
// from the hip, tight aimed down the sights (right mouse held) but swaying with his breath, wider for moving, tighter
// crouched or lying; each shot kicks his aim up, settling in a fraction of a second. It hits the machine the round
// meets first, on the place it meets: 25, three to a quadruped's sensor head blinding it. Every shot is a hostile
// noise heard 150 m round (40 suppressed, U-058). Fifteen to a magazine, 25 to an extended one; R reloads from the fullest
// magazine in his pack, the one in the gun going back with what it still holds. A sight steadies his aim.
import { B, DT, type InputFrame, type SimState } from './types';
import { PISTOL, MODS, MAGS } from '../data/units';
import type { Stack } from './inventory';
import './mods';
import { onUseId, heldStack } from './use';
import { aimAt, hurtUnit, surfaceAt } from './damage';
import { addItem } from './inventory';
import { rand } from './rng';

const RAD = Math.PI / 180;

/** His spread just now, degrees. */
export function spreadOf(s: SimState, aimed: boolean, gun?: Stack | null) {
  const p = s.player, S = PISTOL.spread, sight = aimed ? Math.min(1, ...(gun?.mods ?? []).map(m => MODS[m].aim ?? 1)) : 1;
  return ((aimed ? S.aim * sight : S.hip) + S.move * Math.hypot(p.vel.x, p.vel.z)) * (p.posture === 'stand' ? 1 : S.low);
}

onUseId('pistol', (s, w, st, input) => {
  const p = s.player;
  if (p.swing > 0 || s.task) return;
  if (!st.charge) { p.swing = 0.25; s.events.push({ t: 'msg', text: 'click: empty' }); return; }
  st.charge--;
  p.swing = PISTOL.every;
  // Thrown off his look by the spread (about a bell curve), his breathing's sway aimed, and the kick so far.
  const aimed = (input.buttons & B.AIM) !== 0, sp = spreadOf(s, aimed, st), bell = () => (rand(s.rng) + rand(s.rng) + rand(s.rng) - 1.5) / 1.5;
  const t = s.time / 3600, sway = aimed ? PISTOL.sway * RAD : 0;
  const off = { yaw: bell() * sp * RAD + Math.sin(t * 9.1) * sway, pitch: bell() * sp * RAD + Math.sin(t * 6.3) * sway * 0.6 + p.kick }, hit = aimAt(s, w, PISTOL.reach, off);
  // Where it went: sparks off the machine it hit, or its mark on the wall or ground (M4-61).
  const at = hit ? null : surfaceAt(s, w, PISTOL.reach, off);
  if (hit) s.events.push({ t: 'mark', x: hit.at.x, y: hit.at.y, z: hit.at.z, nx: 0, ny: 1, nz: 0, kind: 'bullet', on: 'machine' });
  else if (at) s.events.push({ t: 'mark', ...at, kind: 'bullet' });
  p.kick += PISTOL.kick;
  const quiet = st.mods?.includes('suppressor') ?? false;
  s.events.push({ t: 'noise', x: p.pos.x, y: p.pos.y + 1.4, z: p.pos.z, r: quiet ? MODS.suppressor.noise! : PISTOL.noise, kind: 'pistol' }, { t: 'fire', id: 'pistol', quiet });
  if (hit) hurtUnit(s, w, hit.u, hit.zone, PISTOL.damage);
});

/** Every tick: the kick settling; R starting a reload, and the reload going on. */
export function stepGun(s: SimState, input: InputFrame) {
  const p = s.player, st = heldStack(s);
  p.kick *= Math.exp(-PISTOL.settle * DT);
  if (s.task?.id === 'reload') {
    if (st?.id !== 'pistol') { s.task = null; return; }
    s.task.t += DT;
    if (s.task.t < s.task.dur) return;
    s.task = null;
    const m = fullest(s);
    if (!m) return;
    const left = st.charge ?? 0, was = st.mag ?? 'mag9';
    st.charge = m.charge ?? MAGS[m.id];
    st.mag = m.id;
    if (--m.n <= 0) s.inv.pack.items.splice(s.inv.pack.items.indexOf(m), 1);
    if (left > 0) addItem(s, s.inv.pack, was, 1, { charge: left });
    s.events.push({ t: 'msg', text: `reloaded: ${st.charge}` });
    return;
  }
  const f = (input.pressed & B.RELOAD) && st?.id === 'pistol' && !s.task ? fullest(s) : undefined;
  if (st && f && (f.charge ?? MAGS[f.id]) > (st.charge ?? 0)) {
    s.task = { id: 'reload', t: 0, dur: PISTOL.reload };
    s.events.push({ t: 'sfx', id: 'reload' });
  }
}

/** The magazine in his pack with the most rounds in it. */
function fullest(s: SimState): Stack | undefined {
  const rounds = (m: Stack) => m.charge ?? MAGS[m.id];
  return s.inv.pack.items.filter(i => MAGS[i.id]).sort((a, b) => rounds(b) - rounds(a))[0];
}
