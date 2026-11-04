// His laptop while it's out (U-104, U-105): a scuffed dark deck and lid held out in front of him, low, its screen
// tipped back to his eyes. It goes with his body (where he is and the way he faces), not with his look: he looks down at
// it, and looking up he looks over it. Its screen's corners are projected each frame so the page (ui/laptop.ts) lies on
// the glass. Sitting down at it (focus) it comes up close in front of his eyes.
import * as THREE from 'three';

/** Where the screen's middle sits from his eyes, turned his way but not tipped with his look: held (low and out in
 *  front) and sitting; its size (m); how fast it comes up (1/s). */
export const LAPTOP3D = { held: new THREE.Vector3(0, -0.3, -0.45), focus: new THREE.Vector3(0, 0, -0.205), w: 0.33, h: 0.21, rise: 9 };
/** Held, the screen tipped back to face his eyes. */
const TILT = -Math.atan2(-LAPTOP3D.held.y, -LAPTOP3D.held.z);

export class Laptop3D {
  readonly group = new THREE.Group();
  private screen: THREE.Mesh;
  /** 0 put away, 1 held up */
  private up = 0;
  /** 0 held, 1 sitting at it */
  focus = 0;

  constructor(scene: THREE.Object3D) {
    const body = new THREE.MeshStandardMaterial({ color: 0x24282c, roughness: 0.6, metalness: 0.4 });
    const keys = new THREE.MeshStandardMaterial({ color: 0x15181b, roughness: 0.9 });
    const { w, h } = LAPTOP3D;
    // The lid round the screen, the screen itself (the page lies over it), and the deck folded out toward him.
    const lid = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, h + 0.025, 0.01), body);
    lid.position.set(0, 0, -0.006);
    this.screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0x0a161c }));
    const deck = new THREE.Group();
    deck.add(new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.016, 0.22), body));
    const board = new THREE.Mesh(new THREE.BoxGeometry(w - 0.02, 0.004, 0.11), keys);
    board.position.set(0, 0.009, -0.03);
    deck.add(board);
    deck.children.forEach(c => { c.position.z += 0.105; });
    deck.position.set(0, -h / 2 - 0.012, 0);
    deck.rotation.x = 0.25;
    this.group.add(lid, this.screen, deck);
    this.group.visible = false;
    this.group.rotation.order = 'YXZ';
    scene.add(this.group);
  }

  /** Every frame: up or away, held or sat at, in front of his eyes (the camera's place) the way he faces (its yaw). */
  update(open: boolean, sit: boolean, dt: number, cam: THREE.Camera) {
    const k = 1 - Math.exp(-LAPTOP3D.rise * dt);
    this.up += ((open ? 1 : 0) - this.up) * k;
    this.focus += ((sit ? 1 : 0) - this.focus) * k;
    if (!open && this.up < 0.02) this.up = 0;
    this.group.visible = this.up > 0;
    const at = LAPTOP3D.held.clone().lerp(LAPTOP3D.focus, this.focus), yaw = cam.rotation.y;
    at.y -= (1 - this.up) * 0.4;
    this.group.position.copy(cam.position).add(at.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
    this.group.rotation.set(TILT * (1 - this.focus) + (1 - this.up) * 0.6, yaw, 0);
  }

  /** The screen's corners on the page (CSS pixels: top left, top right, bottom right, bottom left), or null while
   *  it's away. */
  corners(cam: THREE.Camera, width: number, height: number): [number, number][] | null {
    if (!this.group.visible || this.up < 0.9) return null;
    this.group.updateMatrixWorld();
    cam.updateMatrixWorld();
    const { w, h } = LAPTOP3D, out: [number, number][] = [];
    for (const [u, v] of [[-w / 2, h / 2], [w / 2, h / 2], [w / 2, -h / 2], [-w / 2, -h / 2]]) {
      const p = new THREE.Vector3(u, v, 0).applyMatrix4(this.screen.matrixWorld);
      // (Behind his eyes, looking up over it: no page.)
      if (p.clone().applyMatrix4(cam.matrixWorldInverse).z > -0.06) return null;
      p.project(cam);
      out.push([(p.x + 1) / 2 * width, (1 - p.y) / 2 * height]);
    }
    return out;
  }
}

/** The CSS matrix3d that lays a w by h box onto four corners (top left, top right, bottom right, bottom left) in
 *  perspective: the square-to-quad projective map, scaled to the box. */
export function quadMatrix(w: number, h: number, q: [number, number][]): string {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1, g = den ? (dx3 * dy2 - dx2 * dy3) / den : 0, k = den ? (dx1 * dy3 - dx3 * dy1) / den : 0;
  const a = x1 - x0 + g * x1, b = x3 - x0 + k * x3, d = y1 - y0 + g * y1, e = y3 - y0 + k * y3;
  const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, k / h, 0, 0, 1, 0, x0, y0, 0, 1];
  return `matrix3d(${m.map(v => +v.toFixed(6)).join(',')})`;
}
