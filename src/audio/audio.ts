// Web Audio engine: buses for master, voice, effects, ambience and music. Starts on the first user gesture.
export type Bus = 'voice' | 'effects' | 'ambience' | 'music';

export class Audio {
  ctx: AudioContext | null = null;
  master!: GainNode;
  private muffle!: BiquadFilterNode;
  readonly bus = {} as Record<Bus, GainNode>;
  private noiseBuf!: AudioBuffer;
  readonly volumes: Record<'master' | Bus, number> = { master: 0.8, voice: 1, effects: 1, ambience: 0.8, music: 0.6 };

  constructor() {
    const start = () => this.start();
    addEventListener('pointerdown', start);
    addEventListener('keydown', start);
  }

  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    if (!C) return;
    const ctx = (this.ctx = new C());
    this.master = ctx.createGain();
    // Everything heard through a low-pass that closes under water (M3-48).
    this.muffle = ctx.createBiquadFilter();
    this.muffle.type = 'lowpass';
    this.muffle.frequency.value = 22000;
    this.master.connect(this.muffle).connect(ctx.destination);
    for (const b of ['voice', 'effects', 'ambience', 'music'] as Bus[]) {
      this.bus[b] = ctx.createGain();
      this.bus[b].connect(this.master);
    }
    this.applyVolumes();
    // Two seconds of white noise, shared by every noisy sound.
    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    let s = 12345;
    for (let i = 0; i < d.length; i++) { s = (s * 1103515245 + 12345) >>> 0; d[i] = (s / 2147483648) - 1; }
  }

  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = this.volumes.master;
    for (const b of Object.keys(this.bus) as Bus[]) this.bus[b].gain.value = this.volumes[b];
  }

  get ready() { return !!this.ctx && this.ctx.state === 'running'; }

  /** The wind in his ears as he falls (M4-66): 0 still to 1 at full speed, rising and brightening with it. */
  private wind?: { gain: GainNode; band: BiquadFilterNode };
  setWind(level: number) {
    if (!this.ready) return;
    const ctx = this.ctx!;
    if (!this.wind) {
      const src = ctx.createBufferSource(), band = ctx.createBiquadFilter(), gain = ctx.createGain();
      src.buffer = this.noiseBuf; src.loop = true; band.type = 'bandpass'; band.Q.value = 0.7; gain.gain.value = 0;
      src.connect(band).connect(gain).connect(this.bus.effects); src.start();
      this.wind = { gain, band };
    }
    this.wind.gain.gain.setTargetAtTime(level * 0.5, ctx.currentTime, 0.08);
    this.wind.band.frequency.setTargetAtTime(300 + level * 1500, ctx.currentTime, 0.08);
  }

  /** His head for the 3D sounds (M4-33): where the camera is, facing where it looks. */
  listen(at: { x: number; y: number; z: number }, fwd: { x: number; y: number; z: number }) {
    const L = this.ctx!.listener, t = this.ctx!.currentTime;
    if (L.positionX) {
      L.positionX.setValueAtTime(at.x, t); L.positionY.setValueAtTime(at.y, t); L.positionZ.setValueAtTime(at.z, t);
      L.forwardX.setValueAtTime(fwd.x, t); L.forwardY.setValueAtTime(fwd.y, t); L.forwardZ.setValueAtTime(fwd.z, t);
      L.upX.setValueAtTime(0, t); L.upY.setValueAtTime(1, t); L.upZ.setValueAtTime(0, t);
    } else { L.setPosition(at.x, at.y, at.z); L.setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0); }
  }

  /** A place a sound comes from (M4-33): heard round his head, fading with distance (by `rolloff`: 1 is half at twice
   *  5 m, and so on; the machines' own sounds fall off faster, U-067). */
  panner(rolloff = 1): PannerNode {
    const p = this.ctx!.createPanner();
    p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 5; p.rolloffFactor = rolloff; p.maxDistance = 10000;
    p.connect(this.bus.effects);
    return p;
  }

  /** A one-off sound's place: a panner there, let go once the sound is over; heard through a wall (U-067), dull and
   *  a third as loud. */
  spot(q: { x: number; y: number; z: number }, hold = 4, rolloff = 1, walled = false): AudioNode {
    const p = this.panner(rolloff), t = this.ctx!.currentTime;
    if (p.positionX) { p.positionX.setValueAtTime(q.x, t); p.positionY.setValueAtTime(q.y, t); p.positionZ.setValueAtTime(q.z, t); } else p.setPosition(q.x, q.y, q.z);
    let into: AudioNode = p;
    if (walled) { const lp = this.ctx!.createBiquadFilter(), g = this.ctx!.createGain(); lp.type = 'lowpass'; lp.frequency.value = 450; g.gain.value = 0.3; lp.connect(g).connect(p); into = lp; setTimeout(() => lp.disconnect(), hold * 1000); }
    setTimeout(() => p.disconnect(), hold * 1000);
    return into;
  }

  /** Under water every sound comes dull and low; out of it, clear again at once. */
  setUnderwater(on: boolean) {
    if (this.ctx) this.muffle.frequency.value = on ? 500 : 22000;
  }

  /** A recording fetched and decoded (U-070), or null if it can't be had. */
  async load(url: string): Promise<AudioBuffer | null> {
    try { const r = await fetch(url); return r.ok ? await this.ctx!.decodeAudioData(await r.arrayBuffer()) : null; } catch { return null; }
  }

  /** The shared noise, looping for good (a wind's, the rain's hiss). */
  loop(): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true; src.start();
    return src;
  }

  /** A noise burst through a filter with an attack/decay envelope. */
  noise(at: number, dur: number, gain: number, type: BiquadFilterType, freq: number, q = 1, freqEnd?: number, out?: AudioNode) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.8 + ((at * 997) % 0.4);
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, at); f.Q.value = q;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, at + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + Math.min(0.01, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f).connect(g).connect(out ?? this.bus.effects);
    src.start(at, (at * 0.37) % 1.5, dur + 0.05);
  }

  /** A pitched tone with a pitch sweep and decay. */
  tone(at: number, dur: number, gain: number, f0: number, f1: number, type: OscillatorType = 'sine', out?: AudioNode) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, at);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), at + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(out ?? this.bus.effects);
    o.start(at);
    o.stop(at + dur + 0.02);
  }
}
