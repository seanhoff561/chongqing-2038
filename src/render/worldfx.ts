// What's moving in the world round him that isn't a machine or him (M4-62, M4-65, M5-14, M5-19 to M5-22): rockets in
// flight trailing smoke, explosions (M10-65), hurt machines smoking and sparking, what's thrown and its clouds, what he's
// rigged, and the chain-link fences (cut or not) and the roller shutters near him; the construction site's crane load (M6-10);
// the river police's patrol boat (M7-08).
import * as THREE from 'three';
import type { SimState } from '../sim/types';
import type { World } from '../world/world';
import type { Marks } from './marks';
import { UNITS } from '../data/units';
import { unitPose } from '../sim/units';
import { SCALE } from '../sim/clock';
import { ThrowFx } from './throwfx';
import { Rigs } from './rigs';
import { Fences } from './fences';
import { Shutters } from './shutters';
import { SiteLoad } from './siteload';
import { Blasts } from './blastfx';
import { BoatView } from './boat3d';

export class WorldFx {
  private rockets: THREE.Group[] = [];
  private throwFx: ThrowFx;
  private rigs: Rigs;
  private fences: Fences;
  private shutters: Shutters;
  private load: SiteLoad | null = null;
  private boat: BoatView;
  readonly blasts: Blasts;
  private trailIn = 0;
  private smokeIn = 0;

  constructor(private scene: THREE.Scene, private marks: Marks) {
    // Rockets in flight (M4-65): a body and a burning tail, eight at most.
    for (let i = 0; i < 8; i++) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x4a5236 })));
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6).translate(0, 0, -0.4), new THREE.MeshBasicMaterial({ color: 0xffb050 })));
      g.visible = false; this.rockets.push(g); scene.add(g);
    }
    this.throwFx = new ThrowFx(scene);
    this.rigs = new Rigs(scene);
    this.fences = new Fences(scene);
    this.shutters = new Shutters(scene);
    this.blasts = new Blasts(scene, marks);
    this.boat = new BoatView(scene);
  }

  /** Every frame: `held` what's in his hand, `aiming` the right mouse held, `cam` where he looks from. */
  update(s: SimState, w: World, held: string, aiming: boolean, cam: THREE.Vector3, dt: number) {
    const rs = s.rockets ?? [];
    this.rockets.forEach((m, i) => { const r = rs[i]; m.visible = !!r; if (r) { m.position.set(r.x, r.y, r.z); m.lookAt(r.x + r.dx, r.y + r.dy, r.z + r.dz); } });
    if (rs.length && (this.trailIn -= dt) <= 0) { this.trailIn = 0.04; for (const r of rs) this.marks.puff(r.x - r.dx * 0.5, r.y - r.dy * 0.5, r.z - r.dz * 0.5); }
    this.throwFx.update(s, w, held, aiming);
    this.rigs.update(s);
    this.boat.update(s, w);
    this.fences.update(s, w);
    this.shutters.update(s, w, cam);
    if (this.load?.w !== w) { if (this.load) this.scene.remove(this.load.group); this.load = new SiteLoad(w); this.scene.add(this.load.group); }
    this.load.update(s.time);
    this.blasts.update(dt);
    // Hurt machines near him smoke and spark (M4-62).
    if ((this.smokeIn -= dt) > 0) return;
    this.smokeIn = 0.25;
    for (const u of s.units) {
      if (u.patrol < 0 && !u.convoy && !u.reserve) continue;
      const hurt = u.disarmed || u.blind || (u.hp ?? UNITS[u.kind].hp) < UNITS[u.kind].hp * 0.5;
      if (!hurt || (u.dead && s.time - (u.stop?.t ?? 0) > 120 * SCALE)) continue;
      const q = unitPose(w, u, s.time);
      if (Math.hypot(q.x - cam.x, q.z - cam.z) > 50) continue;
      const h = u.kind === 'humanoid' ? 1.5 : u.kind === 'quadruped' ? 0.8 : 0.1;
      this.marks.puff(q.x, q.y + h, q.z);
      if (Math.random() < 0.3) this.marks.add({ t: 'mark', x: q.x, y: q.y + h, z: q.z, nx: 0, ny: 1, nz: 0, kind: 'bullet', on: 'machine' });
    }
  }
}
