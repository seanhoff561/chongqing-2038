// Camera taps (M5-09, DESIGN section 12): a tap clipped into a camera's junction box (8 s, the tap used up) gives Anna
// its live feed; from her Cams page he can loop it: for 90 s it sends the network what it saw before, so it's blind
// and nobody notices (not a silence: the machines see it working). The telecom credentials at an exchange's terminal
// (M5-10) give her every camera in the districts it serves.
import type { SimState } from './types';
import { heldStack } from './use';
import { damage } from './body';
import { onInteract } from './interact';
import { onCmd } from './commands';
import { takeStack } from './inventory';
import { SCALE } from './clock';
import { districtOf } from './district';

/** Seconds to fit a tap; real seconds a loop blinds the camera for; seconds at an exchange's terminal. */
export const TAP = { fit: 8, loop: 90, admin: 5, /** cutting its cable, and the live cable's shock */ cut: 2, shock: 25 };
/** The cameras with feeds (not turrets nor sensors). */
const FEEDS = new Set(['camera', 'sweeper', 'lamppost']);

const camOf = (it: { data?: Record<string, unknown> }) => it.data?.cam as number;
export const tapped = (s: SimState, cam: number) => !!s.taps?.includes(cam);
/** When the camera's loop runs out (game time), if it's looped now. */
export const loopedTill = (s: SimState, cam: number) => { const u = s.units.find(x => x.cam === cam); return u?.quiet !== undefined && u.quiet > s.time ? u.quiet : null; };

/** With bolt cutters in hand at a junction box he cuts the camera's power cable (M5-25b): out for good, which the
 *  network notices as a silence if it had seen him; live, it shocks him unless his gloves are insulated. */
const cutting = (s: SimState) => heldStack(s)?.id === 'boltcutters';
const camUnit = (s: SimState, it: { data?: Record<string, unknown> }) => s.units.find(x => x.cam === camOf(it));

onInteract('jbox', {
  can: (s, it) => {
    if (cutting(s)) return camUnit(s, it)?.shut || camUnit(s, it)?.dead ? 'its cable is cut already' : null;
    return tapped(s, camOf(it)) ? 'already tapped: its feed is on the laptop' : s.inv.pack.items.some(i => i.id === 'cameratap') ? null : 'needs a camera tap';
  },
  dur: s => (cutting(s) ? TAP.cut : TAP.fit),
  label: (s, it) => (cutting(s) ? ['剪断电缆', "Cut the camera's cable"] : tapped(s, camOf(it)) ? ['接线盒（已接入）', 'Junction box (tapped)'] : ['接上分接器', 'Fit a camera tap']),
  done: (s, _w, it) => {
    if (cutting(s)) {
      const u = camUnit(s, it);
      if (!s.inv.pack.items.some(i => i.id === 'insgloves')) { damage(s, TAP.shock, 'electrocuted'); s.events.push({ t: 'hurt', dmg: TAP.shock, cause: 'shock' }, { t: 'sfx', id: 'shock' }); }
      if (u) u.shut = true;
      s.events.push({ t: 'noise', x: it.x, y: it.y, z: it.z, r: 4, kind: 'cut' }, { t: 'msg', text: 'cable cut: the camera is dead' });
      return;
    }
    const st = s.inv.pack.items.find(i => i.id === 'cameratap');
    if (!st || tapped(s, camOf(it))) return;
    if (--st.n <= 0) takeStack(s.inv.pack, st.uid);
    (s.taps ??= []).push(camOf(it));
    s.events.push({ t: 'msg', text: "Anna: I've got the camera's feed" });
  },
});

// Looping a tapped camera's feed (her Cams page): blind, and quiet (units.ts: off, but not gone silent).
onCmd((s, c) => {
  if (c.c !== 'act' || c.name !== 'loop' || typeof c.arg !== 'number' || !tapped(s, c.arg)) return;
  const u = s.units.find(x => x.cam === c.arg);
  if (!u || u.dead) return;
  u.quiet = Math.max(u.quiet ?? 0, s.time + TAP.loop * SCALE);
  s.events.push({ t: 'msg', text: 'Anna: feed looped. That camera sees nothing for a minute and a half' });
});

// An exchange's terminal (M5-10): logged in with the credentials, every camera in the districts it serves.
onInteract('exchange', {
  can: s => (s.inv.pack.items.some(i => i.id === 'netcreds') ? null : 'needs network credentials'),
  dur: () => TAP.admin,
  label: () => ['交换机终端', 'Exchange terminal'],
  done: (s, w, it) => {
    const serves = (it.data?.serves as string[] | undefined) ?? [], taps = (s.taps ??= []);
    let n = 0;
    w.cameras.forEach((c, i) => { if (FEEDS.has(c.kind) && serves.includes(districtOf(c.x, c.z)) && !taps.includes(i)) { taps.push(i); n++; } });
    s.events.push({ t: 'msg', text: `Anna: I'm into the exchange. ${n} more camera feeds` });
  },
});
