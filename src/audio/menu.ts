// The main menu's music (M10-60, U-105): a short, quiet piece made for the game, looping while the menu's up and fading
// out when play starts. Eight slow bars in A minor (Am9, Fmaj7, Cmaj7, Em7, two bars each): a cold synth pad, a low
// bass under it, and a written electric-piano line falling far apart, echoing in a long reverb. Played from a step
// sequencer on the audio clock, a quarter of a second ahead; through the music bus, so the master volume sets it.
import type { Audio } from './audio';

/** Its tempo, its loudness at most, how fast it fades in and out (s). */
export const MENU = { bpm: 66, gain: 0.45, in: 2.5, out: 0.6 };
const CHORDS = [[57, 60, 64, 67, 71], [53, 57, 60, 64], [48, 55, 59, 64], [52, 55, 59, 62]], BASS = [45, 41, 48, 40];
/** The melody: [step (sixteenths into the eight bars), note, length in steps]. */
const LINE: [number, number, number][] = [
  [0, 76, 6], [8, 72, 4], [12, 74, 4], [16, 76, 12], [28, 69, 4],
  [32, 72, 6], [40, 69, 4], [44, 67, 4], [48, 69, 14],
  [64, 67, 6], [72, 64, 4], [76, 67, 4], [80, 71, 12], [92, 72, 4],
  [96, 71, 6], [104, 67, 4], [108, 64, 4], [112, 74, 8], [120, 71, 8],
];
const hz = (n: number) => 440 * 2 ** ((n - 69) / 12);

export class MenuMusic {
  private out?: GainNode;
  private echo?: GainNode;
  private next = 0;
  private step = 0;
  /** whether it's playing (the menu's up), and the notes it's played (for the tests) */
  playing = false;
  notes = 0;
  constructor(private a: Audio) {}

  /** Every frame: on while the main menu's up, faded out when it's gone. */
  update(on: boolean) {
    const a = this.a;
    if (!a.ready) return;
    if (!this.out) this.build();
    const t = a.ctx!.currentTime;
    if (on !== this.playing) {
      this.playing = on;
      this.out!.gain.setTargetAtTime(on ? MENU.gain : 0, t, on ? MENU.in / 3 : MENU.out / 3);
      if (on) { this.next = t + 0.1; this.step = 0; }
    }
    if (!on) return;
    const step = 60 / MENU.bpm / 4;
    if (this.next < t) this.next = t + 0.05;
    while (this.next < t + 0.25) { this.play(this.step, this.next, step); this.next += step; this.step = (this.step + 1) % 128; }
  }

  /** One sixteenth: the pad and the bass every two bars, the melody's notes where they fall. */
  private play(i: number, t: number, step: number) {
    if (i % 32 === 0) { const k = i / 32; this.pad(t, CHORDS[k], step * 32); this.bass(t, BASS[k], step * 32); }
    for (const [s, n, len] of LINE) if (s === i) this.keys(t, n, step * len * 1.8);
  }

  /** A pad: two detuned saws a note, slowly in and out, through a low-pass that breathes. */
  private pad(t: number, chord: number[], dur: number) {
    const ctx = this.a.ctx!, lp = ctx.createBiquadFilter(), g = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(1100, t + dur / 2); lp.frequency.linearRampToValueAtTime(500, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.02, t + 2); g.gain.setValueAtTime(0.02, t + dur - 0.6); g.gain.linearRampToValueAtTime(0, t + dur + 1.8);
    lp.connect(g).connect(this.out!); g.connect(this.echo!);
    for (const n of chord) for (const d of [-7, 7]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(n); o.detune.value = d;
      o.connect(lp); o.start(t); o.stop(t + dur + 2);
    }
  }

  /** The bass: a soft sine and its octave, held. */
  private bass(t: number, n: number, dur: number) {
    const ctx = this.a.ctx!, g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 1.2); g.gain.setValueAtTime(0.06, t + dur - 0.8); g.gain.linearRampToValueAtTime(0, t + dur + 0.5);
    g.connect(this.out!);
    for (const [m, v] of [[1, 1], [2, 0.25]]) { const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = hz(n) * m; og.gain.value = v; o.connect(og).connect(g); o.start(t); o.stop(t + dur + 0.6); }
  }

  /** An electric-piano note: a sine shaped by a second, bright at the strike and mellowing, into the echo. */
  private keys(t: number, n: number, dur: number) {
    const ctx = this.a.ctx!, c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain(), f = hz(n);
    c.frequency.value = f; m.frequency.value = f * 2; mg.gain.setValueAtTime(f * 1.1, t); mg.gain.exponentialRampToValueAtTime(f * 0.04, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    m.connect(mg).connect(c.frequency); c.connect(g); g.connect(this.out!); g.connect(this.echo!);
    c.start(t); m.start(t); c.stop(t + dur + 0.05); m.stop(t + dur + 0.05);
    this.notes++;
  }

  private build() {
    const ctx = this.a.ctx!;
    this.out = ctx.createGain(); this.out.gain.value = 0; this.out.connect(this.a.bus.music);
    // A long soft reverb, and an echo a dotted eighth behind, darker each time round.
    const len = ctx.sampleRate * 4, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.4; }
    const verb = ctx.createConvolver(), wet = ctx.createGain(), dl = ctx.createDelay(2), fb = ctx.createGain(), lp = ctx.createBiquadFilter();
    verb.buffer = ir; wet.gain.value = 0.7; verb.connect(wet).connect(this.out);
    dl.delayTime.value = (60 / MENU.bpm) * 0.75; fb.gain.value = 0.42; lp.type = 'lowpass'; lp.frequency.value = 2200;
    dl.connect(lp).connect(fb).connect(dl); lp.connect(this.out); lp.connect(verb);
    this.echo = ctx.createGain(); this.echo.connect(dl); this.echo.connect(verb);
  }
}
