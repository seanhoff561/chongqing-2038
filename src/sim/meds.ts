// Healing items (M5-17, DESIGN section 4; pulled forward by U-050, the starting bandage did nothing). Used from the hand
// (left mouse), each takes him a few seconds standing or crouched (putting it away or climbing stops it) and is spent:
// a bandage stops a light bleed; a tourniquet a heavy one (on until a first-aid kit takes over); a splint sets a broken
// limb (a broken leg then limps as a sprain does and heals in 7 days, a broken arm climbs slowly); painkillers hide a
// sprain or a limp for 4 hours; a first-aid kit stops all bleeding and gives back 30 health. With nothing to treat he's
// told so and it isn't used.
import { DT, type SimState } from './types';
import { onUseId, heldStack } from './use';
import { takeStack } from './inventory';
import { survival as S } from '../data/survival';

/** Seconds each takes. */
export const TREAT: Record<string, number> = { bandage: 4, tourniquet: 3, splint: 8, painkillers: 2, firstaid: 10 };

/** Why it can't be used now, or null if it can. */
function why(s: SimState, id: string): string | null {
  const b = s.body, heavy = b.heavyBleed && !b.tourniquet, broken = (b.leg === 'fracture' && !b.legSplint) || (b.arm === 'fracture' && !b.armSplint);
  switch (id) {
    case 'bandage': return b.lightBleed >= 0 ? null : heavy ? 'a bandage won\'t stop this: it needs a tourniquet' : 'no bleeding to bandage';
    case 'tourniquet': return heavy ? null : b.lightBleed >= 0 ? 'a bandage will do for this' : 'no heavy bleeding to stop';
    case 'splint': return broken ? null : 'nothing broken to splint';
    case 'painkillers': return b.leg !== 'ok' || b.arm !== 'ok' ? null : 'nothing hurts enough for them';
    default: return b.hp < S.hp || b.lightBleed >= 0 || b.heavyBleed ? null : 'you\'re not hurt';
  }
}

function apply(s: SimState, id: string) {
  const b = s.body;
  if (id === 'bandage') b.lightBleed = -1;
  else if (id === 'tourniquet') b.tourniquet = true;
  else if (id === 'splint') {
    if (b.leg === 'fracture' && !b.legSplint) { b.legSplint = true; b.legHealAt = s.time + S.injury.fractureDays * 86400; }
    else { b.armSplint = true; b.armHealAt = s.time + S.injury.fractureDays * 86400; }
  } else if (id === 'painkillers') b.painkillerUntil = s.time + S.injury.painkillerHours * 3600;
  else { b.lightBleed = -1; b.heavyBleed = false; b.tourniquet = false; b.hp = Math.min(S.hp, b.hp + 30); }
}

for (const id of Object.keys(TREAT)) onUseId(id, s => {
  if (s.task) return;
  const no = why(s, id);
  if (no) { s.events.push({ t: 'msg', text: no }); return; }
  s.task = { id: `treat:${id}`, t: 0, dur: TREAT[id] };
  s.events.push({ t: 'sfx', id: 'treat' });
});

/** Every tick: a treatment under way, done, or stopped. */
export function stepTreat(s: SimState) {
  const t = s.task;
  if (!t?.id.startsWith('treat:')) return;
  const id = t.id.slice(6), st = heldStack(s), p = s.player;
  if (st?.id !== id || (p.mode !== 'ground' && p.mode !== 'air')) { s.task = null; s.events.push({ t: 'msg', text: 'interrupted' }); return; }
  t.t += DT;
  if (t.t < t.dur) return;
  s.task = null;
  apply(s, id);
  if (--st.n <= 0) takeStack(s.inv.pack, st.uid);
  s.events.push({ t: 'msg', text: { bandage: 'bandaged', tourniquet: 'tourniquet tight: the bleeding\'s stopped', splint: 'splinted', painkillers: 'painkillers taken', firstaid: 'patched up' }[id] ?? 'done' });
}
