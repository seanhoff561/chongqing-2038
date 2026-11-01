// Lock grades (M5-24, DESIGN section 8). A door's lock is bad (the lockpick opens it, quietly, or the crowbar wrenches
// it), good (the crowbar only) or secure (a keycard reader: its card, or the cloner). Which a locked door has is fixed
// for the door: about half of them bad. A chain's padlock picks as a bad lock does, or is cut or prised. The cloner,
// held at a secure door's reader for 8 s, copies the card it's waiting for and opens it; used on a humanoid shut down
// or wrecked, it copies its police-network badge. Each card he's cloned opens what that card would.
import type { SimState } from './types';
import type { Inter } from '../world/world';
import { has } from './inventory';
import { heldStack, onUseId } from './use';
import { lookTarget, allInters } from './interact';
import { hashString } from './rng';
import { takeStack } from './inventory';

export type Grade = 'bad' | 'good' | 'secure';
/** Seconds: the lockpick set, the improvised picks, the cloner at a reader; the card a humanoid's badge copies. */
export const LOCKS = { pick: 4, picks: 6, clone: 8, badge: 'policecard', /** bolt cutters through a chain or its padlock */ cut: 1.5 };

/** A locked door's grade. */
export const gradeOf = (it: Inter): Grade => (it.data?.key ? 'secure' : hashString(`grade:${it.id}`) % 100 < 50 ? 'bad' : 'good');
/** Whether he has a door's card, or a clone of it. */
export const hasCard = (s: SimState, key: string) => has(s.inv.pack, key) || !!s.cloned?.includes(key);

/** How he'd open a door's lock now: the tool and its seconds (0 for none needed), loud or not; or why he can't. */
export function lockWay(s: SimState, it: Inter, lock: string | undefined): { how: string; secs: number; loud: boolean } | string {
  const key = it.data?.key as string | undefined;
  if (key && !s.wstate.unlocked?.[it.id]) {
    if (hasCard(s, key)) return { how: 'card', secs: 0, loud: false };
    if (heldStack(s)?.id === 'cloner') return { how: 'clone', secs: LOCKS.clone, loud: false };
    return 'locked: a keycard reader';
  }
  if (lock !== 'locked' && lock !== 'chained') return { how: 'none', secs: 0, loud: false };
  const crowbar = has(s.inv.pack, 'crowbar'), held = heldStack(s)?.id;
  // (A bad lock or a padlock: picked, quietly, unless he's got the crowbar or bolt cutters in hand.)
  const pickable = lock === 'chained' || gradeOf(it) === 'bad', pick = has(s.inv.pack, 'lockpick') ? 'lockpick' : has(s.inv.pack, 'picks') ? 'picks' : null;
  if (pickable && pick && held !== 'crowbar' && held !== 'boltcutters') return { how: pick, secs: pick === 'lockpick' ? LOCKS.pick : LOCKS.picks, loud: false };
  // (Bolt cutters through the chain, quietly, M5-25; the crowbar prises it, loudly.)
  if (lock === 'chained') return has(s.inv.pack, 'boltcutters') && held !== 'crowbar' ? { how: 'cut', secs: LOCKS.cut, loud: false } : crowbar ? { how: 'force', secs: 2.2, loud: true } : 'chained shut';
  return crowbar ? { how: 'force', secs: 1.6, loud: true } : gradeOf(it) === 'bad' ? 'locked: a cheap lock, a pick would open it' : 'locked: a good lock, it needs the crowbar';
}

/** Picked or cloned: the picks used up one, the card copied. */
export function lockDone(s: SimState, it: Inter, how: string) {
  if (how === 'picks') { const st = s.inv.pack.items.find(i => i.id === 'picks'); if (st) { st.charge = (st.charge ?? 3) - 1; if (st.charge <= 0 && --st.n <= 0) takeStack(s.inv.pack, st.uid); else if (st.charge <= 0) st.charge = 3; } }
  if (how === 'clone') { const key = it.data!.key as string; (s.cloned ??= []).includes(key) || s.cloned.push(key); s.events.push({ t: 'msg', text: 'card cloned' }); }
}

// The cloner on a humanoid that's down (shut down or wrecked): its badge.
onUseId('cloner', (s, w) => {
  const t = lookTarget(s, w), u = t?.id.startsWith('wreck:') ? s.units.find(q => `wreck:${q.id}` === t.id) : undefined;
  if (!u || u.kind !== 'humanoid') { s.events.push({ t: 'msg', text: allInters(s, w).length && t?.kind === 'door' ? 'hold it to the reader: use the door' : "nothing here with a card to copy" }); return; }
  if (s.cloned?.includes(LOCKS.badge)) { s.events.push({ t: 'msg', text: 'already copied' }); return; }
  (s.cloned ??= []).push(LOCKS.badge);
  s.events.push({ t: 'msg', text: "badge cloned: the police network's doors" });
});
