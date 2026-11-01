// Guns made real (M4-21b, U-032): aiming down the sights (right mouse) brings the pistol up to the eye, its sights on
// the middle of the view, and zooms; each shot (no flash: U-058) runs the slide back and kicks the gun up and
// back into his hands, settling. The camera's own kick (the sim's) and his lean are FPCamera's.
import * as THREE from 'three';

/** The pistol's rear sight in model space, and where it comes to in the camera's aimed. */
const SIGHT = new THREE.Vector3(-0.09, 0, 0.026), EYE = new THREE.Vector3(0, -0.004, -0.3), BARREL = new THREE.Vector3(0, 0, -1);
/** Where the rear sight sits at the hip: out to the lower right, as a shooter's held (U-052). */
const HIP = new THREE.Vector3(0.11, -0.09, -0.31), UP = new THREE.Vector3(0, 1, 0);
/** With a sight on the slide (U-058) the eye looks through it, higher than the iron sights. */
const OPTIC = new THREE.Vector3(-0.118, 0, 0.0);
/** How far a fitted sight zooms the aimed view (the view's zoom: 1 is the iron sights' 1.6x). */
export const zoomOf = (mods?: string[]) => (mods?.includes('scope4x') ? (1 - 1 / 4) / 0.38 : 1);

export class GunFeel {
  /** 0 hip to 1 aimed, eased */
  ads = 0;
  private kick = 0;
  private q = new THREE.Quaternion();
  private turn = new THREE.Quaternion();
  private v = new THREE.Vector3();

  fired() { this.kick = 1; }

  /** Each frame, before the camera: raising the gun to the eye or lowering it. */
  aim(dt: number, aiming: boolean) { this.ads += ((aiming ? 1 : 0) - this.ads) * (1 - Math.exp(-14 * dt)); }

  /** Each frame, after the hands: their group (in camera space) placed for the aim and kick, the held model's slide. */
  update(dt: number, group: THREE.Group, held: THREE.Object3D | null) {
    this.kick *= Math.exp(-14 * dt);
    group.position.set(0, 0, 0); group.quaternion.identity();
    if (!held) return;
    const slide = held.getObjectByName('slide');
    if (slide) slide.position.z = -0.062 + 0.028 * Math.min(1, this.kick * 1.6);
    // The barrel turned onto the view's axis, the muzzle turned in a touch at the hip (toward the middle of the view);
    // the sight out at the lower right at the hip, at the eye aimed.
    held.updateWorldMatrix(true, false);
    const cam = group.parent!, inv = new THREE.Matrix4().copy(cam.matrixWorld).invert();
    const m = new THREE.Matrix4().multiplyMatrices(inv, held.matrixWorld), sight = (held.userData.optic ? OPTIC : SIGHT).clone().applyMatrix4(m);
    const barrel = BARREL.clone().transformDirection(m);
    this.q.setFromUnitVectors(barrel, BARREL).premultiply(this.turn.setFromAxisAngle(UP, 0.18 * (1 - this.ads)));
    group.quaternion.copy(this.q);
    this.v.copy(sight).applyQuaternion(this.q);
    group.position.copy(HIP).lerp(EYE, this.ads).sub(this.v);
    // The kick: up at the muzzle and back.
    group.rotateX(0.16 * this.kick);
    group.position.z += 0.035 * this.kick;
  }
}
