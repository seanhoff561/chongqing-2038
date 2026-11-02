// The story in the world (M8-15, DESIGN section 13), each once a run: his father's voicemail the first time he has the
// phone (it plays again whenever he uses it, while it has charge); Haozi's chalk mice in the tunnels, a word from him
// at each the first time he sees it; and Anna's lines as his first night comes on.
import type { SimState } from './types';
import type { World } from '../world/world';
import { VOICEMAIL } from '../data/dialogue';
import { dayOf, hourOf } from './clock';
import { eyeOf } from './player';
import { raycast } from '../world/geom';

/** How near a mark he has to be to see it (m), and the hour his first night begins. */
export const BEATS = { mark: 4, night: 21 };

/** Each world's chalk marks, found once. */
const marks = new WeakMap<World, World['features']>();

export function stepBeats(s: SimState, w: World) {
  if (s.tick % 30 || s.dead || s.ended) return;
  const B = (s.beats ??= {}), say = (id: string) => s.events.push({ t: 'say', id });
  if (!B.voicemail && s.inv.pack.items.some(i => i.id === 'phone' && (i.charge ?? 0) > 0)) { B.voicemail = true; for (const l of VOICEMAIL) say(l.id); }
  if (!B.night && dayOf(s.time) === 1 && hourOf(s.time) >= BEATS.night) { B.night = true; say('anna-night-1'); say('anna-night-2'); }
  const e = eyeOf(s.player);
  const ms = marks.get(w) ?? marks.set(w, w.features.filter(f => f.kind.startsWith('mark:'))).get(w)!;
  for (const f of ms) {
    const id = `mark-${f.kind.slice(5)}`, dx = f.x - e.x, dy = f.y - e.y, dz = f.z - e.z, d = Math.hypot(dx, dy, dz);
    if (B[id] || d > BEATS.mark || raycast(w.index, e.x, e.y, e.z, dx / d, dy / d, dz / d, d - 0.2)) continue;
    B[id] = true;
    say(id);
  }
}
