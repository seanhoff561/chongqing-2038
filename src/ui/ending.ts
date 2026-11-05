// An ending's sequence (M7-15, M10-51, DESIGN section 2): the view lifts slowly up and back from where he stands,
// letterboxed, the fog thick, while he and Anna have their last exchange (Xiaoyu in it if she came; only Anna's lines
// read); then the run's summary (death.ts's screen).
import * as THREE from 'three';
import type { Game } from '../game';
import { endingLines } from '../data/dialogue';
import { speak } from '../audio/voice';

/** Seconds the last line holds before the summary, and the rise (m) and pull back (m) over the whole sequence. */
const SEQ = { line: 3.2, rise: 14, back: 18 };
const readSecs = (zh: string) => 1.5 + [...zh].length * 0.18;

export class EndingSequence {
  active = false;
  done = false;
  private t = 0;
  private said = 0;
  private from = new THREE.Vector3();
  private bars: HTMLDivElement;

  constructor(private game: Game) {
    this.bars = document.createElement('div');
    this.bars.id = 'letterbox';
    this.bars.style.display = 'none';
    document.body.appendChild(this.bars);
  }

  /** The run ended on `route`: from the view as it is now. */
  start(route: string) {
    if (this.active || this.done) return;
    this.active = true; this.t = 0; this.said = 0;
    this.from.copy(this.game.view.fp.cam.position);
    this.bars.style.display = 'block';
    this.game.input.uiOpen = true;
    this.route = route;
  }
  private route = '';

  /** Every frame while it plays: the camera's shot, the next line, and at the end the summary. */
  update(dt: number) {
    if (!this.active) return;
    // (Each line held as long as the subtitles take to read it, as hud.ts holds them.)
    const lines = endingLines(this.route, this.game.state.ended?.sister), at = (n: number) => 0.6 + lines.slice(0, n).reduce((a, l) => a + readSecs(l.zh), 0), total = at(lines.length) + SEQ.line, g = this.game, cam = g.view.fp.cam;
    this.t += dt;
    const k = Math.min(1, this.t / total), e = k * k * (3 - 2 * k), yaw = g.input.yaw;
    cam.position.set(this.from.x + Math.sin(yaw) * SEQ.back * e, this.from.y + SEQ.rise * e, this.from.z + Math.cos(yaw) * SEQ.back * e);
    cam.rotation.set(-0.12 - 0.25 * e, yaw, 0, 'YXZ');
    while (this.said < lines.length && this.t >= at(this.said)) { const l = lines[this.said++]; if (l.speaker === 'anna') g.hud.say(l.en); speak(g.audio, l.id); }
    if (this.t < total) return;
    this.active = false; this.done = true;
    this.bars.style.display = 'none';
    g.death.show();
  }
}
