// The Dongshuimen Bridge's two maintenance drones (M7-03), where their schedule has them along its rail deck
// (sim/bridge.ts), each with a little lamp looking ahead along the steel.
import * as THREE from 'three';
import type { SimState } from '../sim/types';
import type { World } from '../world/world';
import { deckDrones } from '../sim/bridge';
import { drone } from './cable3d';

export class DeckView {
  private drones: THREE.Group[] = [drone(), drone()];

  constructor(scene: THREE.Scene) {
    for (const d of this.drones) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff2c8 }));
      lamp.position.set(0, -0.04, 0.26);
      d.add(lamp);
      d.visible = false;
      scene.add(d);
    }
  }

  update(s: SimState, w: World) {
    const b = w.bridges?.[0];
    this.drones.forEach(d => { d.visible = !!b; });
    if (!b) return;
    deckDrones(s, b).forEach((q, k) => {
      const d = this.drones[k];
      d.position.set(q.x, q.y + Math.sin(s.time * 0.1 + k) * 0.1, q.z);
      d.rotation.y = q.yaw;
    });
  }
}
