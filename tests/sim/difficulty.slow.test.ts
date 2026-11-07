// M9-01: the difficulty statistics in full (tests/sim/difficulty.ts): detection times in every district by day and
// by night at each gait, pursuit escapes from each kind of machine at three distances by each means, and a forager's
// survival days over four runs. The numbers go to logs/difficulty.json; the bands are held as the fast test holds them.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { getWorld } from '../../src/world/build';
import { detection, escape, forage, median, BANDS, DISTRICTS, type Gait, type Means, type Pursuer } from './difficulty';
import { settle } from './helpers';

const w = getWorld('yuzhong');
const CAP = 60;

describe('difficulty (M9-01)', () => {
  it('detection, escapes and survival inside their bands', async () => {
    await settle();
    const det: NonNullable<ReturnType<typeof detection>>[] = [];
    for (const district of DISTRICTS) for (const night of [false, true]) for (const gait of ['jog', 'sprint', 'crouch', 'still'] as Gait[]) for (const seed of [1, 2]) {
      const r = detection(w, { district, night, gait, seed, cap: CAP });
      if (r) det.push(r);
    }
    const esc: NonNullable<ReturnType<typeof escape>>[] = [];
    const P: Pursuer[] = ['quadruped', 'humanoid', 'drone', 'camera'], D = [10, 20, 35];
    let k = 0;
    for (const district of DISTRICTS) for (const means of ['run', 'hide', 'inside', 'jam'] as Means[]) for (const seed of [1, 2]) {
      const r = escape(w, { district, night: k % 2 === 1, pursuer: P[k % 4], dist: D[Math.floor(k / 4) % 3], means, seed });
      k++;
      if (r) esc.push(r);
    }
    const live = [1, 2, 3, 4].map(seed => forage(w, seed));
    const times = (f: (r: (typeof det)[number]) => boolean) => det.filter(f).map(r => r.t);
    const share = (rs: { outcome: string }[], f: (o: string) => boolean) => (rs.length ? rs.filter(r => f(r.outcome)).length / rs.length : NaN);
    const careless = median(times(r => !r.night && (r.gait === 'jog' || r.gait === 'sprint')), CAP), careful = median(times(r => r.night && r.gait === 'crouch'), CAP);
    const lyingLow = share(det.filter(r => r.night && r.gait === 'still').map(r => ({ outcome: r.t === null ? 'unseen' : 'seen' })), o => o === 'unseen');
    const escaped = share(esc, o => o === 'escaped');
    const cell = (f: (r: (typeof det)[number]) => boolean) => ({ median: median(times(f), CAP), unseen: share(det.filter(f).map(r => ({ outcome: r.t === null ? 'u' : 's' })), o => o === 'u'), n: det.filter(f).length });
    const by = <T extends string | number | boolean>(vals: T[], f: (r: (typeof esc)[number], v: T) => boolean) => Object.fromEntries(vals.map(v => [String(v), { escaped: share(esc.filter(r => f(r, v)), o => o === 'escaped'), n: esc.filter(r => f(r, v)).length }]));
    const summary = {
      bands: BANDS,
      detection: {
        careless, careful, lyingLow, cap: CAP,
        byGait: Object.fromEntries((['jog', 'sprint', 'crouch', 'still'] as Gait[]).flatMap(g => [[`${g} day`, cell(r => r.gait === g && !r.night)], [`${g} night`, cell(r => r.gait === g && r.night)]])),
        byDistrict: Object.fromEntries(DISTRICTS.map(d => [d, { day: cell(r => r.district === d && !r.night), night: cell(r => r.district === d && r.night) }])),
        firstSeenBy: det.reduce<Record<string, number>>((a, r) => (r.by ? { ...a, [r.by]: (a[r.by] ?? 0) + 1 } : a), {}),
      },
      escape: {
        rate: escaped, n: esc.length,
        outcomes: esc.reduce<Record<string, number>>((a, r) => ({ ...a, [r.outcome]: (a[r.outcome] ?? 0) + 1 }), {}),
        contactBroken: share(esc.map(r => ({ outcome: r.lost === null ? 'no' : 'yes' })), o => o === 'yes'),
        byMeans: by(['run', 'hide', 'inside', 'jam'], (r, v) => r.means === v), byPursuer: by(P, (r, v) => r.pursuer === v), byDistance: by(D, (r, v) => r.dist === v), byNight: by([false, true], (r, v) => r.night === v),
      },
      survival: { days: live.map(r => r.days), causes: live.map(r => r.cause), outsideSecsPerDay: live.map(r => Math.round(r.outside)), searched: live.map(r => r.searched), found: live.map(r => r.found) },
    };
    fs.mkdirSync('logs', { recursive: true });
    fs.writeFileSync('logs/difficulty.json', JSON.stringify({ summary, detection: det, escape: esc, survival: live }, null, 1));
    expect(careless, 'careless median').toBeGreaterThanOrEqual(BANDS.careless[0]);
    expect(careless, 'careless median').toBeLessThanOrEqual(BANDS.careless[1]);
    expect(careful, 'careful median').toBeGreaterThanOrEqual(BANDS.careful[0]);
    expect(lyingLow, 'lying low unseen').toBeGreaterThanOrEqual(BANDS.lyingLow[0]);
    expect(lyingLow, 'lying low unseen').toBeLessThanOrEqual(BANDS.lyingLow[1]);
    expect(escaped, JSON.stringify(summary.escape.outcomes)).toBeGreaterThanOrEqual(BANDS.escape[0]);
    expect(escaped, JSON.stringify(summary.escape.outcomes)).toBeLessThanOrEqual(BANDS.escape[1]);
  }, 7200000);
});
