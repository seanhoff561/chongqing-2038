// The street speakers' voice (M4-28, U-053, U-092): a chime that rings down the street and comes back off the blocks,
// then the announcement in a calm Chinese woman's voice (recorded once with a neural text-to-speech model: credits),
// played as a street loudspeaker sounds: thin (its horn's band, a lift where speech carries), a little driven, from the
// lamppost it's on, and echoing down the street after it. Quieter the farther the speaker, dull indoors. No subtitles.
import type { Audio } from './audio';

/** The chime's echoes (s after it), how near a speaker it's heard (m), how long after the chime the words start (s),
 *  and the street's echoes of the voice: how long after, how much each time. */
const PA = { echoes: [0, 0.34, 0.75, 1.2], hear: 90, words: 1.9, delay: 0.31, feedback: 0.38 };

const lines = new Map<string, Promise<AudioBuffer | null>>();
function line(a: Audio, id: string) {
  let p = lines.get(id);
  if (!p) lines.set(id, (p = fetch(`./audio/pa/${id}.ogg`).then(r => (r.ok ? r.arrayBuffer() : null)).then(b => (b ? a.ctx!.decodeAudioData(b) : null)).catch(() => null)));
  return p;
}

/** An announcement (its line's id) from a speaker at `from`, him `dist` m off. */
export function announce(a: Audio, id: string, from: { x: number; y: number; z: number }, dist: number, indoors: boolean) {
  if (!a.ready) return;
  const near = Math.max(0, 1 - dist / PA.hear) * (indoors ? 0.35 : 1);
  if (near < 0.02) return;
  const ctx = a.ctx!, t = ctx.currentTime + 0.05;
  // Two soft falling bell tones, and their echoes.
  PA.echoes.forEach((e, k) => {
    const g = 0.06 * near * 0.5 ** k;
    a.tone(t + e, 1.2, g, 784, 782, 'sine', a.bus.voice);
    a.tone(t + e + 0.55, 1.6, g, 587, 586, 'sine', a.bus.voice);
  });
  line(a, id).then(buf => {
    if (!buf || a.master.gain.value === 0) return;
    // The horn: its band, a lift at 2 kHz, driven a little; then the lamppost's place, and the street's echo.
    const src = ctx.createBufferSource(), lo = ctx.createBiquadFilter(), hi = ctx.createBiquadFilter(), lift = ctx.createBiquadFilter(), drive = ctx.createWaveShaper(), level = ctx.createGain();
    src.buffer = buf;
    lo.type = 'highpass'; lo.frequency.value = 350;
    hi.type = 'lowpass'; hi.frequency.value = indoors ? 900 : 3800;
    lift.type = 'peaking'; lift.frequency.value = 2000; lift.Q.value = 1.1; lift.gain.value = 6;
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) { const x = (i / (curve.length - 1)) * 2 - 1; curve[i] = Math.tanh(2.2 * x) / Math.tanh(2.2); }
    drive.curve = curve;
    level.gain.value = 1.6 * near;
    const pan = a.panner(0.5, false), echo = ctx.createDelay(1), back = ctx.createGain(), dull = ctx.createBiquadFilter();
    pan.disconnect(); pan.connect(a.bus.voice);
    if (pan.positionX) { pan.positionX.value = from.x; pan.positionY.value = from.y; pan.positionZ.value = from.z; } else pan.setPosition(from.x, from.y, from.z);
    echo.delayTime.value = PA.delay; back.gain.value = PA.feedback; dull.type = 'lowpass'; dull.frequency.value = 2400;
    src.connect(lo).connect(lift).connect(drive).connect(hi).connect(level);
    level.connect(pan);
    level.connect(echo).connect(dull).connect(back).connect(echo);
    back.connect(a.bus.voice);
    src.start(Math.max(ctx.currentTime, t + PA.words));
    src.onended = () => setTimeout(() => { for (const n of [src, lo, lift, drive, hi, level, pan, echo, back, dull]) n.disconnect(); }, 3000);
  });
}
