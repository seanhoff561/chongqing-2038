// Every item has a picture (M4-70), and no picture is left over for an item that's gone.
import { describe, it, expect } from 'vitest';
import { items } from '../../src/data/items';
import { ART } from '../../src/ui/icon-art';

describe('item pictures', () => {
  it('one for every item and none spare', () => {
    expect(items.filter(d => !ART[d.id]).map(d => d.id)).toEqual([]);
    const ids = new Set(items.map(d => d.id));
    expect(Object.keys(ART).filter(k => !ids.has(k))).toEqual([]);
  });
});
