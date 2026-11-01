// M4-91 (U-066): most street doors shut. Of the enterable blocks' street doors in every district, under a quarter open
// freely (open or just shut); the rest are locked, jammed, chained or collapsed, each kind found.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { districtOf } from '../../src/sim/district';

describe('street doors (M4-91)', () => {
  it('are mostly locked, chained, jammed or collapsed', () => {
    const w = getWorld('yuzhong');
    // (Every enterable block has one street door; an open one has no interactable.)
    const blocks = w.plots.filter(p => !p.far && p.route && p.route.length > 1), doors = w.inter.filter(i => i.kind === 'door' && /\.street\d+$/.test(i.id));
    const by: Record<string, { n: number; held: number }> = {}, kinds = new Set<string>();
    for (const p of blocks) { const d = districtOf(p.route![0].x, p.route![0].z); (by[d] ??= { n: 0, held: 0 }).n++; }
    for (const i of doors) { const lock = i.data?.lock as string | undefined; if (!lock) continue; kinds.add(lock); const d = districtOf(i.x, i.z); if (by[d]) by[d].held++; }
    expect(doors.length).toBeGreaterThan(blocks.length * 0.8);
    for (const [d, c] of Object.entries(by)) if (c.n >= 10) expect(1 - c.held / c.n, d).toBeLessThan(0.25);
    for (const k of ['locked', 'jammed', 'chained', 'collapsed']) expect(kinds.has(k), k).toBe(true);
  });
});
