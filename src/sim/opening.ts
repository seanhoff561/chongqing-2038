// The opening scene (M10-52, U-104, DESIGN section 2): a new run in the start hideout begins at night, him lying on his
// back looking up (ui/opening.ts plays it: the fade from black, his look round, the blip). Beside him his bag with
// the laptop open on it, Anna on its screen: she says her three lines while he lies still, then he has control. He
// takes the laptop, then the bag (E on each); until the bag's on he can't search or pick anything up. The first time
// he opens the laptop she's mid-sentence (HELLO): full screen, then off to the corner, the status page behind her.
// Her speech goes on only while it's open, so shutting it holds her place.
import { DT, type InputFrame, type SimState } from './types';
import type { World, Inter } from '../world/world';
import { raycast } from '../world/geom';
import { WAKE_LINES, HELLO_LINES, readSecs, type Line } from '../data/dialogue';
import { onInteract, extraInters } from './interact';
import { START_CRATE, quietStart } from './run';

/** The hour it starts (day 1, night); seconds he lies looking round before she speaks; the blip to black at the end. */
export const OPENING = { hour: 2, look: 11.5, blip: 0.4 };

/** A moment in a scene (s in): a line said, and Anna's pose from then (anna.ts), close: leaning in to look at him,
 *  corner: off to the screen's corner. */
export type Cue = { at: number; say?: string; pose?: string; close?: boolean; corner?: boolean };

/** Lines one after the other from t: each after its pause (s), in its pose, its next line once it's been read; extra
 *  cues part way through a line (s after it starts). */
function scene(t: number, rows: [Line, number, Omit<Cue, 'at' | 'say'>, ...[number, Omit<Cue, 'at'>][]][]) {
  const cues: Cue[] = [];
  for (const [l, pause, cue, ...more] of rows) {
    t += pause;
    cues.push({ at: t, say: l.id, ...cue }, ...more.map(([d, c]) => ({ at: t + d, ...c })));
    t += readSecs(l.en);
  }
  return { cues, end: t };
}

const W = WAKE_LINES, H = HELLO_LINES;
/** As he wakes: she speaks, leans closer to look at him, pouts. */
export const WAKE = scene(OPENING.look, [[W[0], 0, { pose: 'talk' }, [3, { pose: 'idle' }]], [W[1], 0.6, { pose: 'talk', close: true }], [W[2], 0.8, { pose: 'pout', close: false }]]);
/** The scene's length: her last line read, then the blip. */
export const WAKE_END = WAKE.end + OPENING.blip;
/** The laptop first opened: mid-sentence, shouting, red, arms crossed thinking, laughing; then the corner. */
export const HELLO = scene(0, [
  [H[0], 0, { pose: 'talk' }, [2.4, { pose: 'shout' }]], [H[1], 0.2, { pose: 'blush' }], [H[2], 0.3, { pose: 'pout' }, [3.6, { pose: 'laugh' }]],
  [H[3], 0.4, { pose: 'talk' }], [H[4], 1.2, { pose: 'talk' }, [-1, { corner: true }]], [H[5], 0.4, { pose: 'talk' }], [H[6], 0.4, { pose: 'wave' }],
]);

/** A new run in the start hideout: night, him lying by his bag and laptop, the scene begun. (Nowhere else: the test
 *  shelter has none.) */
export function beginOpening(s: SimState, w: World) {
  if (!w.inter.some(i => i.id === START_CRATE)) return;
  s.time = Math.floor(s.time / 86400) * 86400 + OPENING.hour * 3600;
  // (The machines kept off his door from now.)
  quietStart(s, w);
  // On the floor at his right hand, a little toward his head.
  const sp = w.spawn, fx = -Math.sin(sp.yaw), fz = -Math.cos(sp.yaw), x = sp.x + fx * 0.25 - fz * 0.75, z = sp.z + fz * 0.25 + fx * 0.75;
  const hit = raycast(w.index, x, sp.y + 1, z, 0, -1, 0, 3);
  s.gear = { x, y: hit ? sp.y + 1 - hit.t : sp.y, z, yaw: sp.yaw, laptop: true, pack: true };
  s.opening = 0;
  s.hello = 0;
}

/** Lying still while it plays. */
export function openingInput(s: SimState, input: InputFrame): InputFrame {
  return s.opening === undefined ? input : { ...input, mx: 0, my: 0, buttons: 0, pressed: 0, slot: -1 };
}

const say = (s: SimState, cues: Cue[], a: number, b: number) => { for (const c of cues) if (c.say && c.at >= a && c.at < b) s.events.push({ t: 'say', id: c.say }); };

/** The scene on, and her speech while the laptop's open. */
export function stepOpening(s: SimState) {
  if (s.opening !== undefined) {
    const t = s.opening;
    s.opening += DT;
    say(s, WAKE.cues, t, s.opening);
    if (s.opening >= WAKE_END) delete s.opening;
  } else if (s.hello !== undefined && s.laptop?.open) {
    const t = s.hello;
    s.hello += DT;
    say(s, HELLO.cues, t, s.hello);
    if (s.hello >= HELLO.end) delete s.hello;
  }
}

/** On the floor: the laptop on top, then the bag under it. */
extraInters.push((s: SimState): Inter[] => {
  const g = s.gear;
  if (!g || s.opening !== undefined) return [];
  return [g.laptop ? { id: 'gear-laptop', kind: 'gear', x: g.x, y: g.y + 0.26, z: g.z, r: 0.35, zh: '笔记本电脑', en: 'Laptop' }
    : { id: 'gear-pack', kind: 'gear', x: g.x, y: g.y + 0.1, z: g.z, r: 0.4, zh: '书包', en: 'Backpack' }];
});
onInteract('gear', {
  now: (s, _w, it) => {
    const g = s.gear;
    if (!g) return;
    if (it.id === 'gear-laptop') g.laptop = false; else g.pack = false;
    if (!g.laptop && !g.pack) delete s.gear;
  },
});
