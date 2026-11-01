// What he can loot, plain to see (M4-90, U-066): over each container still worth searching and each thing lying on
// the floor within 10 m, a small bright diamond floats, gently bobbing, fading out with distance; searched and found
// empty, a container goes plain again. Only in his line of sight (it doesn't show through walls).
import * as THREE from 'three';
import type { SimState } from '../sim/types';
import type { World } from '../world/world';
import { allInters } from '../sim/interact';

const LOOT = { reach: 10, pool: 24, /** s between looks round for them */ every: 0.15 };

/** The marker: a diamond with a soft glow round it. */
function diamond(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!, glow = g.createRadialGradient(32, 32, 4, 32, 32, 30);
  glow.addColorStop(0, 'rgba(255,214,120,0.55)'); glow.addColorStop(1, 'rgba(255,214,120,0)');
  g.fillStyle = glow; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#fff3c4'; g.strokeStyle = '#b07a14'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(32, 14); g.lineTo(46, 32); g.lineTo(32, 50); g.lineTo(18, 32); g.closePath(); g.fill(); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class LootMarks {
  readonly group = new THREE.Group();
  private marks: THREE.Sprite[] = [];
  private spots: { x: number; y: number; z: number; d: number }[] = [];
  private looked = -1;

  constructor() {
    const mat = new THREE.SpriteMaterial({ map: diamond(), transparent: true, depthWrite: false });
    for (let i = 0; i < LOOT.pool; i++) {
      const m = new THREE.Sprite(mat.clone()); m.scale.setScalar(0.3); m.visible = false; m.renderOrder = 5;
      this.marks.push(m); this.group.add(m);
    }
  }

  /** How many show just now (for the checks). */
  get shown() { return this.marks.filter(m => m.visible).length; }

  update(s: SimState, w: World, head: THREE.Vector3, t: number) {
    // (The lootable things near him looked for a few times a second; the markers bob every frame.)
    if (Math.abs(t - this.looked) >= LOOT.every) {
      this.looked = t;
      this.spots = [];
      for (const it of allInters(s, w)) {
        if (it.kind !== 'container' && it.kind !== 'pickup') continue;
        const d = Math.hypot(it.x - head.x, it.y - head.y, it.z - head.z);
        if (d > LOOT.reach) continue;
        if (it.kind === 'container' && s.wstate.searched[it.id] && !s.containers[it.id]?.items.length) continue;
        this.spots.push({ x: it.x, y: it.y, z: it.z, d });
      }
      this.spots.sort((a, b) => a.d - b.d).splice(LOOT.pool);
    }
    this.marks.forEach((m, i) => {
      const q = this.spots[i];
      m.visible = !!q;
      if (!q) return;
      m.position.set(q.x, q.y + 0.45 + Math.sin(t * 2.4 + i) * 0.04, q.z);
      (m.material as THREE.SpriteMaterial).opacity = Math.min(1, 1.6 - q.d / LOOT.reach);
    });
  }
}
