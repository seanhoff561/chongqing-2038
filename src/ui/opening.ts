// The opening scene, seen (M10-52, sim/opening.ts): black, fading up on the arched ceiling as he lies on his back;
// he looks round (the debris by him, the crate and table, the shaft of light with its ladder) and down to the laptop
// open on his bag beside him, where Anna speaks; the blip to black, and he's on his feet looking at it. Then, once
// he has the laptop and the bag, "Tab to open laptop", once. Anna's scenes on the laptop (on the floor, and her
// speech the first time it's opened) are read here for ui/laptop.ts.
import * as THREE from 'three';
import type { Game } from '../game';
import type { SimState } from '../sim/types';
import { WAKE, HELLO, type Cue } from '../sim/opening';
import { START_CRATE } from '../sim/run';
import { binds, keyName } from '../input/input';

/** The eye lying on the floor (m); the fade up from black (s); his look round: when he's looking at what (s). */
const LIE = { eye: 0.2, fade: 3 };
const LOOK: [number, string][] = [[0, 'up'], [3.2, 'up'], [4.6, 'debris'], [5.6, 'debris'], [7, 'crate'], [7.8, 'crate'], [9, 'shaft'], [10, 'shaft'], [11.3, 'laptop']];

type Look = { yaw: number; pitch: number };
const ease = (f: number) => f * f * (3 - 2 * f);

/** Anna in a scene at t: her pose, whether she fills the screen, whether she's leaning in. */
function cueAt(cues: Cue[], t: number) {
  const o = { pose: 'idle', corner: false, close: false };
  for (const c of cues) if (c.at <= t) { if (c.pose) o.pose = c.pose; if (c.corner) o.corner = true; if (c.close !== undefined) o.close = c.close; }
  return o;
}

/** Anna's scene on the laptop now, if one's on: on the floor where he woke, or her speech the first time it's open. */
export function annaScene(s: SimState): { pose: string; full: boolean; close: boolean } | null {
  if (s.gear?.laptop) { const c = cueAt(WAKE.cues, s.opening ?? Infinity); return { pose: c.pose, full: true, close: c.close }; }
  if (s.hello !== undefined && s.laptop?.open) { const c = cueAt(HELLO.cues, s.hello); return { pose: c.pose, full: !c.corner, close: false }; }
  return null;
}

/** Where the laptop lies open on his bag: on top of it, its screen turned to where his head was. */
export function restPose(s: SimState, eye: { x: number; z: number }) {
  const g = s.gear;
  return g?.laptop ? { x: g.x, y: g.y + 0.2, z: g.z, yaw: Math.atan2(eye.x - g.x, eye.z - g.z) } : null;
}

export class OpeningView {
  private black = document.createElement('div');
  private looks: Record<string, Look> = {};
  private was = false;
  private hadGear = false;
  private hint = false;

  constructor(private game: Game) {
    this.black.id = 'wake';
    document.body.appendChild(this.black);
  }

  /** Where he looks at each moment, from his eye on the floor. */
  private aims(eye: THREE.Vector3) {
    const g = this.game, w = g.world, s = g.state, at = (x: number, y: number, z: number): Look => ({ yaw: Math.atan2(-(x - eye.x), -(z - eye.z)), pitch: Math.atan2(y - eye.y, Math.hypot(x - eye.x, z - eye.z)) });
    const near = (k: string) => w.props.filter(p => p.kind === k).sort((a, b) => Math.hypot(a.x - eye.x, a.z - eye.z) - Math.hypot(b.x - eye.x, b.z - eye.z))[0];
    const crate = w.inter.find(i => i.id === START_CRATE)!, table = w.inter.find(i => i.id === 'airraid-table') ?? crate, grate = w.inter.find(i => i.id === 'airraid-grate')!;
    const rub = near('rubble') ?? crate, gear = s.gear!;
    return {
      up: { yaw: w.spawn.yaw + 0.3, pitch: 1.45 },
      debris: at(rub.x, rub.y + 0.6, rub.z),
      crate: at((crate.x + table.x) / 2, crate.y, (crate.z + table.z) / 2),
      shaft: at(grate.x, eye.y + 4.5, grate.z),
      laptop: at(gear.x, gear.y + 0.3, gear.z),
    };
  }

  /** Every frame, after the camera's set: lying there, the camera his; the fade and the blip; once over, on his feet
   *  facing the laptop; the hint once he has his things. */
  update() {
    const g = this.game, s = g.state, cam = g.view.fp.cam, t = s.opening, on = t !== undefined;
    document.body.classList.toggle('opening', on);
    if (on) {
      const sp = g.world.spawn, eye = new THREE.Vector3(sp.x, sp.y - 0.05 + LIE.eye, sp.z);
      if (!this.was) this.looks = this.aims(eye);
      let i = 0;
      while (i < LOOK.length - 1 && LOOK[i + 1][0] <= t) i++;
      const [t0, a] = LOOK[i], [t1, b] = LOOK[Math.min(i + 1, LOOK.length - 1)], A = this.looks[a], B = this.looks[b];
      const f = t1 > t0 ? ease(Math.min(1, (t - t0) / (t1 - t0))) : 1, dy = Math.atan2(Math.sin(B.yaw - A.yaw), Math.cos(B.yaw - A.yaw));
      // (Breathing.)
      cam.position.copy(eye);
      cam.rotation.set(A.pitch + (B.pitch - A.pitch) * f + Math.sin(t * 1.7) * 0.012, A.yaw + dy * f, 0);
      this.black.style.opacity = String(t > WAKE.end ? 1 : Math.max(0, 1 - t / LIE.fade));
    } else if (this.was) {
      // Up, looking down at the laptop on his bag.
      const p = s.player.pos, gear = s.gear;
      this.black.style.opacity = '0';
      if (gear) { g.input.yaw = Math.atan2(-(gear.x - p.x), -(gear.z - p.z)); g.input.pitch = Math.atan2(gear.y + 0.26 - p.y - g.view.fp.eyeHeight(), Math.hypot(gear.x - p.x, gear.z - p.z)); }
    }
    this.was = on;
    // He's taken them both: the hint, until he opens it.
    if (this.hadGear && !s.gear && s.hello === 0) { g.hud.notice(`${keyName(binds.laptop?.[0] ?? 'Tab')} to open laptop`, 60); this.hint = true; }
    if (this.hint && s.laptop?.open) { g.hud.notice('', 0.01); this.hint = false; }
    this.hadGear = !!s.gear;
  }
}
