// M5-32: Anna's remarks. Every trigger's line is a real line of hers; she speaks up when he starts bleeding, when her
// battery's nearly flat (never a drone's signal: U-099), and when a tag's on him and then off; not twice
// in a minute for the same thing.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { REMARKS } from '../../src/sim/remarks';
import { lineById } from '../../src/data/dialogue';
import { addItem } from '../../src/sim/inventory';
import type { Patrol } from '../../src/world/world';

describe("Anna's remarks (M5-32)", () => {
  it('maps every trigger to a line, and says them when things happen', () => {
    for (const [k, id] of Object.entries(REMARKS.lines)) { expect(lineById.get(id), k).toBeDefined(); expect(lineById.get(id)!.speaker).toBe('anna'); }
    const beat: Patrol = { kind: 'drone', unit: 'drone', pts: [{ x: 20, y: 0, z: 0 }, { x: 30, y: 0, z: 0 }], dwell: [0, 0], hours: [0, 24] };
    const { world: w, state: s } = setup([floor(0, 100)], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [beat] });
    s.time = 12 * 3600;
    const said: string[] = [], hear = (st: typeof s) => { for (const e of st.events) if (e.t === 'say') said.push(e.id); };
    run(s, w, secs(1), {}, hear);
    expect(said).toEqual([]);
    // Bleeding.
    s.body.lightBleed = 0;
    run(s, w, 2, {}, hear);
    expect(said).toContain('anna-bleed');
    // Her battery, nearly flat.
    s.laptop = { open: true, charge: 0.1 };
    run(s, w, 2, {}, hear);
    expect(said).toContain('anna-battery');
    // The SDR: the tag on him (and no word of a drone close any more, U-099).
    s.player.tag = true;
    addItem(s, s.inv.pack, 'sdr', 1);
    run(s, w, secs(2.5), {}, hear);
    expect(said).toContain('anna-tag');
    expect(said).not.toContain('anna-drone');
    s.player.tag = false;
    run(s, w, 2, {}, hear);
    expect(said).toContain('anna-tag-off');
    // Not again within the minute.
    const n = said.filter(x => x === 'anna-tag').length;
    s.player.tag = true;
    run(s, w, secs(20), {}, hear);
    expect(said.filter(x => x === 'anna-tag').length).toBe(n);
  });
});
