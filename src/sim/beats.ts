// The story in the world (M8-15, DESIGN section 2): his father's voicemail plays the first time he has the phone (and
// again whenever he uses it, while it has charge), spoken, not read: its words are the phone's description (U-104).
import type { SimState } from './types';
import { VOICEMAIL } from '../data/dialogue';

export function stepBeats(s: SimState) {
  if (s.tick % 30 || s.dead || s.ended) return;
  const B = (s.beats ??= {}), say = (id: string) => s.events.push({ t: 'say', id });
  if (!B.voicemail && s.inv.pack.items.some(i => i.id === 'phone' && (i.charge ?? 0) > 0)) { B.voicemail = true; for (const l of VOICEMAIL) say(l.id); }
}
