// M5-23b: roller shutters. Some of the city's locked street doors are shopfront shutters. Without a crowbar it won't
// give; with one, three and a half seconds' prising (heard 20 m) raises it enough to crawl under, not to walk.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs, aim } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { B } from '../../src/sim/types';
import { SHUTTER } from '../../src/sim/doors';
import { solid } from '../../src/world/geom';
import { getWorld } from '../../src/world/build';
import type { Inter } from '../../src/world/world';

describe('roller shutters (M5-23b)', () => {
  it('are on some shopfronts, and prised up with the crowbar enough to crawl under', () => {
    const city = getWorld('yuzhong'), shutters = city.inter.filter(i => i.data?.shutter);
    expect(shutters.length).toBeGreaterThan(10);
    for (const sh of shutters.slice(0, 20)) { expect(sh.data!.lock).toBe('locked'); expect(city.props.some(p => p.text === sh.id)).toBe(false); }
    const inter: Inter[] = [{ id: 'sh1', kind: 'door', x: 0, y: 1.1, z: -2, r: 0.9, zh: '卷帘门', en: 'Roller shutter', data: { solid: 3, lock: 'locked', shutter: true } }];
    const { world: w, state: s } = setup([floor(0, 50), solid(-20, 0, -2.2, -0.8, 4, -1.8), solid(0.8, 0, -2.2, 20, 4, -1.8), solid(-0.8, 0, -2.03, 0.8, 2.2, -1.97)], { x: 0, y: 0, z: 0, yaw: 0 }, { inter });
    run(s, w, 3);
    const msgs: string[] = [];
    let loud = 0;
    const work = (n: number) => { aim(s, 0, 1.1, -2); run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT }, st => { for (const e of st.events) if (e.t === 'msg') msgs.push(e.text); }); run(s, w, n, { buttons: B.INTERACT }, st => { for (const e of st.events) if (e.t === 'noise') loud = Math.max(loud, e.r); }); };
    work(10);
    expect(msgs.at(-1)).toMatch(/crowbar/);
    addItem(s, s.inv.pack, 'crowbar', 1);
    work(secs(SHUTTER.pry - 0.5));
    expect(s.wstate.open.sh1).toBeFalsy();
    run(s, w, secs(0.7), { buttons: B.INTERACT }, st => { for (const e of st.events) if (e.t === 'noise') loud = Math.max(loud, e.r); });
    expect(s.wstate.open.sh1).toBe(true);
    expect(loud).toBe(SHUTTER.noise);
    // Walking at it: stopped. Crawling: under.
    run(s, w, secs(2), { my: 1, pitch: 0 });
    expect(s.player.pos.z).toBeGreaterThan(-2);
    run(s, w, 1, { pressed: B.CRAWL }); run(s, w, secs(1));
    run(s, w, secs(4), { my: 1, pitch: 0 });
    expect(s.player.pos.z).toBeLessThan(-2.5);
  });
});
