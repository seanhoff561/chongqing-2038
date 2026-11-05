// The city's music (M8-10, M10-66): the pursuit layer by the alert, darker by night; its track by where he is, its
// stretches of silence and piece, a different piece each time; it plays, and it's silent while his own songs play.
import { describe, it, expect } from 'vitest';
import { Music, PURSUIT, NIGHT, PLAN, PIECES, nightOf, stretch, trackFor, pickPiece, fader } from '../../src/audio/music';
import type { Audio } from '../../src/audio/audio';
import type { Alert } from '../../src/sim/district';

/** Just enough of an audio context: params jump straight to their targets; the oscillators started are counted. */
function fakeAudio() {
  const param = () => { const p = { value: 0, setTargetAtTime: (v: number) => { p.value = v; return p; }, setValueAtTime: () => p, linearRampToValueAtTime: () => p, exponentialRampToValueAtTime: () => p }; return p; };
  const ctx = {
    currentTime: 0, sampleRate: 100, started: 0,
    createBuffer: (_c: number, n: number) => ({ getChannelData: () => new Float32Array(n) }),
    createOscillator: () => ({ ...node(), start: () => { ctx.started++; } }),
  } as Record<string, unknown> & { currentTime: number; started: number };
  const node = () => ({ gain: param(), frequency: param(), detune: param(), delayTime: param(), connect: (x: unknown) => x, start() {}, stop() {}, buffer: null, type: '' });
  for (const k of ['createGain', 'createConvolver', 'createDelay', 'createBiquadFilter']) ctx[k] = node;
  const a = { ready: true, ctx, bus: { music: node() } } as unknown as Audio;
  return { a, ctx };
}

describe('the music (M8-10, M10-66)', () => {
  it('maps each alert state to its intensity, and night to darker pads', () => {
    const L = PURSUIT.level, all: Alert[] = ['unaware', 'suspicious', 'engaged', 'searching', 'heightened'];
    for (const a of all) { expect(L[a], a).toBeGreaterThanOrEqual(0); expect(L[a], a).toBeLessThanOrEqual(1); }
    expect(L.unaware).toBe(0);
    expect(L.engaged).toBe(1);
    expect(L.engaged).toBeGreaterThan(L.searching);
    expect(L.searching).toBeGreaterThan(L.heightened);
    expect(L.heightened).toBeGreaterThan(L.unaware);
    expect(L.suspicious).toBeGreaterThan(L.unaware);
    expect(nightOf(1)).toBe(0); expect(nightOf(0)).toBe(1);
    expect(NIGHT.bright).toBeLessThan(1); expect(NIGHT.notes).toBeLessThan(1);
  });

  it('picks its track by where he is, and long silences between shorter pieces', () => {
    expect(trackFor('under', 0)).toBe('under');
    expect(trackFor('roof', 0)).toBe('high');
    expect(trackFor('street', 30)).toBe('high');
    expect(trackFor('street', 2)).toBe('ground');
    expect(stretch(false, 0)).toBe(PLAN.quiet[0]); expect(stretch(false, 1)).toBe(PLAN.quiet[1]);
    expect(stretch(true, 0)).toBe(PLAN.piece[0]); expect(stretch(true, 1)).toBe(PLAN.piece[1]);
    expect(PLAN.quiet[0]).toBeGreaterThanOrEqual(PLAN.piece[1]);
  });

  it('never plays the same piece twice running, and keeps day pieces to the day and night ones to the night', () => {
    expect(PIECES.length).toBeGreaterThanOrEqual(6);
    for (const night of [false, true]) {
      const seen = new Set<number>();
      let last = -1;
      for (let i = 0; i < 200; i++) {
        const p = pickPiece(last, night, (i * 0.618) % 1);
        expect(p).not.toBe(last);
        expect(PIECES[p].when).not.toBe(night ? 'day' : 'night');
        seen.add(p); last = p;
      }
      expect(seen.size).toBeGreaterThanOrEqual(4);
    }
    // Every figure is used: the walk, the arpeggio, the bells.
    expect(new Set(PIECES.map(p => p.figure)).size).toBe(3);
  });

  it('plays, and goes silent while his songs play; after they stop, it comes back', () => {
    expect(fader(true, false)).toBe(PLAN.gain);
    expect(fader(true, true)).toBe(0);
    expect(fader(false, false)).toBe(0);
    const { a, ctx } = fakeAudio(), m = new Music(a);
    const run = (secs: number, muted: boolean) => { for (let i = 0; i < secs * 10; i++) { ctx.currentTime += 0.1; m.update('street', 0, 'unaware', 0, muted); } };
    run(PLAN.first + 5, false);
    expect(m.playing).toBe(true);
    expect(m.master.gain.value).toBe(PLAN.gain);
    expect(m.notes).toBeGreaterThan(0);
    const first = m.piece;
    // His song starts: the fader to nothing, and nothing more played.
    run(1, true);
    expect(m.playing).toBe(false);
    expect(m.master.gain.value).toBe(0);
    const notes = m.notes, started = ctx.started;
    run(300, true);
    expect(m.notes).toBe(notes);
    expect(ctx.started).toBe(started);
    // It stops: a silence, then the next piece, a different one.
    run(PLAN.after - 2, false);
    expect(m.playing).toBe(false);
    run(4, false);
    expect(m.playing).toBe(true);
    expect(m.master.gain.value).toBe(PLAN.gain);
    expect(m.piece).not.toBe(first);
  });
});
