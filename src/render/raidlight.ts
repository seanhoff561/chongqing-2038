// The raid breaking in (M4-63, U-052): red light flashing round the chamber through the 10 s, a beacon's sweep
// between him and the way they're coming in, on and off twice a second.
import * as THREE from 'three';

type V3 = { x: number; y: number; z: number };

export class RaidLight {
  readonly light = new THREE.PointLight(0xff1e0a, 0, 22, 1.2);
  /** how bright it is just now, 0 to 1 (for the checks) */
  on = 0;

  update(t: number, raid: V3 | undefined, head: V3) {
    if (!raid) { this.light.intensity = this.on = 0; return; }
    // Hard on, nearly off: a warning beacon, not a glow.
    this.on = Math.sin(t * Math.PI * 4) > 0 ? 1 : 0.06;
    this.light.intensity = 45 * this.on;
    this.light.position.set((head.x + raid.x) / 2, Math.max(head.y, raid.y) + 1, (head.z + raid.z) / 2);
  }
}
