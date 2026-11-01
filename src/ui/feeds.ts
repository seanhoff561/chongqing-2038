// A tapped camera's live feed on Anna's Cams page (M5-09): the city rendered from where the camera hangs, the way it
// faces (a sweeper panning), its cone; grey, grainy, a few times a second, its stamp in the corner.
import * as THREE from 'three';
import type { Game } from '../game';
import { SENSES } from '../data/units';
import { unitPose } from '../sim/units';
import { clockText, SCALE } from '../sim/clock';
import { loopedTill, TAP } from '../sim/camtap';

/** Linear light (as the scene renders into a target) to the screen's: a lookup, a byte to a byte. */
const GAMMA = Array.from({ length: 256 }, (_, i) => 255 * (i / 255) ** (1 / 2.2));

/** The feed's size (px). */
export const FEED = { w: 320, h: 180 };

export class Feed {
  readonly canvas = document.createElement('canvas');
  private rt = new THREE.WebGLRenderTarget(FEED.w, FEED.h);
  private cam = new THREE.PerspectiveCamera(60, FEED.w / FEED.h, 0.3, 300);
  private px = new Uint8Array(FEED.w * FEED.h * 4);
  private img: ImageData | null = null;
  /** which camera the picture is from */
  private of = -1;

  constructor() { this.canvas.width = FEED.w; this.canvas.height = FEED.h; }

  /** The camera (world index) as it sees now; a looped one shows what it sent before, frozen, and says so. */
  draw(g: Game, cam: number) {
    const ctx = this.canvas.getContext('2d'), u = g.state.units.find(x => x.cam === cam);
    if (!ctx || !u) return;
    const looped = loopedTill(g.state, cam);
    if (!looped || !this.img || this.of !== cam) {
      this.of = cam;
      const q = unitPose(g.world, u, g.state.time), S = SENSES[u.kind], pitch = (-S.pitch * Math.PI) / 180;
      this.cam.fov = Math.min(80, S.fov);
      this.cam.position.set(q.x + Math.sin(q.yaw) * 0.3, q.y - 0.1, q.z + Math.cos(q.yaw) * 0.3);
      this.cam.lookAt(q.x + Math.sin(q.yaw) * Math.cos(pitch) * 10, q.y - 0.1 + Math.sin(pitch) * 10, q.z + Math.cos(q.yaw) * Math.cos(pitch) * 10);
      const r = g.view.renderer, was = r.getRenderTarget();
      r.setRenderTarget(this.rt); r.render(g.view.scene, this.cam); r.setRenderTarget(was);
      r.readRenderTargetPixels(this.rt, 0, 0, FEED.w, FEED.h, this.px);
      // Grey and grainy, flipped the right way up, brought from linear light to the screen's.
      const img = (this.img ??= ctx.createImageData(FEED.w, FEED.h)), d = img.data;
      for (let y = 0; y < FEED.h; y++) for (let x = 0; x < FEED.w; x++) {
        const i = ((FEED.h - 1 - y) * FEED.w + x) * 4, o = (y * FEED.w + x) * 4;
        const v = Math.min(255, GAMMA[Math.round(this.px[i] * 0.3 + this.px[i + 1] * 0.59 + this.px[i + 2] * 0.11)] * 1.1 + (Math.random() - 0.5) * 18);
        d[o] = v * 0.92; d[o + 1] = v; d[o + 2] = v * 0.9; d[o + 3] = 255;
      }
    }
    ctx.putImageData(this.img, 0, 0);
    ctx.font = "11px 'Courier New', monospace"; ctx.textBaseline = 'top'; ctx.fillStyle = '#e8e8e0';
    ctx.fillText(`CAM ${String(cam).padStart(4, '0')}  ${clockText(looped ? looped - TAP.loop * SCALE : g.state.time)}`, 6, 5);
    if (looped) { ctx.fillStyle = '#c8a96a'; ctx.fillText('LOOP 循环中', FEED.w - 90, 5); }
    else { ctx.fillStyle = '#c03a2a'; ctx.fillText('● REC', FEED.w - 48, 5); }
  }
}
