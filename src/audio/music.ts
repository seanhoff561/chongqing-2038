// The city's music (M4-86, U-065; M4-97, U-070): most of the time none at all, only the quiet ambience. Now and then,
// minutes apart, a short piece fades in, very faint and slow: soft electric-piano notes falling far apart over a cold
// synth pad, a long reverb and echo, no drums; then it fades back to nothing. What it is goes by where he is: high
// up, airy and high, its notes echoing; in the streets a little warmer; underground, low and bell-like. All in A
// minor, so a piece cross-fades as he moves between places. The notes are played from a step sequencer on the audio
// clock, a quarter of a second ahead.
import type { Audio } from './audio';
import type { Where } from './ambience';
import type { Alert } from '../sim/district';

export type Track = 'high' | 'ground' | 'under';
type Chord = number[];
interface Def {
  bpm: number;
  /** one chord every two bars (MIDI notes) */
  chords: Chord[];
  /** how often (0 to 1) a note falls on a beat, and the notes it walks through */
  melody: number; scale: number[];
  /** the pads' brightness (Hz) */
  pad: number;
}

const Am7 = [57, 60, 64, 67], Fmaj7 = [53, 57, 60, 64], Cmaj7 = [48, 55, 59, 64], Em7 = [52, 55, 59, 62], Dm7 = [50, 57, 60, 65], G6 = [55, 59, 62, 64], Am9 = [57, 60, 64, 71];
const PENTA = [69, 72, 74, 76, 79, 81, 84];

export const TRACKS: Record<Track, Def> = {
  ground: { bpm: 54, chords: [Am7, Fmaj7, Cmaj7, Em7], melody: 0.3, scale: PENTA, pad: 900 },
  high: { bpm: 48, chords: [Fmaj7, Am9, Cmaj7, G6], melody: 0.32, scale: PENTA.map(n => n + 12), pad: 1600 },
  under: { bpm: 50, chords: [Am7, Am7, Dm7, Em7], melody: 0.22, scale: PENTA.map(n => n - 12), pad: 600 },
};
/** How long the silences last between pieces and the pieces themselves (s), at least and at most; the first comes
 *  after the shortest silence; how loud a piece is at most (very faint: U-070). */
export const PLAN = { quiet: [100, 260], piece: [50, 100], first: 45, gain: 0.35 };

/** The next stretch's length: a silence, or a piece, by a random number 0 to 1. */
/** The pursuit layer's strength by the district's alert (M8-10): nothing when they don't know of him, strongest while
 *  one has him; and how far its pulse eases toward that each second. */
export const PURSUIT = { level: { unaware: 0, suspicious: 0.3, engaged: 1, searching: 0.65, heightened: 0.35 } as Record<Alert, number>, ease: 0.5, gain: 0.5 };
/** By night the pads darker and the notes fewer (M8-10): their brightness and the notes' share at night, by day 1. */
export const NIGHT = { bright: 0.55, notes: 0.6 };
/** How dark it is, 0 by day to 1 at night, for the pads. */
export const nightOf = (daylight: number) => 1 - daylight;

export const stretch = (piece: boolean, r: number) => { const [a, b] = piece ? PLAN.piece : PLAN.quiet; return a + (b - a) * r; };

/** The track for where he is: up on the roofs or high over the ground, the high one; underground, the deep one. */
export function trackFor(where: Where, height: number): Track {
  if (where === 'under') return 'under';
  return where === 'roof' || height > 18 ? 'high' : 'ground';
}

const hz = (n: number) => 440 * 2 ** ((n - 69) / 12);

export class Music {
  track: Track = 'ground';
  private on = false;
  private out = {} as Record<Track, GainNode>;
  private clock = {} as Record<Track, { next: number; step: number; note: number }>;
  private verb!: ConvolverNode;
  /** each track's echo send (dry and echoing) */
  private echo = {} as Record<Track, GainNode>;
  private seed = 7;
  /** a piece playing now, and when this stretch (piece or silence) ends (audio clock) */
  playing = false;
  private until = -1;
  private master!: GainNode;
  /** the pursuit layer's fader, and its next beat; how dark it is (0 to 1) */
  private pursuit!: GainNode;
  private beat = 0;
  private night = 0;
  constructor(private a: Audio) {}

  update(where: Where, height: number, alert: Alert = 'unaware', night = 0) {
    const a = this.a;
    if (!a.ready) return;
    if (!this.on) this.build();
    const t = a.ctx!.currentTime;
    this.night = night;
    // The pursuit layer, by the alert: a low pulse, its own fader, under the pieces and the silences alike.
    this.pursuit.gain.setTargetAtTime(PURSUIT.level[alert] * PURSUIT.gain, t, 1 / PURSUIT.ease);
    if (this.pursuit.gain.value > 0.005) while (this.beat < t + 0.25) { this.pulse(Math.max(this.beat, t + 0.02)); this.beat = Math.max(this.beat, t) + 0.5; }
    else this.beat = 0;
    if (this.until < 0) this.until = t + PLAN.first;
    // Silence, then a piece faded in, then silence again.
    if (t >= this.until) {
      this.playing = !this.playing;
      this.until = t + stretch(this.playing, this.rand());
      this.master.gain.setTargetAtTime(this.playing ? PLAN.gain : 0, t, this.playing ? 4 : 5);
    }
    const to = trackFor(where, height);
    if (to !== this.track) {
      this.track = to;
      for (const k of Object.keys(this.out) as Track[]) this.out[k].gain.setTargetAtTime(k === to ? 1 : 0, t, 2.5);
    }
    // (Nothing played while it's silent, or fading out to it.)
    if (!this.playing && this.master.gain.value < 0.005) { for (const c of Object.values(this.clock)) c.next = 0; return; }
    // Each audible track's next steps, a quarter of a second ahead (a silent one stops; it starts again on the bar).
    for (const k of Object.keys(TRACKS) as Track[]) {
      const c = this.clock[k], live = k === this.track || this.out[k].gain.value > 0.01;
      if (!live) { c.next = 0; continue; }
      if (c.next < t) { c.next = t + 0.05; c.step = 0; }
      const D = TRACKS[k], step = 60 / D.bpm / 4;
      while (c.next < t + 0.25) { this.play(k, D, c.step, c.next, step); c.next += step; c.step = (c.step + 1) % 128; }
    }
  }

  /** One step (a sixteenth) of a track: a pad every two bars, a note now and then on a beat. */
  private play(k: Track, D: Def, i: number, t: number, step: number) {
    const s = i % 32, chord = D.chords[Math.floor(i / 32) % D.chords.length], out = this.out[k];
    if (s === 0) this.pad(t, chord, step * 32, D.pad * (1 - (1 - NIGHT.bright) * this.night), out);
    // A note on a beat now and then: a walk up and down the scale, never far, held long and echoing (fewer at night).
    if (s % 4 === 0 && this.rand() < D.melody * (1 - (1 - NIGHT.notes) * this.night)) {
      const c = this.clock[k];
      c.note = Math.max(0, Math.min(D.scale.length - 1, c.note + Math.floor(this.rand() * 5) - 2));
      this.keys(t, D.scale[c.note], step * 10, k === 'under' ? 0.03 : 0.035, this.echo[k], k === 'under' ? 1 : 0);
    }
  }

  /** The pursuit layer's beat: a low, muffled thump with a breath of noise, twice a second. */
  private pulse(t: number) {
    const ctx = this.a.ctx!, o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'triangle'; o.frequency.setValueAtTime(hz(33), t); o.frequency.exponentialRampToValueAtTime(hz(28), t + 0.35);
    lp.type = 'lowpass'; lp.frequency.value = 220;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(lp).connect(g).connect(this.pursuit); o.start(t); o.stop(t + 0.45);
  }

  /** A pad: two detuned saws a note, softly in and out, through a low-pass. */
  private pad(t: number, chord: Chord, dur: number, bright: number, out: AudioNode) {
    const ctx = this.a.ctx!, lp = ctx.createBiquadFilter(), g = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(bright * 0.6, t); lp.frequency.linearRampToValueAtTime(bright, t + dur / 2); lp.frequency.linearRampToValueAtTime(bright * 0.6, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.022, t + Math.min(1.5, dur / 3)); g.gain.setValueAtTime(0.022, t + dur - 0.5); g.gain.linearRampToValueAtTime(0, t + dur + 1.5);
    lp.connect(g).connect(out);
    for (const n of chord) for (const d of [-6, 6]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(n); o.detune.value = d;
      o.connect(lp); o.start(t); o.stop(t + dur + 1.6);
    }
  }

  /** An electric-piano note: a sine with a second sine shaping it, bright at the strike and mellowing. */
  private keys(t: number, n: number, dur: number, gain: number, out: AudioNode, bright = 0) {
    const ctx = this.a.ctx!, c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain(), f = hz(n);
    c.frequency.value = f; m.frequency.value = f * 2; mg.gain.setValueAtTime(f * (bright ? 0.4 : 1.2), t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    m.connect(mg).connect(c.frequency); c.connect(g).connect(out);
    c.start(t); m.start(t); c.stop(t + dur + 0.05); m.stop(t + dur + 0.05);
  }

  private build() {
    const a = this.a, ctx = a.ctx!;
    this.on = true;
    // A long, soft reverb: five seconds of decaying noise, both ears.
    const len = ctx.sampleRate * 5, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.2; }
    this.verb = ctx.createConvolver(); this.verb.buffer = ir;
    // Everything through one fader: silent until a piece comes.
    this.master = ctx.createGain(); this.master.gain.value = 0; this.master.connect(a.bus.music);
    this.pursuit = ctx.createGain(); this.pursuit.gain.value = 0; this.pursuit.connect(a.bus.music);
    const wet = ctx.createGain(); wet.gain.value = 0.8; this.verb.connect(wet).connect(this.master);
    for (const k of Object.keys(TRACKS) as Track[]) {
      const g = ctx.createGain(); g.gain.value = k === this.track ? 1 : 0;
      g.connect(this.master); g.connect(this.verb);
      // Its echo: a dotted eighth, fading, darker each time round.
      const D = TRACKS[k], dl = ctx.createDelay(2), fb = ctx.createGain(), lp = ctx.createBiquadFilter();
      dl.delayTime.value = (60 / D.bpm) * 0.75; fb.gain.value = k === 'under' ? 0.55 : 0.4; lp.type = 'lowpass'; lp.frequency.value = k === 'under' ? 900 : 2500;
      dl.connect(lp).connect(fb).connect(dl); lp.connect(g);
      const send = ctx.createGain(); send.gain.value = 1; send.connect(dl); send.connect(g);
      this.echo[k] = send;
      this.out[k] = g;
      this.clock[k] = { next: 0, step: 0, note: 3 };
    }
  }

  private rand() { this.seed = (this.seed * 1103515245 + 12345) >>> 0; return this.seed / 4294967296; }
}
