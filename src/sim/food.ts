// Eating and drinking, shelf life and food sickness.
import type { SimState } from './types';
import type { Stack } from './inventory';
import { item } from '../data/items';
import { onUseCat } from './use';
import { addItem, takeStack } from './inventory';
import { chance } from './rng';
import { survival as S } from '../data/survival';

/** Days of shelf life left (negative when spoiled), or null for non-food. */
export function shelfLeft(s: SimState, st: Stack): number | null {
  const f = item(st.id).food;
  if (!f) return null;
  return f.shelfDays - (s.time - (st.made ?? s.time)) / 86400;
}

/** What Anna says of a packet's date once she's read it (M5-05): days (or hours) left, or spoiled; nothing for one
 *  she hasn't scanned, or for what isn't food. */
export function foodCheck(s: SimState, st: Stack): [string, string] | null {
  const left = st.checked ? shelfLeft(s, st) : null;
  if (left === null) return null;
  if (left < 0) return ['已变质，别吃', "spoiled: don't eat it"];
  if (left < 1) { const h = Math.max(1, Math.floor(left * 24)); return [`还能放 ${h} 小时`, `keeps ${h} more hour${h > 1 ? 's' : ''}`]; }
  const d = Math.floor(left); return [`还能放 ${d} 天`, `keeps ${d} more day${d > 1 ? 's' : ''}`];
}

export const spoiled = (s: SimState, st: Stack) => (shelfLeft(s, st) ?? 1) < 0;

export function makeSick(s: SimState) {
  s.body.sickUntil = Math.max(s.body.sickUntil, s.time + S.injury.sickHours * 3600);
  s.body.nextVomit = Math.min(s.body.nextVomit > s.time ? s.body.nextVomit : Infinity, s.time + 3600);
}

export function eat(s: SimState, st: Stack) {
  const d = item(st.id), f = d.food!;
  const b = s.body;
  b.satiety = Math.min(100, b.satiety + f.satiety);
  b.hydration = Math.max(0, Math.min(100, b.hydration + f.hydration));
  if (f.energy) b.energy = Math.min(100, b.energy + f.energy);
  const sick = spoiled(s, st) || (f.raw !== undefined && chance(s.rng, f.raw)) || (f.dirty !== undefined && chance(s.rng, f.dirty));
  if (sick) makeSick(s);
  st.n--;
  if (st.n <= 0) takeStack(s.inv.pack, st.uid);
  if (st.id === 'water' || st.id === 'riverwater') addItem(s, s.inv.pack, 'bottle');
  s.events.push({ t: 'ate', id: st.id, sick });
}

onUseCat('food', (s, _w, st) => eat(s, st));
onUseCat('drink', (s, _w, st) => eat(s, st));
