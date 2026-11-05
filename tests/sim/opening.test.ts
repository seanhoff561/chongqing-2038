// M10-52 (U-104): a new run in the start hideout opens at night, him lying still by his bag and laptop while Anna says
// her three lines; then he has control, takes the laptop and the bag, and only then can open it or search; the first
// time it's open she says her speech, mid-sentence, going on only while it's open.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { startRun, START_CRATE } from '../../src/sim/run';
import { beginOpening, WAKE_END, HELLO, OPENING } from '../../src/sim/opening';
import { hourOf } from '../../src/sim/clock';
import { B } from '../../src/sim/types';
import { WAKE_LINES, HELLO_LINES } from '../../src/data/dialogue';
import { run, aim, secs } from './helpers';

const w = getWorld('yuzhong');

describe('the opening scene (M10-52)', () => {
  it('lies him still at night by his bag while she speaks, then hands him the laptop, the bag and her speech', () => {
    const s = createState(5, w);
    s.flags.god = true;
    startRun(s, w);
    beginOpening(s, w);
    expect(hourOf(s.time)).toBeCloseTo(OPENING.hour, 1);
    const g = s.gear!, sp = w.spawn;
    expect(Math.hypot(g.x - sp.x, g.z - sp.z)).toBeLessThan(1.2);
    expect(Math.abs(g.y - (sp.y - 0.05))).toBeLessThan(0.2);
    // Lying there, he goes nowhere whatever he presses, and she says her three lines, in order.
    const said: string[] = [], at = { ...s.player.pos };
    run(s, w, secs(WAKE_END) + 2, { my: 1, buttons: B.SPRINT }, x => { for (const e of x.events) if (e.t === 'say') said.push(e.id); });
    expect(said).toEqual(WAKE_LINES.map(l => l.id));
    expect(s.opening).toBeUndefined();
    expect(Math.hypot(s.player.pos.x - at.x, s.player.pos.z - at.z)).toBeLessThan(0.05);
    // The laptop's still on the floor: it won't open; the bag too: the crate won't open.
    run(s, w, 2, { cmds: [{ c: 'act', name: 'laptop' }] });
    expect(s.laptop?.open).toBeFalsy();
    const crate = w.inter.find(i => i.id === START_CRATE)!;
    s.player.pos = { x: crate.x - 1, y: s.player.pos.y, z: crate.z };
    aim(s, crate.x, crate.y, crate.z);
    run(s, w, 2, { pressed: B.INTERACT });
    expect(s.openContainer).toBeNull();
    // Back to them: the laptop first, then the bag.
    s.player.pos = { ...at };
    const take = (id: string, y: number) => { aim(s, g.x, g.y + y, g.z); run(s, w, 2); expect(s.target).toBe(id); run(s, w, 2, { pressed: B.INTERACT }); };
    take('gear-laptop', 0.26);
    expect(s.gear?.laptop).toBe(false);
    take('gear-pack', 0.1);
    expect(s.gear).toBeUndefined();
    // Opened: her speech, on only while it's open.
    const heard: string[] = [], listen = (x: typeof s) => { for (const e of x.events) if (e.t === 'say') heard.push(e.id); };
    const open = () => run(s, w, 1, { cmds: [{ c: 'act', name: 'laptop' }] }, listen);
    open();
    expect(s.laptop?.open).toBe(true);
    run(s, w, secs(HELLO.cues.find(c => c.say === 'hello-4')!.at) - 2, {}, listen);
    expect(heard).toEqual(HELLO_LINES.slice(0, 3).map(l => l.id));
    open();
    const held = s.hello;
    run(s, w, secs(4), {}, listen);
    expect(s.hello).toBe(held);
    expect(heard.length).toBe(3);
    open();
    run(s, w, secs(HELLO.end), {}, listen);
    expect(heard).toEqual(HELLO_LINES.map(l => l.id));
    expect(s.hello).toBeUndefined();
    // Only once.
    open(); open();
    run(s, w, secs(3), {}, listen);
    expect(heard.length).toBe(HELLO_LINES.length);
  }, 600000);

  it('plays only in the start hideout', () => {
    const t = getWorld('hideout'), s = createState(5, t);
    startRun(s, t);
    beginOpening(s, t);
    expect(s.opening ?? s.gear ?? s.hello).toBeUndefined();
  });
});
