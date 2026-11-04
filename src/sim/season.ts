// The seasons (M5-28, U-032): a run starts in late autumn (U-104: 1 November) and goes on into winter, deep winter by
// the 45th day. The trees are already gold and brown and thinning, and go on dropping their leaves (bare by winter); the
// fallen leaves lie over the grass and in patches on the ground, thickest a few weeks in, then rot away; the grass
// dries to straw; the days draw in (dawn later and dusk earlier, by up to 40 minutes each); and the fog season comes
// on: foggier mornings, fewer but longer spells of rain. A pure function of the game time.
import { dayOf, hourOf } from './clock';

/** The days from the start to deep winter; how much the days draw in (hours, each end); the weather's turn. */
export const SEASON = { winter: 45, drawIn: 0.66, fog: 0.2, rainyDay: -0.12, spellLen: 2 };

export interface Season { t: number; name: 'autumn' | 'winter'; turn: number; bare: number; litter: number; straw: number; shift: number }

/** How far into winter (0 late autumn, 1 deep winter) and what that means. */
export function seasonOf(time: number): Season {
  const t = Math.max(0, Math.min(1, (dayOf(time) - 1 + hourOf(time) / 24) / SEASON.winter));
  const ease = (a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  return {
    t, name: t < 0.6 ? 'autumn' : 'winter',
    // Most leaves turned at the start and a third of them down; all turned in a fortnight, bare by deep winter.
    turn: 0.8 + 0.2 * ease(0, 0.3),
    bare: 0.3 + 0.55 * ease(0, 0.7),
    // The leaves on the ground: plenty at the start, thickest a few weeks in, rotted mostly away by deep winter.
    litter: 0.55 + 0.35 * ease(0, 0.4) - 0.6 * ease(0.6, 1),
    straw: 0.3 + 0.7 * ease(0, 0.55),
    shift: SEASON.drawIn * t,
  };
}
