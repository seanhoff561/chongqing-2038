// U-102: Anna's map marks the key places from the start: the high-security sites, the construction site, the pier,
// the cableway, the Grand Tunnel, the air-raid shelter and the metro stations.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { keyPlaces } from '../../src/ui/lapmap';

describe("the map's key places (U-102)", () => {
  it('names every high-security site and the other key places', () => {
    const w = getWorld('yuzhong'), en = keyPlaces(w).map(q => q.en);
    for (const k of ['Yuzhong Hospital', 'Police station', 'Electronics market', 'Telecom exchange', 'Xinhua Road substation', 'Construction site', 'River-police pier', 'Yangtze cableway', 'Grand Tunnel', 'Air-raid shelter']) expect(en, k).toContain(k);
    expect(en.filter(e => e === 'metro').length).toBeGreaterThanOrEqual(4);
  }, 300000);
});
