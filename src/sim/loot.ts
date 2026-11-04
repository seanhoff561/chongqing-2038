// Rolling loot. Each container rolls from its own stream (run seed + container id), so what it holds
// doesn't depend on the order the player opens things.
import type { SimState } from './types';
import type { Inter } from '../world/world';
import { loot, LEFTOVER, type LootTable } from '../data/loot';
import { item } from '../data/items';
import { MAGS } from '../data/units';
import { makeRng, rand, randInt, hashString, type Rng } from './rng';
import { addItem } from './inventory';
import { setFiller } from './containers';

export function rollLoot(s: SimState, it: Inter) {
  const g = s.containers[it.id];
  // (A found document put in it for the run: M10-37.)
  const doc = s.docs?.[it.id];
  if (doc) addItem(s, g, doc, 1);
  for (const [id, n] of (it.data?.items as [string, number][] | undefined) ?? []) addItem(s, g, id, n);
  // (A wreck holds its parts and nothing else: no chocolate in a drone, M5-16.)
  if (it.id.startsWith('wreck:')) return;
  // (A site's container rolls from its tier's table: M5-31.)
  const chosen = (it.data?.tier ? `tier${it.data.tier}` : it.data?.loot) as string | undefined, left = chosen ? undefined : LEFTOVER.rooms[(it.data?.room as string) ?? ''] ?? LEFTOVER.of[(it.data?.type as string) ?? ''];
  const t = loot[chosen ?? left ?? ''];
  if (!t) return;
  const r = makeRng(hashString(`${s.seed}:${it.id}`));
  // Not the one chosen for it: now and then one thing left behind (U-085).
  if (left ? rand(r) >= LEFTOVER.chance : rand(r) < t.empty) return;
  const rolls = left ? 1 : t.rolls[0] + randInt(r, t.rolls[1] - t.rolls[0] + 1);
  for (let k = 0; k < rolls; k++) { const [id, n, extra] = rollOne(s, r, t); addItem(s, g, id, n, extra); }
}

/** One thing from a table: its id, how many, and (food) when it was made. */
export function rollOne(s: SimState, r: Rng, t: LootTable): [string, number, { made?: number; charge?: number }] {
  const total = t.items.reduce((a, e) => a + e.w, 0);
  let x = rand(r) * total;
  const e = t.items.find(e => (x -= e.w) < 0)!;
  const n = e.n ? e.n[0] + randInt(r, e.n[1] - e.n[0] + 1) : 1;
  const food = item(e.id).food;
  // Food was made some while before the machines came; fresh food may already be past its date. A magazine's full; a
  // pistol has what was left in it.
  if (MAGS[e.id]) return [e.id, n, { charge: MAGS[e.id] }];
  if (e.id === 'pistol') return [e.id, n, { charge: randInt(r, 16) }];
  // (A car's battery, with what it's held on to since: M5-27.)
  if (e.id === 'carbattery') return [e.id, n, { charge: 20 + randInt(r, 61) }];
  return [e.id, n, food ? { made: s.time - rand(r) * Math.min(food.shelfDays * 1.3, 400) * 86400 } : {}];
}

setFiller(rollLoot);
