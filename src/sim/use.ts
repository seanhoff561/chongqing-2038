// The held item: hotbar selection and using it (left mouse). Item behaviours register by id or category.
import { B, type InputFrame, type SimState } from './types';
import type { World } from '../world/world';
import type { Stack } from './inventory';
import { item, type ItemCat } from '../data/items';
import { onCmd } from './commands';

type UseFn = (s: SimState, w: World, st: Stack, input: InputFrame) => void;
const byId = new Map<string, UseFn>();
const byCat = new Map<ItemCat, UseFn>();
export const onUseId = (id: string, f: UseFn) => byId.set(id, f);
export const onUseCat = (c: ItemCat, f: UseFn) => byCat.set(c, f);

/** The stack in his hands, or null for empty hands. */
export function heldStack(s: SimState): Stack | null {
  if (s.inv.held <= 0) return null;
  const uid = s.inv.hotbar[s.inv.held - 1];
  return s.inv.pack.items.find(x => x.uid === uid) ?? null;
}

/** Why using a thing did nothing (U-050: every use answers), by what it is. */
const WHY: Partial<Record<ItemCat, string>> = {
  med: 'nothing for it to treat', wear: "it's worn as it is", tool: 'nothing here to use it on', device: 'nothing here for it to work on',
  part: 'a part: it goes into something at a workbench', key: 'it opens something: use it at what it fits', ammo: 'R loads it, with the gun in hand',
  throw: 'nothing here to throw it at', weapon: 'nothing in reach', misc: 'nothing to do with it here',
};
const WHY_ID: Record<string, string> = { headlamp: 'H switches the headlamp on and off' };

export function useStack(s: SimState, w: World, st: Stack, input: InputFrame) {
  const it = item(st.id), f = byId.get(st.id) ?? byCat.get(it.cat);
  s.events.push({ t: 'use', id: st.id });
  const n = s.events.length, task = s.task, held = s.inv.held, count = st.n, charge = st.charge;
  f?.(s, w, st, input);
  // Nothing came of it that he'd notice: he's told why.
  if (s.events.length === n && s.task === task && s.inv.held === held && st.n === count && st.charge === charge) s.events.push({ t: 'msg', text: `${it.en}: ${WHY_ID[st.id] ?? WHY[it.cat] ?? 'nothing to do with it here'}` });
}

onCmd((s, c, w) => {
  if (c.c !== 'use') return;
  const st = s.inv.pack.items.find(x => x.uid === c.uid);
  if (st) useStack(s, w, st, { mx: 0, my: 0, yaw: 0, pitch: 0, buttons: 0, pressed: 0, slot: -1 });
});

export function stepHeld(s: SimState, w: World, input: InputFrame) {
  // No drawing an item while hanging on by the hands.
  if (input.slot >= 0 && !(s.player.mode === 'grip' && input.slot > 0)) s.inv.held = s.inv.held === input.slot && input.slot > 0 ? 0 : input.slot;
  const st = heldStack(s);
  if (!st) return;
  if ((input.pressed & B.USE) && s.player.mode !== 'dead' && s.player.mode !== 'hidden') useStack(s, w, st, input);
}
