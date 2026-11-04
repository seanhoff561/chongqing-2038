// M10-37: found documents. Each worldbuilding document lies once in a world, in a container in the kind of building
// it belongs in (one with a basement drain grate, or in its district, if it says so), never in a high-security site;
// each story document at its key place; searched, the container holds it. The documents are short, titled in Chinese
// and English, and read in the backpack (an item whose text is the document's).
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { startRun } from '../../src/sim/run';
import { openContainer } from '../../src/sim/containers';
import { districtName } from '../../src/world/yuzhong/lots';
import { DOCS, KEY_PLACES, isStory, docById } from '../../src/data/documents';
import { DOC_SPOT } from '../../src/sim/documents';
import { item } from '../../src/data/items';

/** Which buildings and rooms each kind of place is, told apart here by hand. */
const FITS: Record<string, (type: string, room: string) => boolean> = {
  home: (t, r) => t === 'residential' && !['shop', 'restaurant', 'workshop'].includes(r),
  shop: (t, r) => r === 'shop' || r === 'restaurant' || (t === 'mall' && r !== 'workshop'),
  office: (t, r) => t === 'office' && !['shop', 'restaurant', 'workshop'].includes(r),
  workshop: (t, r) => r === 'workshop' || (t === 'workshop' && r !== 'shop' && r !== 'restaurant'),
  clinic: (t, r) => t === 'clinic' && !['shop', 'restaurant', 'workshop'].includes(r),
  military: (t, r) => t === 'military' && !['shop', 'restaurant', 'workshop'].includes(r),
};

describe('found documents (M10-37)', () => {
  it('are short and titled in both languages, a story one at each key place, each an item read in the backpack', () => {
    expect(new Set(DOCS.map(d => d.id)).size).toBe(DOCS.length);
    const bad: string[] = [];
    for (const d of DOCS) {
      const words = d.text.split(/\s+/).filter(Boolean).length;
      if (words < 40 || words > 150) bad.push(`${d.id}: ${words} words`);
      if (!/[一-鿿]/.test(d.zh) || d.en.length < 3) bad.push(`${d.id}: title`);
      if (!isStory(d) && !FITS[d.where]) bad.push(`${d.id}: where`);
      const it = item(d.id);
      if (it.cat !== 'doc' || it.desc !== d.text || it.en !== d.en) bad.push(`${d.id}: item`);
    }
    expect(bad).toEqual([]);
    expect(KEY_PLACES.map(k => DOCS.filter(d => d.where === k).length)).toEqual(KEY_PLACES.map(() => 1));
    const world = DOCS.filter(d => !isStory(d)).length;
    expect(world).toBeGreaterThanOrEqual(20);
    expect(world).toBeLessThanOrEqual(30);
  });

  it('lie once each in a world, each where it may be, and a new run puts them elsewhere', () => {
    const w = getWorld('yuzhong'), byId = new Map(w.inter.map(i => [i.id, i]));
    const types = new Map(w.plots.filter(p => p.prefix).map(p => [p.prefix!, p.type ?? ''])), secure = new Set((w.secure ?? []).map(q => q.prefix));
    const runs: Record<string, string>[] = [];
    for (const seed of [1, 2, 3]) {
      const s = createState(seed, w);
      startRun(s, w);
      const found: Record<string, string[]> = {}, bad: string[] = [];
      for (const [cid, did] of Object.entries(s.docs ?? {})) (found[did] ??= []).push(cid);
      const lying = s.dropped.filter(d => docById.has(d.stack.id));
      for (const d of lying) (found[d.stack.id] ??= []).push('floor');
      // Every one, and none twice.
      expect(DOCS.filter(d => !found[d.id]).map(d => d.id)).toEqual([]);
      expect(Object.entries(found).filter(([, at]) => at.length > 1)).toEqual([]);
      for (const [cid, did] of Object.entries(s.docs!)) {
        const d = docById.get(did)!, it = byId.get(cid)!, owner = cid.split('-')[0];
        if (isStory(d)) {
          const site = w.secure!.find(q => q.id === d.where);
          if (!site || owner !== site.prefix) bad.push(`${did} in ${cid}`);
        } else {
          if (secure.has(owner) || !types.has(owner) || !FITS[d.where](types.get(owner)!, (it.data?.room as string) ?? '')) bad.push(`${did} in ${cid} (${types.get(owner)}, ${it.data?.room})`);
          if (d.needs === 'grate' && !w.inter.some(i => i.kind === 'grate' && i.data?.manhole && i.id.startsWith(`${owner}-`))) bad.push(`${did}: no grate in ${owner}`);
          if (d.district && districtName(it.x, it.z) !== d.district) bad.push(`${did}: not in ${d.district}`);
        }
        // Searched, it's in there.
        openContainer(s, it);
        if (!s.containers[cid].items.some(x => x.id === did)) bad.push(`${did} not in ${cid} when searched`);
      }
      // The rest lie on the floor at their key place, not counted as his.
      for (const l of lying) {
        const d = docById.get(l.stack.id)!, t = w.teleports.find(q => q.name === DOC_SPOT[d.where]);
        if (!isStory(d) || !t || Math.hypot(l.x - t.x, l.z - t.z) > 0.5 || l.y > t.y + 0.3 || l.y < t.y - 3 || !l.loose) bad.push(`${d.id} on the floor at ${l.x.toFixed(0)}, ${l.y.toFixed(1)}, ${l.z.toFixed(0)}`);
      }
      expect(bad).toEqual([]);
      runs.push(s.docs!);
    }
    // (Another run, other containers.)
    const where = (r: Record<string, string>) => new Map(Object.entries(r).map(([c, d]) => [d, c]));
    const [a, b] = [where(runs[0]), where(runs[1])];
    expect(DOCS.filter(d => !isStory(d) && a.get(d.id) !== b.get(d.id)).length).toBeGreaterThan(15);
  });
});
