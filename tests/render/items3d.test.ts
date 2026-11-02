import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { items } from '../../src/data/items';
import { modelledItems } from '../../src/render/items3d';
import { armsModels } from '../../src/render/items3d-arms';
import { foodModels } from '../../src/render/items3d-food';
import { gearModels } from '../../src/render/items3d-gear';
import { rigModels } from '../../src/render/items3d-rig';
import { techModels } from '../../src/render/items3d-tech';
import { partsModels } from '../../src/render/items3d-parts';
import { keysModels } from '../../src/render/items3d-keys';

const all: Record<string, () => THREE.Object3D> = { ...armsModels, ...foodModels, ...gearModels, ...rigModels, ...techModels, ...partsModels, ...keysModels };

describe('item models (M5-34, U-053)', () => {
  it('every item has a model of its own, and every model is an item', () => {
    const ids = new Set(items.map(i => i.id)), have = new Set(modelledItems());
    expect(items.filter(i => !have.has(i.id)).map(i => i.id)).toEqual([]);
    expect([...have].filter(id => !ids.has(id))).toEqual([]);
  });
  it('each is built of several parts, low poly, at its real size', () => {
    const bad: string[] = [];
    for (const [id, make] of Object.entries(all)) {
      const o = make();
      let parts = 0, tris = 0;
      o.traverse(m => { const g = (m as THREE.Mesh).geometry; if (!g) return; parts++; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; });
      const size = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()), big = Math.max(size.x, size.y, size.z);
      if (parts < 2 || tris > 1000 || big < 0.03 || big > 1.2) bad.push(`${id}: ${parts} parts, ${tris} tris, ${big.toFixed(2)} m`);
    }
    expect(bad).toEqual([]);
  });
});
