// Structures put up by hand above the ground (M10-38d): the river-police pier's deckhouse and the construction site's
// office block, each laid out in its owner's unturned frame (t along, s across, boxes in that frame, points on the
// map) with handunder.ts's tools: solid shells with rooms and doorways carved out of them (every space a cut), and the
// rest (doors, heaps, furniture, words, marks) as under the city. The owner turns its solids into place.
import { carve, type Solid } from '../geom';
import type { Hand } from './handunder';

export function built(pre: string, y: number, box: Hand['box'], pt: Hand['pt']) {
  const shells: Solid[] = [], cuts: Solid[] = [];
  const H: Hand = { pre, y, box, pt, kept: [], decor: [], props: [], inter: [], features: [], space: (t0, t1, s0, s1, y0, y1) => { cuts.push(box(t0, t1, s0, s1, y0, y1, 0)); } };
  return {
    H,
    /** The same hand on another floor. */
    on: (yy: number): Hand => ({ ...H, y: yy }),
    /** A solid shell, to be carved out by the spaces. */
    shell(t0: number, t1: number, s0: number, s1: number, y0: number, y1: number, mat: number, tint?: number) { shells.push({ ...box(t0, t1, s0, s1, y0, y1, mat), ...(tint ? { tint } : {}) }); },
    /** Its solids: the shells carved, then what's kept. */
    solids: () => cuts.reduce((a, c) => carve(a, c), shells).concat(H.kept),
  };
}
