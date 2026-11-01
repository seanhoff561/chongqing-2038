// Recorded sounds (M4-98, U-070): where a good freely licensed recording exists (public/audio/sfx, docs/CREDITS.md),
// a sound is played from it, a variant picked at random and its pitch nudged so no two steps are alike; till they've
// loaded, or if one can't be had, the synthesised sound plays instead (audio/moves.ts).
import type { Audio } from './audio';

type Group = { files: string[]; gain: number; delay?: number };
const n = (base: string, ks: (number | string)[]) => ks.map(k => `${base}${k}.ogg`);
const CLOTH = n('cloth', [1, 2, 3, 4]), SOFT = n('impactSoft_medium_00', [0, 1, 2]);
const IMP = (kind: string) => n(`impact${kind}_00`, [0, 1, 2]);

/** Each sound's recordings and how loud (and how late, to meet a blow's swing). */
export const SAMPLES: Record<string, Group> = {
  // (His footsteps and the gunfire stay synthesised: U-071.)
  land: { files: SOFT, gain: 0.5 }, 'land-hard': { files: IMP('Soft_heavy'), gain: 0.85 }, grab: { files: n('handleSmallLeather', ['', 2]), gain: 0.4 }, grab2: { files: n('handleSmallLeather', ['', 2]), gain: 0.35 },
  'door-open': { files: n('doorOpen_', [1, 2]), gain: 0.6 }, 'door-close': { files: n('doorClose_', [1, 2, 3, 4]), gain: 0.6 }, force: { files: IMP('Wood_heavy'), gain: 0.9 }, latch: { files: ['metalLatch.ogg'], gain: 0.5 },
  glass: { files: IMP('Glass_heavy'), gain: 0.85 }, 'blow-glass': { files: IMP('Glass_light'), gain: 0.6 },
  'open-cabinet': { files: n('creak', [1, 2, 3]), gain: 0.45 }, 'open-wardrobe': { files: n('creak', [1, 2, 3]), gain: 0.55 }, 'open-locker': { files: IMP('Metal_medium'), gain: 0.55 }, 'open-crate': { files: IMP('Plank_medium'), gain: 0.5 }, 'open-car': { files: ['metalClick.ogg'], gain: 0.55 },
  'open-stash': { files: CLOTH, gain: 0.5 }, rustle: { files: CLOTH, gain: 0.45 }, bags: { files: CLOTH, gain: 0.5 }, drop: { files: ['dropLeather.ogg'], gain: 0.5 },
  'grip-iron': { files: IMP('Metal_light'), gain: 0.35 }, knock: { files: IMP('Wood_light'), gain: 0.5 }, rubble: { files: IMP('Mining'), gain: 0.6 },
  'blow-crowbar-metal': { files: IMP('Metal_heavy'), gain: 0.85, delay: 0.12 }, 'blow-crowbar-hard': { files: IMP('Plate_heavy'), gain: 0.75, delay: 0.12 }, 'blow-crowbar-soft': { files: IMP('Punch_heavy'), gain: 0.7, delay: 0.12 },
  'blow-knife-metal': { files: IMP('Metal_light'), gain: 0.6, delay: 0.1 }, 'blow-knife-hard': { files: n('knifeSlice', ['', 2]), gain: 0.6, delay: 0.1 }, 'blow-knife-soft': { files: n('knifeSlice', ['', 2]), gain: 0.45, delay: 0.1 },
};

const bufs = new Map<string, AudioBuffer>();
let started = false;

/** Every recording fetched once the audio's running. */
export function loadSamples(a: Audio) {
  if (started || !a.ready) return;
  started = true;
  for (const f of new Set(Object.values(SAMPLES).flatMap(g => g.files))) void a.load(`audio/sfx/${f}`).then(b => { if (b) bufs.set(f, b); });
}

/** How many recordings have loaded (for the checks). */
export const samplesLoaded = () => bufs.size;

/** Play a sound from its recordings if it has them and they've loaded, into `out` (the effects by default), `late` s
 *  from now, `k` times its own loudness; false if not (the synthesised one plays). */
export function playSample(a: Audio, id: string, out?: AudioNode, late = 0, k = 1): boolean {
  const g = SAMPLES[id];
  if (!g || !a.ready) return false;
  const ready = g.files.filter(f => bufs.has(f));
  if (!ready.length) return false;
  const ctx = a.ctx!, src = ctx.createBufferSource(), gain = ctx.createGain();
  src.buffer = bufs.get(ready[Math.floor(Math.random() * ready.length)])!;
  src.playbackRate.value = 0.93 + Math.random() * 0.14;
  gain.gain.value = g.gain * k;
  src.connect(gain).connect(out ?? a.bus.effects);
  src.start(ctx.currentTime + 0.005 + (g.delay ?? 0) + late);
  return true;
}
