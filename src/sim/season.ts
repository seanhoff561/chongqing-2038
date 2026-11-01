// The seasons (M5-28, U-032): a run starts in mid-autumn and goes on into winter, deep winter by the 45th day. The
// trees turn gold and brown and drop their leaves (most falling through the late autumn, bare by winter), the grass dries
// to straw, the days draw in (dawn later and dusk earlier, by up to 40 minutes each), and the fog season comes on:
// foggier mornings, fewer but longer spells of rain. A pure function of the game time.
import { dayOf, hourOf } from './clock';

/** The days from the start to deep winter; how much the days draw in (hours, each end); the weather's turn. */
export const SEASON = { winter: 45, drawIn: 0.66, fog: 0.2, rainyDay: -0.12, spellLen: 2 };

export interface Season { t: number; name: 'autumn' | 'winter'; turn: number; bare: number; falling: number; straw: number; shift: number }

/** How far into winter (0 mid-autumn, 1 deep winter) and what that means. */
export function seasonOf(time: number): Season {
  const t = Math.max(0, Math.min(1, (dayOf(time) - 1 + hourOf(time) / 24) / SEASON.winter));
  const ease = (a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  return {
    t, name: t < 0.6 ? 'autumn' : 'winter',
    // Leaves a third turned at the start, all turned by the time most are down.
    turn: 0.3 + 0.7 * ease(0, 0.5),
    bare: ease(0.25, 0.8) * 0.85,
    // Falling hardest as they go, a few still at the start and almost none once bare.
    falling: Math.max(0.1, 1 - Math.abs(t - 0.5) / 0.35) * (1 - ease(0.85, 1)),
    straw: ease(0.1, 0.6),
    shift: SEASON.drawIn * t,
  };
}
