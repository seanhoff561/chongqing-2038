// The city's music (M4-86, U-065; M4-97, U-070; back with more pieces, M10-66, U-107): most of the time none at all,
// only the quiet ambience. Now and then, minutes apart, a short piece fades in, very faint and slow: soft electric-piano
// notes falling far apart over a cold synth pad, a long reverb and echo, no drums; then it fades back to nothing. Each
// time a different piece (never the same twice running), some only by day, some only by night: A minor, A Dorian or
// Aeolian, a slow walk of notes, a slow arpeggio, or sparse bells. How it sounds goes by where he is: high up, airy
// and high, its notes echoing; in the streets a little warmer; underground, low and bell-like; every piece is voiced
// for all three, so it cross-fades as he moves between places. While his own songs play (or the main menu's up) it
// fades out and stays silent; a while after they stop, the next piece. The notes are played from a step sequencer on
// the audio clock, a quarter of a second ahead.
import type { Audio } from './audio';
import type { Where } from './ambience';
import type { Alert } from '../sim/district';

export type Track = 'high' | 'ground' | 'under';
/** How the notes fall: a slow walk up and down the scale, a slow arpeggio through the chord, or rare bells. */
export type Figure = 'walk' | 'arp' | 'bell';
type Chord = number[];
export interface Piece {
  bpm: number;
  /** a chord every `bars` bars (MIDI notes) */
  chords: Chord[]; bars: number;
  /** how often (0 to 1) a note falls on a beat, the notes a walk goes through, and how they fall */
  melody: number; scale: number[]; figure: Figure;
  /** only by day or only by night, if either */
  when?: 'day' | 'night';
}

const Am7 = [57, 60, 64, 67], Fmaj7 = [53, 57, 60, 64], Cmaj7 = [48, 55, 59, 64], Em7 = [52, 55, 59, 62], Dm7 = [50, 57, 60, 65],
  G6 = [55, 59, 62, 64], Am9 = [57, 60, 64, 71], Dadd9 = [50, 54, 57, 64], Bm7 = [47, 54, 57, 62], Gmaj7 = [55, 59, 62, 66],
  Dm9 = [50, 53, 57, 64], Esus4 = [52, 57, 59, 64], Fmaj7s11 = [53, 57, 64, 71], Cadd9 = [48, 55, 60, 62];
const PENTA = [69, 72, 74, 76, 79, 81, 84], DORIAN = [69, 71, 72, 74, 76, 78, 79, 81], AEOLIAN = [69, 71, 72, 74, 76, 77, 79, 81];

/** The pieces: the first three the old ones, the rest new (U-107). */
export const PIECES: Piece[] = [
  { bpm: 54, chords: [Am7, Fmaj7, Cmaj7, Em7], bars: 2, melody: 0.3, scale: PENTA, figure: 'walk' },
  { bpm: 48, chords: [Fmaj7, Am9, Cmaj7, G6], bars: 2, melody: 0.32, scale: PENTA, figure: 'walk', when: 'day' },
  { bpm: 50, chords: [Am7, Am7, Dm7, Em7], bars: 2, melody: 0.24, scale: PENTA, figure: 'walk' },
  // A Dorian, its raised sixth in the D chord: a slow arpeggio climbing each chord.
  { bpm: 46, chords: [Am9, Dadd9, Am7, Bm7], bars: 2, melody: 0.55, scale: DORIAN, figure: 'arp', when: 'day' },
  // Aeolian, VI-VII-i, held long: the arpeggio slower still.
  { bpm: 42, chords: [Fmaj7, G6, Am7, Am9], bars: 2, melody: 0.45, scale: AEOLIAN, figure: 'arp' },
  // Two chords, four bars each, and a bell now and then.
  { bpm: 40, chords: [Am9, Fmaj7s11], bars: 4, melody: 0.14, scale: PENTA, figure: 'bell', when: 'night' },
  { bpm: 44, chords: [Dm9, Am9, Fmaj7, Esus4], bars: 2, melody: 0.22, scale: AEOLIAN, figure: 'walk', when: 'night' },
  { bpm: 52, chords: [Cadd9, Gmaj7, Am9, Am7], bars: 2, melody: 0.28, scale: DORIAN, figure: 'walk', when: 'day' },
];
/** Each track's voicing of a piece: its tempo against the piece's, its notes shifted (semitones), the pads'
 *  brightness (Hz), its share of notes, how loud a note, the echo's feedback and darkness. */
export const TRACKS: Record<Track, { tempo: number; shift: number; pad: number; notes: number; gain: number; fb: number; lp: number }> = {
  ground: { tempo: 1, shift: 0, pad: 900, notes: 1, gain: 0.035, fb: 0.4, lp: 2500 },
  high: { tempo: 0.9, shift: 12, pad: 1600, notes: 1.05, gain: 0.035, fb: 0.4, lp: 2500 },
  under: { tempo: 0.94, shift: -12, pad: 600, notes: 0.75, gain: 0.03, fb: 0.55, lp: 900 },
};
/** How long the silences last between pieces and the pieces themselves (s), at least and at most; the first comes
 *  after the shortest silence; the silence at least after his songs stop; how loud a piece is at most (very faint:
 *  U-070); how fast it fades out under his songs (s, a time constant: gone in about two seconds). */
export const PLAN = { quiet: [100, 260], piece: [50, 100], first: 45, after: 20, gain: 0.35, hush: 0.6 };
/** The pursuit layer's strength by the district's alert (M8-10): nothing when they don't know of him, strongest while
 *  one has him; and how far its pulse eases toward that each second. */
export const PURSUIT = { level: { unaware: 0, suspicious: 0.3, engaged: 1, searching: 0.65, heightened: 0.35 } as Record<Alert, number>, ease: 0.5, gain: 0.5 };
/** By night the pads darker and the notes fewer (M8-10): their brightness and the notes' share at night, by day 1. */
export const NIGHT = { bright: 0.55, notes: 0.6 };
/** How dark it is, 0 by day to 1 at night, for the pads. */
export const nightOf = (daylight: number) => 1 - daylight;

/** The next stretch's length: a silence, or a piece, by a random number 0 to 1. */
export const stretch = (piece: boolean, r: number) => { const [a, b] = piece ? PLAN.piece : PLAN.quiet; return a + (b - a) * r; };

/** Where the music's fader goes: up while a piece plays and nothing hushes it, else to nothing. */
export const fader = (playing: boolean, muted: boolean) => (playing && !muted ? PLAN.gain : 0);

/** The next piece, by a random number 0 to 1: one for this time of day, never the last one again. */
export function pickPiece(last: number, night: boolean, r: number): number {
  const ok = PIECES.map((_, i) => i).filter(i => i !== last && PIECES[i].when !== (night ? 'day' : 'night'));
  return ok[Math.min(ok.length - 1, Math.floor(r * ok.length))];
}

/** The track for where he is: up on the roofs or high over the ground, the high one; underground, the deep one. */
export function trackFor(where: Where, height: number): Track {
  if (where === 'under') return 'under';
  return where === 'roof' || height > 18 ? 'high' : 'ground';
}

const hz = (n: number) => 440 * 2 ** ((n - 69) / 12);

export class Music {
  track: Track = 'ground';
  /** the piece playing or last played (an index into PIECES), and the notes played (for the tests) */
  piece = -1;
  notes = 0;
  private on = false;
  private out = {} as Record<Track, GainNode>;
  private clock = {} as Record<Track, { next: number; step: number; note: number; arp: number }>;
  private verb!: ConvolverNode;
  /** each track's echo send (dry and echoing), and its delay */
  private echo = {} as Record<Track, GainNode>;
  private delay = {} as Record<Track, DelayNode>;
  private seed = 7;
  /** a piece playing now, and when this stretch (piece or silence) ends (audio clock) */
  playing = false;
  private until = -1;
  /** everything through one fader */
  master!: GainNode;
  /** the pursuit layer's fader, and its next beat; how dark it is (0 to 1) */
  private pursuit!: GainNode;
  private beat = 0;
  private night = 0;
  constructor(private a: Audio) {}

  /** Every frame; muted while his own songs play or the main menu's up. */
  update(where: Where, height: number, alert: Alert = 'unaware', night = 0, muted = false) {
    const a = this.a;
    if (!a.ready) return;
    if (!this.on) this.build();
    const t = a.ctx!.currentTime;
    this.night = night;
    if (this.until < 0) this.until = t + PLAN.first;
    // The pursuit layer, by the alert: a low pulse, its own fader, under the pieces and the silences alike.
    this.pursuit.gain.setTargetAtTime(muted ? 0 : PURSUIT.level[alert] * PURSUIT.gain, t, muted ? PLAN.hush : 1 / PURSUIT.ease);
    if (this.pursuit.gain.value > 0.005) while (this.beat < t + 0.25) { this.pulse(Math.max(this.beat, t + 0.02)); this.beat = Math.max(this.beat, t) + 0.5; }
    else this.beat = 0;
    if (muted) {
      // His songs: the piece fades out in a couple of seconds, and the next comes a while after they stop.
      this.playing = false;
      if (this.master.gain.value > 0.001) this.master.gain.setTargetAtTime(fader(true, true), t, PLAN.hush);
      this.until = Math.max(this.until, t + PLAN.after);
    } else if (t >= this.until) {
      // Silence, then a piece faded in, then silence again.
      this.playing = !this.playing;
      this.until = t + stretch(this.playing, this.rand());
      if (this.playing) this.begin(t);
      this.master.gain.setTargetAtTime(fader(this.playing, false), t, this.playing ? 4 : 5);
    }
    const to = trackFor(where, height);
    if (to !== this.track) {
      this.track = to;
      for (const k of Object.keys(this.out) as Track[]) this.out[k].gain.setTargetAtTime(k === to ? 1 : 0, t, 2.5);
    }
    // (Nothing played while it's silent, or fading out to it.)
    if (!this.playing && this.master.gain.value < 0.005) { for (const c of Object.values(this.clock)) c.next = 0; return; }
    const P = PIECES[this.piece];
    // Each audible track's next steps, a quarter of a second ahead (a silent one stops; it starts again on the bar).
    for (const k of Object.keys(TRACKS) as Track[]) {
      const c = this.clock[k], live = k === this.track || this.out[k].gain.value > 0.01;
      if (!live) { c.next = 0; continue; }
      if (c.next < t) { c.next = t + 0.05; c.step = 0; }
      const step = 60 / (P.bpm * TRACKS[k].tempo) / 4, len = 16 * P.bars * P.chords.length;
      while (c.next < t + 0.25) { this.play(k, P, c.step, c.next, step); c.next += step; c.step = (c.step + 1) % len; }
    }
  }

  /** A new piece: chosen, every track's sequencer back to its start, the echoes set to its tempo. */
  private begin(t: number) {
    this.piece = pickPiece(this.piece, this.night > 0.5, this.rand());
    const P = PIECES[this.piece];
    for (const k of Object.keys(TRACKS) as Track[]) {
      Object.assign(this.clock[k], { next: 0, step: 0, note: 3, arp: 0 });
      this.delay[k].delayTime.setValueAtTime((60 / (P.bpm * TRACKS[k].tempo)) * 0.75, t);
    }
  }

  /** One step (a sixteenth) of a track: a pad on each chord, a note now and then on a beat. */
  private play(k: Track, P: Piece, i: number, t: number, step: number) {
    const per = 16 * P.bars, s = i % per, chord = P.chords[Math.floor(i / per) % P.chords.length], V = TRACKS[k], c = this.clock[k];
    if (s === 0) { this.pad(t, chord, step * per, V.pad * (1 - (1 - NIGHT.bright) * this.night), this.out[k]); c.arp = 0; }
    // A note on a beat now and then, held long and echoing (fewer at night).
    if (s % 4 !== 0 || this.rand() >= P.melody * V.notes * (1 - (1 - NIGHT.notes) * this.night)) return;
    this.notes++;
    if (P.figure === 'bell') { this.bell(t, P.scale[Math.floor(this.rand() * P.scale.length)] + V.shift, step * 28, V.gain * 0.8, this.echo[k]); return; }
    let n: number;
    if (P.figure === 'arp') n = chord[c.arp++ % chord.length] + 12 + V.shift;
    // A walk up and down the scale, never far.
    else { c.note = Math.max(0, Math.min(P.scale.length - 1, c.note + Math.floor(this.rand() * 5) - 2)); n = P.scale[c.note] + V.shift; }
    this.keys(t, n, step * (P.figure === 'arp' ? 12 : 10), V.gain, this.echo[k], k === 'under' ? 1 : 0);
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
    this.fm(t, hz(n), 2, bright ? 0.4 : 1.2, 0.05, dur, gain, out);
  }

  /** A bell: the second sine at an uneven ratio, so it rings metallic, and a long ring. */
  private bell(t: number, n: number, dur: number, gain: number, out: AudioNode) {
    this.fm(t, hz(n), 3.5, 1.6, 0.02, dur, gain, out);
  }

  /** Two sines, one shaping the other: its depth from `from` to `to` (times the note) over the note's length. */
  private fm(t: number, f: number, ratio: number, from: number, to: number, dur: number, gain: number, out: AudioNode) {
    const ctx = this.a.ctx!, c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
    c.frequency.value = f; m.frequency.value = f * ratio; mg.gain.setValueAtTime(f * from, t); mg.gain.exponentialRampToValueAtTime(f * to, t + dur);
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
      const V = TRACKS[k], dl = ctx.createDelay(2), fb = ctx.createGain(), lp = ctx.createBiquadFilter();
      dl.delayTime.value = 0.8; fb.gain.value = V.fb; lp.type = 'lowpass'; lp.frequency.value = V.lp;
      dl.connect(lp).connect(fb).connect(dl); lp.connect(g);
      const send = ctx.createGain(); send.gain.value = 1; send.connect(dl); send.connect(g);
      this.echo[k] = send; this.delay[k] = dl;
      this.out[k] = g;
      this.clock[k] = { next: 0, step: 0, note: 3, arp: 0 };
    }
  }

  private rand() { this.seed = (this.seed * 1103515245 + 12345) >>> 0; return this.seed / 4294967296; }
}
