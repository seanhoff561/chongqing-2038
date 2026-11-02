// M4-50 (U-051): opening and searching make the sound that fits the thing. Every kind of thing he can act on, and every
// kind of container, maps to a sound that exists; starting on one plays it.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { CONTAINER } from '../../src/sim/containers';
import { START_SOUND, interKinds } from '../../src/sim/interact';
import { setup, run, floor, secs } from './helpers';
import { STOMACH } from '../../src/sim/body';
import { B } from '../../src/sim/types';
import type { Inter } from '../../src/world/world';

describe('the sounds of things (M4-50)', () => {
  it('every interactable kind maps to a sound, and starting on one plays it', () => {
    const src = fs.readFileSync('src/audio/moves.ts', 'utf8'), has = (id: string) => src.includes(`'${id}':`) || src.includes(`  ${id}:`);
    const thing = (kind: string, data?: Record<string, unknown>): Inter => ({ id: 'x', kind, x: 0, y: 0.9, z: -1.5, r: 0.5, zh: '', en: '', data });
    // (Registered by the sim's modules as they load.)
    setup([floor()]);
    expect(interKinds().length).toBeGreaterThanOrEqual(8);
    // (Grates and trapdoors are worked in silence: U-086.)
    const SILENT = new Set(['grate']);
    for (const k of interKinds()) {
      if (SILENT.has(k)) { expect(START_SOUND[k], k).toBeUndefined(); continue; }
      expect(START_SOUND[k], k).toBeDefined(); expect(has(START_SOUND[k](thing(k))), START_SOUND[k](thing(k))).toBe(true);
    }
    // (Lockers open in silence: U-098.)
    for (const type of Object.keys(CONTAINER)) if (type !== 'locker') expect(has(START_SOUND.container(thing('container', { type }))), type).toBe(true);
    // A crate searched: its lid scraping as he starts.
    const { world, state } = setup([floor()], { x: 0, y: 0, z: 0, yaw: 0 }, { inter: [{ ...thing('container', { type: 'crate', items: [] }), id: 'l1' }] });
    const heard: string[] = [];
    run(state, world, 2, { pitch: -0.3 });
    run(state, world, 1, { pitch: -0.3, buttons: B.INTERACT, pressed: B.INTERACT }, s => { for (const e of s.events) if (e.t === 'sfx') heard.push(e.id); });
    expect(heard).toContain('open-crate');
  });

  it('hungry, his stomach growls now and then, heard a few metres off (M8-08)', () => {
    const { world, state } = setup([floor()]), heard: number[] = [];
    run(state, world, secs(60), {}, s => { for (const e of s.events) if (e.t === 'noise' && e.kind === 'stomach') heard.push(e.r); });
    expect(heard, 'fed: quiet').toEqual([]);
    state.body.satiety = STOMACH.below - 5;
    run(state, world, secs(STOMACH.every * 2.5), {}, s => { for (const e of s.events) if (e.t === 'noise' && e.kind === 'stomach') heard.push(e.r); });
    expect(heard.length).toBeGreaterThanOrEqual(2);
    expect(heard.every(r => r === STOMACH.r)).toBe(true);
  });
});
