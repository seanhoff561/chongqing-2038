// How the held thing moves in his hands (M4-68, U-052): brought up from below as he takes it out, a slow breathing sway
// at rest, a bob with his steps, a lag behind the turn of his head, the tilt of a magazine change, and a blow (M4-60):
// the crowbar drawn back and swung down across, the knife thrust, stopped short with a jolt when it meets something.
// Applied to the hands' group (camera space) on top of the aim and kick (GunFeel), steadied when he aims down the sights.
import * as THREE from 'three';

export interface MotionIn { bob: number; speed: number; yaw: number; pitch: number; ads: number; reload: number }

const clamp = (v: number, a: number) => Math.max(-a, Math.min(a, v));
/** 0 before a, 1 after b, smooth between. */
const ease = (f: number, a: number, b: number) => { const k = Math.max(0, Math.min(1, (f - a) / (b - a))); return k * k * (3 - 2 * k); };

export class HeldMotion {
  /** 0 just taken out to 1 up in his hands */
  draw = 1;
  private id = '';
  private t = 0;
  private lag = { x: 0, y: 0, yaw: 0, pitch: 0 };
  /** a blow under way: 0 to 1, its kind, and whether it met something */
  private blow = { f: 1, knife: false, hit: false };
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();

  swing(kind: string, hit: boolean) { this.blow = { f: 0, knife: kind === 'knife', hit }; }

  update(dt: number, group: THREE.Group, id: string, m: MotionIn) {
    if (id !== this.id) { this.id = id; this.draw = 0; }
    this.draw = Math.min(1, this.draw + dt / 0.4);
    this.t += dt;
    // The hands trail the turn of the view a little and catch up.
    const L = this.lag, dyaw = Math.atan2(Math.sin(m.yaw - L.yaw), Math.cos(m.yaw - L.yaw)), decay = Math.exp(-9 * dt);
    L.x = clamp((L.x + dyaw * 0.6) * decay, 0.07); L.y = clamp((L.y + (m.pitch - L.pitch) * 0.6) * decay, 0.07);
    L.yaw = m.yaw; L.pitch = m.pitch;
    if (!id) return;
    const steady = 1 - 0.85 * m.ads, walk = Math.min(1, m.speed / 4) * steady, d = (1 - this.draw) ** 2;
    const r = m.reload >= 0 ? Math.sin(Math.min(1, m.reload / 0.85) * Math.PI) : 0;
    const B = this.blow;
    B.f = Math.min(1, B.f + dt / (B.knife ? 0.4 : 0.6));
    // Drawn back, then the strike (cut short and jolted back if it hit), then back to rest.
    const back = ease(B.f, 0, 0.3) * (1 - ease(B.f, 0.3, 0.45)), strike = ease(B.f, 0.3, 0.45) * (1 - ease(B.f, 0.5, 1)) * (B.hit ? 0.65 : 1);
    const jolt = B.hit ? Math.max(0, Math.sin(((B.f - 0.45) / 0.15) * Math.PI)) * (B.f > 0.45 && B.f < 0.6 ? 1 : 0) : 0;
    const breathe = Math.sin(this.t * 1.3) * steady, drift = Math.sin(this.t * 0.55) * steady;
    group.position.x += Math.sin(m.bob) * 0.012 * walk + drift * 0.003;
    group.position.y += -Math.abs(Math.cos(m.bob)) * 0.016 * walk + breathe * 0.003 - d * 0.2 - r * 0.035;
    if (B.knife) group.position.z += back * 0.06 - strike * 0.2 + jolt * 0.03;
    else group.position.z += back * 0.05 - strike * 0.1 + jolt * 0.04;
    const [bx, by, bz] = B.knife ? [0.15 * back - 0.1 * strike, -0.1 * back + 0.12 * strike, 0] : [0.55 * back - 0.75 * strike + 0.15 * jolt, -0.35 * back + 0.55 * strike, -0.2 * back + 0.5 * strike];
    this.e.set(-d * 0.8 + r * 0.22 - L.y * steady + breathe * 0.006 + bx, -L.x * steady + by, drift * 0.012 + r * 0.5 + Math.sin(m.bob) * 0.025 * walk + bz);
    group.quaternion.premultiply(this.q.setFromEuler(this.e));
  }
}
