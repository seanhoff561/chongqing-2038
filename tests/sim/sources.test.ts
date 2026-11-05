// M10-26 (U-104, "loot and areas finished"): every item can be found somewhere. Each item's sources, gathered from the
// game as it stands: the loot tables the world's containers and loose spots roll (and only those some container or
// spot uses), what's placed in containers by hand, what a new run starts with (his pack, the friends' crate, the Li
// flat's floor), the wrecks of the machines the run has, what's made at the bench from things found, and what's made
// in the hand (a bottle filled at the river). None without one; and every high-security site rolls its own table.
import { describe, it, expect } from 'vitest';
import { items } from '../../src/data/items';
import { loot, LEFTOVER } from '../../src/data/loot';
import { RECIPES } from '../../src/data/recipes';
import { SCRAP } from '../../src/sim/scrap';
import { SECURE } from '../../src/world/yuzhong/secure';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { startRun } from '../../src/sim/run';
import { addItem } from '../../src/sim/inventory';
import { useStack } from '../../src/sim/use';

const w = getWorld('yuzhong');

/** Every item's sources, by id. */
function sources() {
  const src = new Map<string, string[]>(), add = (id: string, why: string) => (src.get(id) ?? src.set(id, []).get(id)!).push(why);
  // The containers: what's put in each by hand, and the table each rolls (as sim/loot.ts chooses it).
  const tables = new Map<string, string>();
  for (const it of w.inter) {
    if (it.kind !== 'container') continue;
    const d = (it.data ?? {}) as { items?: [string, number][]; tier?: number; loot?: string; room?: string; type?: string };
    for (const [id] of d.items ?? []) add(id, `placed in ${it.id}`);
    const t = d.tier ? `tier${d.tier}` : d.loot ?? LEFTOVER.rooms[d.room ?? ''] ?? LEFTOVER.of[d.type ?? ''];
    if (t && !tables.has(t)) tables.set(t, it.id);
  }
  // (The rooms' loose spots, sim/loose.ts.)
  for (const f of w.features) if (f.kind.startsWith('loose:') && !tables.has(f.kind.slice(6))) tables.set(f.kind.slice(6), 'a loose spot');
  for (const [t, at] of tables) for (const e of loot[t]?.items ?? []) if (e.w > 0) add(e.id, `loot ${t} (${at})`);
  // A new run: his pack, the friends' crate, what lies in the Li flat.
  const s = createState(1, w);
  startRun(s, w);
  for (const i of s.inv.pack.items) add(i.id, 'his pack at the start');
  for (const [k, g] of Object.entries(s.containers)) for (const i of g.items) add(i.id, `${k} at the start`);
  for (const d of s.dropped) add(d.stack.id, 'lying in the world at the start');
  // The machines' wrecks, of the kinds the run has.
  for (const k of new Set(s.units.map(u => u.kind))) for (const [id] of SCRAP[k] ?? []) add(id, `a ${k}'s wreck`);
  // Made in the hand: a bottle filled standing in the river.
  const r = createState(1, w);
  r.player.pos.y = w.water[0].y1 - 0.5;
  addItem(r, r.inv.pack, 'bottle', 1);
  useStack(r, w, r.inv.pack.items.find(i => i.id === 'bottle')!, { mx: 0, my: 0, yaw: 0, pitch: 0, buttons: 0, pressed: 0, slot: -1 });
  for (const i of r.inv.pack.items) if (i.id !== 'bottle') add(i.id, 'a bottle filled at the river');
  // Made at the bench, from things that are found (until nothing more can be made).
  for (let more = true; more; ) {
    more = false;
    for (const q of RECIPES) if (!src.has(q.id) && q.parts.every(([id]) => src.has(id))) { add(q.id, `made from ${q.parts.map(p => p[0]).join(' + ')}`); more = true; }
  }
  return { src, tables };
}

describe('every item can be found (M10-26)', () => {
  const { src, tables } = sources();
  it('has a source for every item', () => {
    const none = items.filter(i => !src.has(i.id)).map(i => i.id);
    expect(none, `no source for: ${none.join(', ')}`).toEqual([]);
  });
  it('the hiking pack, the keys and the site finds among them, where they belong', () => {
    const has = (id: string, re: RegExp) => expect(src.get(id)?.some(x => re.test(x)), `${id}: ${src.get(id)?.join('; ')}`).toBe(true);
    has('hikingpack', /^loot (bedroom|shop)/);
    has('sitecard', /lying in the world/);
    has('hook', /placed in site-box/);
    has('pulley', /placed in site-cab/);
    has('metrokey', /placed in svc-locker/);
    has('blastcard', /placed in svc-locker/);
    has('hvfuse', /placed in/);
    has('opkey', /placed in/);
    has('schedule', /placed in/);
  });
  it('rolls each high-security site\'s own table, the construction site\'s among them', () => {
    for (const t of SECURE.map(q => q.loot).concat('construction')) expect(tables.has(t), t).toBe(true);
  });
});
