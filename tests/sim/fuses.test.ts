// M7-13: shared scarce components. The city has two spare HV fuses: the one in the substation's relay cabinet and the
// second in the Raffles drone hub's spares cabinet (M6-18). The cableway's feeder (Route B's cabin) and the metro's
// (Route D's pumps) each take one: with one fuse he chooses which feeder lives and the other's stays dead; with the
// hub's too, both.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { syncWorld } from '../../src/sim/doors';
import { lookTarget } from '../../src/sim/interact';
import { raycast } from '../../src/world/geom';
import { CABIN } from '../../src/sim/cablecar';
import { B, type SimState } from '../../src/sim/types';
import type { Inter } from '../../src/world/world';
import { take } from './routekit';
import { run, secs, aim } from './helpers';

const w = getWorld('yuzhong');
const spares = w.inter.filter(i => i.kind === 'container' && (i.data?.items as [string, number][] | undefined)?.some(([id]) => id === 'hvfuse'));
const feeder = (live: string) => w.inter.find(i => i.kind === 'feeder' && i.data?.live === live)!;
const fuses = (s: SimState) => s.inv.pack.items.filter(i => i.id === 'hvfuse').reduce((a, i) => a + i.n, 0);

/** A run at noon with the machines away. */
function fresh(): SimState {
  const s = createState(4, w);
  s.flags.clear = true; s.flags.god = true; s.time = 12 * 3600;
  for (const u of s.units) u.off = Infinity;
  syncWorld(s, w);
  return s;
}
/** In front of a feeder's fuse carrier (out from its panel's middle), looking at it; E held till it's done. */
function fit(s: SimState, it: Inter) {
  const box = w.inter.filter(i => i.en === 'Feeder panel').sort((a, b) => Math.hypot(a.x - it.x, a.z - it.z) - Math.hypot(b.x - it.x, b.z - it.z))[0];
  const d = Math.hypot(it.x - box.x, it.z - box.z), x = it.x + ((it.x - box.x) / d) * 1.0, z = it.z + ((it.z - box.z) / d) * 1.0, h = raycast(w.index, x, it.y + 0.5, z, 0, -1, 0, 3)!;
  teleport(s.player, x, it.y + 0.5 - h.t + 0.05, z);
  run(s, w, 30);
  aim(s, it.x, it.y, it.z);
  run(s, w, 2);
  expect(lookTarget(s, w)?.id).toBe(it.id);
  run(s, w, secs(CABIN.fuse + 0.5), { buttons: B.INTERACT, pressed: B.INTERACT });
  run(s, w, 2);
}
const live = (s: SimState) => [!!s.wstate.open['cable-feeder'], !!s.wstate.open['metro-feeder']];

describe('shared scarce components (M7-13)', () => {
  it('has two spare HV fuses: the substation\'s and the drone hub\'s', () => {
    expect(spares.length).toBe(2);
    expect(spares.filter(i => i.id === 'hub-spares').length).toBe(1);
  });

  for (const [first, then] of [['cable-feeder', 'metro-feeder'], ['metro-feeder', 'cable-feeder']]) {
    it(`one fuse into the ${first.split('-')[0]} feeder leaves the ${then.split('-')[0]} feeder dead; the hub's second makes both live`, () => {
      const s = fresh(), sub = spares.find(i => i.id !== 'hub-spares')!, hub = spares.find(i => i.id === 'hub-spares')!;
      expect(take(s, w, [sub], st => st.id === 'hvfuse'), "the substation's fuse").toBe(sub.id);
      expect(fuses(s)).toBe(1);
      fit(s, feeder(first));
      expect(fuses(s)).toBe(0);
      fit(s, feeder(then));
      expect(live(s), 'one fuse, one feeder').toEqual(first === 'cable-feeder' ? [true, false] : [false, true]);
      expect(take(s, w, [hub], st => st.id === 'hvfuse'), "the hub's fuse").toBe(hub.id);
      fit(s, feeder(then));
      expect(live(s), 'the second fuse: both').toEqual([true, true]);
    }, 300000);
  }
});
