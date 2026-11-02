// Weather (M3-12): a seeded schedule of fog and rain, a pure function of the run seed and the hour, so it
// costs no sim randomness and every save sees the same skies. Chongqing is the fog city: most mornings start
// in fog, some in thick fog; rain comes in spells of one to five hours. In winter some days it snows instead (U-097),
// and the snow lies on what's open to the sky, building while it falls and melting after.
import type { SimState } from './types';
import { GAME_PER_TICK } from './clock';
import { makeRng, rand, randInt, hashString } from './rng';
import { dayOf, hourOf } from './clock';
import { seasonOf, SEASON } from './season';

export interface Weather { fog: number; rain: number; snow: number }

/** Snow (U-097): the chance a winter day snows at its coldest (rising from the start of winter), how many hours of
 *  heavy snow cover everything, how many hours it takes to melt, and how much it thickens the air. */
export const SNOW = { chance: 0.4, from: 0.55, settle: 3, melt: 14, haze: 0.45, len: [2, 8] };

const W = { morningFog: 0.65, heavyFog: 0.3, fogEnd: [9, 12], spells: [0, 2], spellLen: [1, 5], rainyDay: 0.45 };

interface Day { fog: number; fogEnd: number; spells: { start: number; end: number; rain: number }[]; snow: boolean }

function day(seed: number, d: number): Day {
  const r = makeRng(hashString(`weather:${seed}:${d}`)), k = seasonOf((d - 1) * 86400 + 43200).t;
  // (Toward winter, the fog season: foggier mornings, fewer but longer spells of rain: M5-28.)
  const foggy = rand(r) < W.morningFog + SEASON.fog * k;
  const fog = foggy ? (rand(r) < W.heavyFog ? 0.85 + rand(r) * 0.15 : 0.35 + rand(r) * 0.3) : 0.05 + rand(r) * 0.1;
  const fogEnd = W.fogEnd[0] + rand(r) * (W.fogEnd[1] - W.fogEnd[0]);
  const spells: Day['spells'] = [];
  if (rand(r) < W.rainyDay + SEASON.rainyDay * k) {
    for (let i = 0, n = 1 + randInt(r, W.spells[1]); i < n; i++) {
      const start = rand(r) * 24, len = W.spellLen[0] + rand(r) * (W.spellLen[1] - W.spellLen[0]) + SEASON.spellLen * k;
      spells.push({ start, end: start + len, rain: 0.3 + rand(r) * 0.7 });
    }
  }
  // (A snow day from a stream of its own, so nothing else moves: its spells fall as snow, and it has one at least.)
  const rs = makeRng(hashString(`snow:${seed}:${d}`)), cold = Math.max(0, (k - SNOW.from) / (1 - SNOW.from));
  const snow = rand(rs) < SNOW.chance * Math.min(1, cold * 1.5);
  if (snow && !spells.length) { const start = rand(rs) * 24; spells.push({ start, end: start + SNOW.len[0] + rand(rs) * (SNOW.len[1] - SNOW.len[0]), rain: 0.3 + rand(rs) * 0.7 }); }
  return { fog, fogEnd, spells, snow };
}

/** Fog, rain and snow at a game time, 0 to 1, easing in and out over an hour. */
export function weatherAt(seed: number, time: number): Weather {
  const d = dayOf(time), h = hourOf(time), today = day(seed, d), ease = (x: number) => Math.max(0, Math.min(1, x));
  // Night and morning fog thickens from midnight and burns off by late morning; a little haze all day.
  const fog = h < today.fogEnd ? today.fog * ease(today.fogEnd - h) : today.fog * 0.15;
  let rain = 0;
  for (const s of today.spells) rain = Math.max(rain, s.rain * ease(Math.min(h - s.start, s.end - h) + 0.5));
  // Rain thickens the air too; falling snow more.
  if (today.snow) return { fog: Math.max(fog, rain * SNOW.haze), rain: 0, snow: rain };
  return { fog: Math.max(fog, rain * 0.4), rain, snow: 0 };
}

export function stepWeather(s: SimState) {
  // The dev flag 'clear' holds the sky clear (screenshots, tests).
  const w = s.flags.clear ? { fog: 0, rain: 0, snow: 0 } : weatherAt(s.seed, s.time);
  s.weather.fog = Math.max(w.fog, s.flags.fog ?? 0);
  s.weather.rain = Math.max(w.rain, s.flags.rain);
  s.weather.snow = Math.max(w.snow, s.flags.snow ?? 0);
  // The snow lying: built up while it falls, melting while it doesn't; over a skip (asleep) hour by hour.
  const W = s.weather, from = W.at ?? s.time;
  let cover = W.cover ?? 0;
  for (let t = from; t < s.time - GAME_PER_TICK * 1.5; t += 3600) cover = settle(cover, Math.max(s.flags.clear ? 0 : weatherAt(s.seed, t).snow, s.flags.snow ?? 0), Math.min(1, (s.time - t) / 3600));
  W.cover = settle(cover, W.snow ?? 0, GAME_PER_TICK / 3600);
  W.at = s.time;
}

/** Snow lying after `hours` more of snow falling at `snow`. */
function settle(cover: number, snow: number, hours: number) {
  return Math.max(0, Math.min(1, cover + (snow > 0.02 ? snow / SNOW.settle : -1 / SNOW.melt) * hours));
}
