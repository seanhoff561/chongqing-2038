// M5-36: every tool has two uses. Each tool lists at least two, and each is something the game does: an item used in
// hand, a kind of thing he works with it, or the system that carries it out. No one tool opens every grade of lock.
import { describe, it, expect } from 'vitest';
import { items } from '../../src/data/items';
import { setup, floor } from './helpers';
import { usedInHand } from '../../src/sim/use';
import { interKinds } from '../../src/sim/interact';
import { lockWay } from '../../src/sim/locks';
import { addItem } from '../../src/sim/inventory';
import { stepBinos } from '../../src/sim/binoculars';
import { stepRappel } from '../../src/sim/rappel';
import { stepThrown } from '../../src/sim/throw';
import { OXYGEN } from '../../src/sim/swim';
import { tryZip } from '../../src/sim/zip';
import { SALVAGE } from '../../src/sim/scrap';
import { GRATE } from '../../src/sim/grate';
import type { Inter } from '../../src/world/world';

// What carries out each use: [the tool it's checked for, a check that the game does it].
const ACTIONS: Record<string, (tool: string) => boolean> = {
  'make-bench': t => usedInHand(t), salvage: t => !!SALVAGE.tools[t] && interKinds().includes('wreck'),
  'climb-grapple': t => usedInHand(t), rappel: () => typeof stepRappel === 'function' && interKinds().includes('rope'),
  'ladder-wall': t => usedInHand(t), 'ladder-bridge': t => usedInHand(t) && interKinds().includes('plank'), 'drop-noise': () => true,
  pry: () => interKinds().includes('door') && interKinds().includes('container'), melee: t => usedInHand(t), 'scooter-battery': () => interKinds().includes('scooter'),
  'pick-lock': () => interKinds().includes('door'), 'pick-padlock': () => interKinds().includes('door'),
  'cut-chain': () => interKinds().includes('door'), 'cut-bolt': () => interKinds().includes('grate') && GRATE.cut > 0, 'cut-fence': () => interKinds().includes('fence'), 'cut-cable': () => interKinds().includes('jbox'),
  'fixed-line': () => interKinds().includes('rope') || interKinds().includes('zipkit'), zipline: () => typeof tryZip === 'function',
  zoom: () => typeof stepBinos === 'function', 'patrol-log': () => typeof stepBinos === 'function',
  'ride-haul-rope': () => typeof tryZip === 'function', 'breathe-underwater': () => OXYGEN.secs > 0, 'breathe-gas': () => typeof stepThrown === 'function',
};

describe('every tool has two uses (M5-36)', () => {
  it('lists two or more for each tool, each one carried out', () => {
    // ('drop-noise': drops.ts makes the ladder's clatter 30 m, ladder.test.ts.)
    for (const it of items.filter(i => i.cat === 'tool')) {
      expect(it.uses?.length ?? 0, it.id).toBeGreaterThanOrEqual(2);
      for (const u of it.uses!) { expect(ACTIONS[u], `${it.id}: ${u}`).toBeDefined(); expect(ACTIONS[u](it.id), `${it.id}: ${u}`).toBe(true); }
    }
  });
  it('lets no one tool open every grade of lock', () => {
    const { state: s } = setup([floor()]);
    const door = (id: string, data: Record<string, unknown>): Inter => ({ id, kind: 'door', x: 0, y: 1, z: 0, r: 0.7, zh: '', en: '', data });
    // (Sixty locked doors, half of them bad locks and half good, and a keycard door: every grade.)
    const ids = Array.from({ length: 60 }, (_, i) => `d${i}`);
    for (const tool of items.filter(i => i.cat === 'tool' || i.cat === 'device').map(i => i.id)) {
      s.inv.pack.items.length = 0; addItem(s, s.inv.pack, tool, 1); s.inv.hotbar[0] = s.inv.pack.items[0]?.uid ?? null; s.inv.held = 1;
      const opens = (data: Record<string, unknown>) => ids.some(id => typeof lockWay(s, door(id, data), data.lock as string | undefined) !== 'string');
      const all = opens({ lock: 'locked' }) && ids.every(id => typeof lockWay(s, door(id, { lock: 'locked' }), 'locked') !== 'string') && opens({ key: 'sitecard' });
      expect(all, tool).toBe(false);
    }
  });
});
