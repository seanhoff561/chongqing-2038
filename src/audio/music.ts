// The city's music (M4-86, U-065): synth tracks, melodic and easy to listen to, a little haunting, a slow beat under
// them. Which one plays goes by where he is: high up a calm, windy one (airy pads, a slow arpeggio echoing, no drums);
// in the streets a grounded one (warm bass, soft kick and hats, electric-piano phrases); underground and in the sewers
// a deep one (dub chords echoing down the tunnels, a sub bass, a slow four on the floor, drips). All in A minor, so
// they cross-fade into each other as he moves between places. The notes are played from a step sequencer on the
// audio clock, a quarter of a second ahead.
import type { Audio } from './audio';
import type { Where } from './ambience';

export type Track = 'high' | 'ground' | 'under';
type Chord = number[];
interface Def {
  bpm: number;
  /** one chord a bar (MIDI notes) */
  chords: Chord[];
  /** steps (of 16) each part plays on */
  kick: number[]; hat: number[]; rim: number[]; bass: number[];
  /** how often (0 to 1) a melody note falls on a step, and the notes it walks through */
  melody: number; scale: number[];
  /** the pads' brightness (Hz) */
  pad: number;
}

const Am7 = [57, 60, 64, 67], Fmaj7 = [53, 57, 60, 64], Cmaj7 = [48, 55, 59, 64], Em7 = [52, 55, 59, 62], Dm7 = [50, 57, 60, 65], G6 = [55, 59, 62, 64], Am9 = [57, 60, 64, 71];
const PENTA = [69, 72, 74, 76, 79, 81, 84];

export const TRACKS: Record<Track, Def> = {
  ground: { bpm: 84, chords: [Am7, Fmaj7, Cmaj7, Em7], kick: [0, 8, 11], hat: [2, 6, 10, 14], rim: [12], bass: [0, 6, 10], melody: 0.22, scale: PENTA, pad: 1100 },
  high: { bpm: 68, chords: [Fmaj7, Am9, Cmaj7, G6], kick: [], hat: [], rim: [], bass: [0], melody: 0.5, scale: PENTA.map(n => n + 12), pad: 2200 },
  under: { bpm: 76, chords: [Am7, Am7, Dm7, Em7], kick: [0, 4, 8, 12], hat: [2, 6, 10, 14], rim: [], bass: [0, 3, 8], melody: 0.08, scale: PENTA.map(n => n - 12), pad: 650 },
};

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
  constructor(private a: Audio) {}

  update(where: Where, height: number) {
    const a = this.a;
    if (!a.ready) return;
    if (!this.on) this.build();
    const t = a.ctx!.currentTime;
    const to = trackFor(where, height);
    if (to !== this.track) {
      this.track = to;
      for (const k of Object.keys(this.out) as Track[]) this.out[k].gain.setTargetAtTime(k === to ? 1 : 0, t, 2.5);
    }
    // Each audible track's next steps, a quarter of a second ahead (a silent one stops; it starts again on the bar).
    for (const k of Object.keys(TRACKS) as Track[]) {
      const c = this.clock[k], live = k === this.track || this.out[k].gain.value > 0.01;
      if (!live) { c.next = 0; continue; }
      if (c.next < t) { c.next = t + 0.05; c.step = 0; }
      const D = TRACKS[k], step = 60 / D.bpm / 4;
      while (c.next < t + 0.25) { this.play(k, D, c.step, c.next, step); c.next += step; c.step = (c.step + 1) % 64; }
    }
  }

  /** One step of a track. */
  private play(k: Track, D: Def, i: number, t: number, step: number) {
    const s = i % 16, chord = D.chords[Math.floor(i / 16) % D.chords.length], out = this.out[k];
    if (s === 0) this.pad(t, chord, step * 16, D.pad, out);
    if (D.kick.includes(s)) this.kick(t, out);
    if (D.hat.includes(s)) this.a.noise(t, 0.035, k === 'under' ? 0.025 : 0.035, 'highpass', 7500, 0.7, undefined, out);
    if (D.rim.includes(s)) { this.a.noise(t, 0.08, 0.05, 'bandpass', 1900, 2, undefined, out); this.a.tone(t, 0.06, 0.03, 340, 300, 'triangle', out); }
    if (D.bass.includes(s)) this.bass(t, chord[0] - 12, step * (k === 'high' ? 14 : 3), out);
    // The high track's slow arpeggio up through the chord, echoing.
    if (k === 'high' && s % 2 === 0) this.keys(t, chord[(s / 2) % chord.length] + 12, step * 3, 0.05, this.echo[k]);
    // The deep track's dub stab, off the beat, into the long echo.
    if (k === 'under' && (s === 2 || s === 10)) for (const n of chord.slice(1)) this.keys(t, n, step * 1.5, 0.035, this.echo[k], 500);
    // A phrase now and then: a walk up and down the scale, never far.
    if (s % 2 === 0 && this.rand() < D.melody) {
      const c = this.clock[k];
      c.note = Math.max(0, Math.min(D.scale.length - 1, c.note + Math.floor(this.rand() * 5) - 2));
      this.keys(t, D.scale[c.note], step * 4, k === 'ground' ? 0.06 : 0.045, this.echo[k]);
    }
    // Drips in the tunnels.
    if (k === 'under' && this.rand() < 0.04) this.a.tone(t, 0.09, 0.02, 1700 + this.rand() * 900, 1100, 'sine', this.echo[k]);
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

  private bass(t: number, n: number, dur: number, out: AudioNode) {
    this.a.tone(t, dur, 0.09, hz(n), hz(n) * 0.995, 'triangle', out);
    this.a.tone(t, dur, 0.05, hz(n - 12), hz(n - 12), 'sine', out);
  }

  private kick(t: number, out: AudioNode) { this.a.tone(t, 0.3, 0.16, 110, 42, 'sine', out); }

  private build() {
    const a = this.a, ctx = a.ctx!;
    this.on = true;
    // A long, soft reverb: three seconds of decaying noise, both ears.
    const len = ctx.sampleRate * 3, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3; }
    this.verb = ctx.createConvolver(); this.verb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.5; this.verb.connect(wet).connect(a.bus.music);
    for (const k of Object.keys(TRACKS) as Track[]) {
      const g = ctx.createGain(); g.gain.value = k === this.track ? 1 : 0;
      g.connect(a.bus.music); g.connect(this.verb);
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
