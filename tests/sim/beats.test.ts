// M8-15: the story's beats. The voicemail plays the first time he has the phone (not again by itself), spoken only
// (U-104); Haozi's three chalk mice are in the tunnels, saying nothing.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { run, secs } from './helpers';
import { addItem } from '../../src/sim/inventory';

describe('the story in the world (M8-15)', () => {
  it('plays the voicemail once; the chalk mice are there', () => {
    const w = getWorld('yuzhong'), s = createState(1, w), said: string[] = [], hear = (st: typeof s) => { for (const e of st.events) if (e.t === 'say') said.push(e.id); };
    s.flags.god = true; s.time = 12 * 3600; s.units.length = 0;
    const marks = w.features.filter(f => f.kind.startsWith('mark:'));
    expect(marks.length).toBe(3);
    expect(w.props.filter(p => p.kind === 'chalkmouse').length).toBe(3);
    // The phone: its voicemail, once.
    addItem(s, s.inv.pack, 'phone', 1, { charge: 6 });
    run(s, w, secs(2), {}, hear);
    run(s, w, secs(2), {}, hear);
    expect(said.filter(x => x === 'vm-01').length).toBe(1);
  });
});
