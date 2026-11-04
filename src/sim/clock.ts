// Game clock: one game day per 36 real minutes. Time is game seconds since day 1, 00:00.
import { survival as S } from '../data/survival';
import { DT } from './types';
import { seasonOf } from './season';

export const SCALE = 86400 / S.daySeconds;
export const GAME_PER_TICK = DT * SCALE;
export const HOUR = 3600;

export const dayOf = (t: number) => Math.floor(t / 86400) + 1;
export const hourOf = (t: number) => (t % 86400) / 3600;

export type Phase = 'dawn' | 'day' | 'dusk' | 'night';
/** The day's dawn, day, dusk and night hours, drawn in toward winter (M5-28). */
const phasesOn = (t: number) => { const k = seasonOf(t).shift, P = S.phases; return { dawn: P.dawn + k, day: P.day + k, dusk: P.dusk - k, night: P.night - k }; };
export function phaseOf(t: number): Phase {
  const h = hourOf(t), P = phasesOn(t);
  if (h >= P.night || h < P.dawn) return 'night';
  if (h < P.day) return 'dawn';
  if (h < P.dusk) return 'day';
  return 'dusk';
}

/** Daylight 0..1 with smooth dawn and dusk ramps. */
export function daylight(t: number): number {
  const h = hourOf(t), P = phasesOn(t);
  if (h >= P.day && h < P.dusk) return 1;
  if (h >= P.dawn && h < P.day) return (h - P.dawn) / (P.day - P.dawn);
  if (h >= P.dusk && h < P.night) return 1 - (h - P.dusk) / (P.night - P.dusk);
  return 0;
}

/** Next game time at the given hour of day, strictly after t. */
export function nextHour(t: number, hour: number): number {
  const base = Math.floor(t / 86400) * 86400 + hour * 3600;
  return base > t ? base : base + 86400;
}

/** The calendar (U-104): day 1 is 1 November 2038, late autumn. A date and the time as a laptop shows them. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dateText = (t: number) => {
  const d = new Date(Date.UTC(2038, 10, dayOf(t))), h = Math.floor(hourOf(t)), m = Math.floor((t % 3600) / 60);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
export const clockText = (t: number) => {
  const h = Math.floor(hourOf(t)), m = Math.floor((t % 3600) / 60);
  return `D${dayOf(t)} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
