// M8-15: the story's beats, once each a run. The voicemail plays the first time he has the phone (not again by itself);
// at each of Haozi's chalk mice in the tunnels Li Wei says his word the first time; Anna speaks as the first night falls.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { run, secs } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { teleport } from '../../src/sim/player';

describe('the story in the world (M8-15)', () => {
  it('plays the voicemail, the marks and the first night once each', () => {
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
    // Each chalk mouse, standing by it facing it: once.
    for (const m of marks) {
      for (const [dx, dz] of [[1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5]]) {
        teleport(s.player, m.x + dx, m.y - 1.2, m.z + dz);
        s.player.yaw = Math.atan2(dx, dz);
        run(s, w, 31, { yaw: Math.atan2(dx, dz), pitch: 0 }, hear);
        if (said.includes(`mark-${m.kind.slice(5)}`)) break;
      }
      expect(said, m.kind).toContain(`mark-${m.kind.slice(5)}`);
    }
    run(s, w, 62, {}, hear);
    expect(said.filter(x => x.startsWith('mark-')).length).toBe(3);
    // The first night.
    s.time = 20.99 * 3600;
    run(s, w, secs(2), {}, hear);
    s.time = 23 * 3600;
    run(s, w, secs(2), {}, hear);
    expect(said.filter(x => x === 'anna-night-1').length).toBe(1);
  });
});
