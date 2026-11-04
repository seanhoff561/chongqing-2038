// The pump shotgun and the nail gun (M5-18, DESIGN section 6). The shotgun throws eight pellets in a cone, 12 each,
// five shells in its tube, heard 180 m round; R loads shells from a box one by one. The nail gun is quiet (25 m),
// short-ranged (15 m), 30 nails to a strip (R swaps the strip, the one in it back in the pack with what it has left);
// fired point-blank at a shut door it nails it shut (four nails): it can't be opened till it's prised with a crowbar.
import { B, DT, type InputFrame, type SimState } from './types';
import { SHOTGUN, NAILGUN } from '../data/units';
import { onUseId, heldStack } from './use';
import { aimAt, hurtUnit, surfaceAt } from './damage';
import { lookTarget } from './interact';
import { addItem, takeStack, type Stack } from './inventory';
import { rand } from './rng';

const RAD = Math.PI / 180;
const bell = (s: SimState) => (rand(s.rng) + rand(s.rng) + rand(s.rng) - 1.5) / 1.5;

/** A round (or pellet) off his look by `cone` degrees: what it hits, and its mark. */
function round(s: SimState, w: Parameters<typeof aimAt>[1], reach: number, cone: number, damage: number) {
  const p = s.player, off = { yaw: bell(s) * cone * RAD, pitch: bell(s) * cone * RAD + p.kick }, hit = aimAt(s, w, reach, off);
  if (hit) { s.events.push({ t: 'mark', x: hit.at.x, y: hit.at.y, z: hit.at.z, nx: 0, ny: 1, nz: 0, kind: 'bullet', on: 'machine' }); hurtUnit(s, w, hit.u, hit.zone, damage); return; }
  const at = surfaceAt(s, w, reach, off);
  if (at) s.events.push({ t: 'mark', ...at, kind: 'bullet' });
}

onUseId('shotgun', (s, w, st) => {
  const p = s.player;
  if (p.swing > 0 || s.task) return;
  if (!st.charge) { p.swing = 0.3; s.events.push({ t: 'msg', text: 'click: empty' }); return; }
  st.charge--;
  p.swing = SHOTGUN.every;
  for (let k = 0; k < SHOTGUN.pellets; k++) round(s, w, SHOTGUN.reach, SHOTGUN.cone, SHOTGUN.damage);
  p.kick += SHOTGUN.kick;
  s.events.push({ t: 'noise', x: p.pos.x, y: p.pos.y + 1.4, z: p.pos.z, r: SHOTGUN.noise, kind: 'shotgun' }, { t: 'fire', id: 'shotgun', quiet: false });
});

onUseId('nailgun', (s, w, st) => {
  const p = s.player;
  if (p.swing > 0 || s.task) return;
  // A shut door right in front of him: nailed shut.
  const d = lookTarget(s, w);
  if (d?.kind === 'door' && !s.wstate.open[d.id] && !s.wstate.pinned?.[d.id]) {
    if ((st.charge ?? 0) < NAILGUN.pin) { return; }
    st.charge! -= NAILGUN.pin;
    (s.wstate.pinned ??= {})[d.id] = true;
    p.swing = NAILGUN.every * NAILGUN.pin;
    s.events.push({ t: 'noise', x: d.x, y: d.y, z: d.z, r: NAILGUN.noise, kind: 'nailgun' }, { t: 'fire', id: 'nailgun', quiet: true }, { t: 'msg', text: 'door nailed shut' });
    return;
  }
  if (!st.charge) { p.swing = 0.25; s.events.push({ t: 'msg', text: 'click: empty' }); return; }
  st.charge--;
  p.swing = NAILGUN.every;
  round(s, w, NAILGUN.reach, NAILGUN.spread, NAILGUN.damage);
  p.kick += NAILGUN.kick;
  s.events.push({ t: 'noise', x: p.pos.x, y: p.pos.y + 1.4, z: p.pos.z, r: NAILGUN.noise, kind: 'nailgun' }, { t: 'fire', id: 'nailgun', quiet: true });
});

const boxes = (s: SimState) => s.inv.pack.items.filter(i => i.id === 'shells');
const shellsLeft = (b: Stack) => (b.charge ?? 5) + (b.n - 1) * 5;
/** The fullest nail strip in his pack. */
const strip = (s: SimState) => s.inv.pack.items.filter(i => i.id === 'nails').sort((a, b) => (b.charge ?? NAILGUN.strip) - (a.charge ?? NAILGUN.strip))[0];

/** Every tick: R loading the shotgun or the nail gun, and the loading going on. */
export function stepGuns(s: SimState, input: InputFrame) {
  const st = heldStack(s);
  if (s.task?.id === 'load') {
    if (st?.id !== 'shotgun' && st?.id !== 'nailgun') { s.task = null; return; }
    s.task.t += DT;
    if (s.task.t < s.task.dur) return;
    s.task = null;
    if (st.id === 'shotgun') {
      // One shell from a box, and on to the next if there's room and shells.
      const b = boxes(s)[0];
      if (!b) return;
      st.charge = (st.charge ?? 0) + 1;
      b.charge = (b.charge ?? 5) - 1;
      if (b.charge <= 0) { if (b.n > 1) { b.n--; b.charge = 5; } else takeStack(s.inv.pack, b.uid); }
      if (st.charge < SHOTGUN.tube && boxes(s).length) s.task = { id: 'load', t: 0, dur: SHOTGUN.shell };
      return;
    }
    const n = strip(s);
    if (!n) return;
    const left = st.charge ?? 0;
    st.charge = n.charge ?? NAILGUN.strip;
    if (--n.n <= 0) takeStack(s.inv.pack, n.uid);
    if (left > 0) addItem(s, s.inv.pack, 'nails', 1, { charge: left });
    return;
  }
  if (!(input.pressed & B.RELOAD) || s.task || !st) return;
  if (st.id === 'shotgun' && (st.charge ?? 0) < SHOTGUN.tube && boxes(s).some(b => shellsLeft(b) > 0)) s.task = { id: 'load', t: 0, dur: SHOTGUN.shell };
  if (st.id === 'nailgun') { const n = strip(s); if (n && (n.charge ?? NAILGUN.strip) > (st.charge ?? 0)) s.task = { id: 'load', t: 0, dur: NAILGUN.reload }; }
  if (s.task) s.events.push({ t: 'sfx', id: 'reload' });
}
