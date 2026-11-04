// His laptop held up in both hands while it's out (U-104): a scuffed dark deck and lid in camera space, rising into view
// as it opens; its screen's corners projected each frame so the page (ui/laptop.ts) sits on the glass. Sitting down at
// it (focus) brings the screen close.
import * as THREE from 'three';

/** Where the screen's middle sits in camera space held and sitting; its size (m); how fast it comes up (1/s). */
export const LAPTOP3D = { held: new THREE.Vector3(0, -0.04, -0.4), focus: new THREE.Vector3(0, 0, -0.205), w: 0.33, h: 0.21, rise: 9 };

export class Laptop3D {
  readonly group = new THREE.Group();
  private screen: THREE.Mesh;
  /** 0 put away, 1 held up */
  private up = 0;
  /** 0 held, 1 sitting at it */
  focus = 0;

  constructor(cam: THREE.Camera) {
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
    cam.add(this.group);
  }

  /** Every frame: up or away, held or sat at. */
  update(open: boolean, sit: boolean, dt: number) {
    const k = 1 - Math.exp(-LAPTOP3D.rise * dt);
    this.up += ((open ? 1 : 0) - this.up) * k;
    this.focus += ((sit ? 1 : 0) - this.focus) * k;
    if (!open && this.up < 0.02) this.up = 0;
    this.group.visible = this.up > 0;
    const at = LAPTOP3D.held.clone().lerp(LAPTOP3D.focus, this.focus);
    this.group.position.set(at.x, at.y - (1 - this.up) * 0.4, at.z);
    this.group.rotation.x = -0.12 * (1 - this.focus) + (1 - this.up) * 0.6;
  }

  /** The screen's rectangle on the page (CSS pixels), or null while it's away. */
  rect(cam: THREE.Camera, width: number, height: number): { x: number; y: number; w: number; h: number } | null {
    if (!this.group.visible || this.up < 0.9) return null;
    this.group.updateMatrixWorld();
    const { w, h } = LAPTOP3D, xs: number[] = [], ys: number[] = [];
    for (const [u, v] of [[-w / 2, -h / 2], [w / 2, -h / 2], [-w / 2, h / 2], [w / 2, h / 2]]) {
      const p = new THREE.Vector3(u, v, 0).applyMatrix4(this.screen.matrixWorld).project(cam);
      xs.push((p.x + 1) / 2 * width); ys.push((1 - p.y) / 2 * height);
    }
    const x = Math.min(...xs), y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }
}
