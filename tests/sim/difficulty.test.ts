// M9-01: detection and escape rates kept inside their bands (tests/sim/difficulty.ts) on a small fixed sample: upright
// by day in four districts, crouched by night in three, crouched still by night in three, and six pursuits by each
// means (the search watched a minute: unfound by then counts as away). The full statistics are difficulty.slow.test.ts's.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { detection, escape, median, BANDS, type Means, type Pursuer } from './difficulty';
import { settle } from './helpers';

const w = getWorld('yuzhong');
const CAP = 40;

describe('difficulty bands (M9-01)', () => {
  it('detection times and escapes inside their bands', async () => {
    await settle();
    const t = (district: string, night: boolean, gait: 'jog' | 'sprint' | 'crouch' | 'still') => detection(w, { district, night, gait, seed: 1, cap: CAP })?.t ?? null;
    const careless = [t('jiefangbei', false, 'jog'), t('shibati', false, 'sprint'), t('xiaoshizi', false, 'jog'), t('chaotianmen', false, 'sprint')];
    const careful = [t('jiaochangkou', true, 'crouch'), t('xiaoshizi', true, 'crouch'), t('hongyadong', true, 'crouch')];
    const low = [t('shibati', true, 'still'), t('jiefangbei', true, 'still'), t('chaotianmen', true, 'still')];
    const said = JSON.stringify({ careless, careful, low });
    expect(median(careless, CAP), said).toBeGreaterThanOrEqual(BANDS.careless[0]);
    expect(median(careless, CAP), said).toBeLessThanOrEqual(BANDS.careless[1]);
    expect(median(careful, CAP), said).toBeGreaterThanOrEqual(BANDS.careful[0]);
    expect(low.filter(x => x === null).length / low.length, said).toBeGreaterThanOrEqual(BANDS.lyingLow[0]);
    expect(low.filter(x => x === null).length / low.length, said).toBeLessThanOrEqual(BANDS.lyingLow[1]);
    const trials: [string, boolean, Pursuer, number, Means][] = [
      ['jiaochangkou', false, 'quadruped', 20, 'hide'], ['shibati', true, 'humanoid', 35, 'run'], ['xiaoshizi', false, 'drone', 20, 'jam'],
      ['chaotianmen', true, 'camera', 10, 'inside'], ['jiefangbei', false, 'quadruped', 35, 'run'], ['hongyadong', true, 'humanoid', 20, 'hide'],
    ];
    const out = trials.map(([district, night, pursuer, dist, means]) => escape(w, { district, night, pursuer, dist, means, seed: 1, watch: 60 })?.outcome ?? 'none');
    const rate = out.filter(o => o === 'escaped').length / out.length;
    expect(rate, out.join(', ')).toBeGreaterThanOrEqual(BANDS.escape[0]);
    expect(rate, out.join(', ')).toBeLessThanOrEqual(BANDS.escape[1]);
  }, 600000);
});
