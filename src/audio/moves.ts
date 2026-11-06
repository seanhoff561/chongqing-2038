// Movement sound cues (U-004): every parkour action has one fixed, recognisable sound.
import type { Audio } from './audio';
import { playRecorded } from './samples';

type Play = (a: Audio, t: number) => void;

/** A short breathy exhale ("hup"). */
const breath = (a: Audio, t: number, gain: number, dur = 0.16, f = 900) => a.noise(t, dur, gain, 'bandpass', f, 1.4, f * 0.7);

export const MOVE_SOUNDS: Record<string, Play> = {
  // A fire extinguisher bursting into a cloud; a firecracker (M5-19).
  hiss: (a, t) => { a.noise(t, 0.08, 0.35, 'highpass', 1500); a.noise(t + 0.05, 1.6, 0.18, 'bandpass', 3000, 0.6, 1200); },
  crack: (a, t) => { a.noise(t, 0.03, 0.5, 'highpass', 2000); a.noise(t + 0.09, 0.025, 0.35, 'highpass', 2500); a.tone(t, 0.04, 0.2, 400, 120, 'square'); },
  // Drone boats on the river (M6-27): a sonar ping, then engines whining in.
  boats: (a, t) => { a.tone(t, 0.25, 0.12, 1800, 1800, 'sine'); a.tone(t + 0.6, 2.4, 0.08, 140, 190, 'sawtooth'); a.noise(t + 0.6, 2.4, 0.06, 'bandpass', 400, 1, 600); },
  // The patrol boat's diesel (M7-08): the starter grinding and catching; its throb, half a second at a time while it
  // runs; dying away; the starter's dead click on a flat battery.
  // The cableway cabin's carriage running over the track ropes (M7-05): its sheaves' rolling rumble, half a second at a time.
  cabin: (a, t) => { a.noise(t, 0.55, 0.06, 'lowpass', 180); a.tone(t, 0.5, 0.04, 62, 58, 'triangle'); },
  // The wind rising over The Crystal's glass before a gust (M6-18): a roar swelling and breaking.
  gust: (a, t) => { a.noise(t, 1.6, 0.16, 'bandpass', 420, 0.6, 1300); a.noise(t + 0.7, 1.4, 0.12, 'lowpass', 320); },
  'engine-start': (a, t) => { a.tone(t, 0.9, 0.14, 55, 75, 'sawtooth'); a.noise(t, 0.9, 0.08, 'bandpass', 300, 1, 400); a.tone(t + 0.9, 0.6, 0.2, 45, 38, 'sawtooth'); },
  engine: (a, t) => { for (let k = 0; k < 6; k++) a.tone(t + k * 0.085, 0.07, 0.1, 42, 36, 'sawtooth'); a.noise(t, 0.52, 0.04, 'lowpass', 260); },
  'engine-stop': (a, t) => { a.tone(t, 1.2, 0.14, 40, 18, 'sawtooth'); a.noise(t, 0.8, 0.04, 'lowpass', 200); },
  'engine-click': (a, t) => { a.noise(t, 0.03, 0.3, 'highpass', 1800); a.tone(t, 0.05, 0.1, 160, 90, 'square'); },
  // The EMP's pulse (M5-14): a sharp electric crack and a falling whine.
  zap: (a, t) => { a.noise(t, 0.06, 0.4, 'highpass', 3000); a.tone(t, 0.5, 0.12, 2400, 180, 'sawtooth'); a.tone(t + 0.02, 0.3, 0.08, 60, 40, 'square'); },
  'step-crawl': (a, t) => a.noise(t, 0.16, 0.04, 'bandpass', 900, 0.8, 650),
  'step-crouch': (a, t) => a.noise(t, 0.07, 0.08, 'lowpass', 900),
  'step-jog': (a, t) => { a.noise(t, 0.08, 0.16, 'lowpass', 1100); a.tone(t, 0.06, 0.06, 90, 60); },
  'step-sprint': (a, t) => { a.noise(t, 0.09, 0.26, 'lowpass', 1600); a.tone(t, 0.07, 0.1, 110, 60); },
  jump: (a, t) => { a.noise(t, 0.07, 0.22, 'lowpass', 1500); breath(a, t + 0.02, 0.07); },
  land: (a, t) => { a.tone(t, 0.12, 0.25, 85, 45); a.noise(t, 0.1, 0.18, 'lowpass', 700); },
  'land-hard': (a, t) => { a.tone(t, 0.2, 0.45, 70, 35); a.noise(t, 0.16, 0.35, 'lowpass', 500); breath(a, t + 0.05, 0.12, 0.22, 600); },
  roll: (a, t) => { a.tone(t, 0.1, 0.2, 80, 45); a.noise(t + 0.03, 0.4, 0.16, 'bandpass', 1300, 0.7, 500); },
  vault: (a, t) => { a.noise(t, 0.04, 0.2, 'lowpass', 1200); a.noise(t + 0.05, 0.25, 0.08, 'bandpass', 600, 0.6, 1800); },
  hop: (a, t) => { a.noise(t, 0.04, 0.18, 'lowpass', 1200); a.noise(t + 0.06, 0.12, 0.12, 'lowpass', 900); },
  slide: (a, t) => a.noise(t, 0.85, 0.22, 'bandpass', 1800, 0.5, 400),
  // The wall kick: a hard rubber thud, always the same (no bright snap: U-100).
  wallkick: (a, t) => { a.tone(t, 0.09, 0.5, 160, 70, 'triangle'); a.noise(t, 0.035, 0.2, 'lowpass', 1000); breath(a, t + 0.03, 0.09, 0.14, 1100); },
  wallrun: (a, t) => { a.tone(t, 0.08, 0.3, 150, 80, 'triangle'); a.noise(t, 0.05, 0.14, 'lowpass', 900); },
  wallstep: (a, t) => { a.tone(t, 0.06, 0.2, 140, 90, 'triangle'); a.noise(t, 0.04, 0.1, 'lowpass', 800); },
  // Hands: a dry slap on the hold; two hands slap twice.
  // Braced across a gap (M3-78): shoulders and soles scuffing the walls.
  brace: (a, t) => { a.noise(t, 0.12, 0.12, 'bandpass', 900, 0.8, 600); a.noise(t + 0.1, 0.08, 0.08, 'bandpass', 1400, 1, 900); },
  grab: (a, t) => { a.noise(t, 0.05, 0.35, 'bandpass', 2600, 1.2); a.tone(t, 0.04, 0.08, 400, 250); },
  grab2: (a, t) => { a.noise(t, 0.05, 0.35, 'bandpass', 2600, 1.2); a.noise(t + 0.06, 0.05, 0.3, 'bandpass', 2300, 1.2); },
  // Sick: he retches, a low heave and a choke (U-104: heard, not read).
  retch: (a, t) => { breath(a, t, 0.25, 0.35, 500); a.noise(t + 0.2, 0.5, 0.2, 'lowpass', 600); a.tone(t + 0.2, 0.4, 0.08, 140, 90, 'sawtooth'); },
  slip: (a, t) => { a.noise(t, 0.3, 0.25, 'bandpass', 3500, 1.5, 900); breath(a, t + 0.05, 0.14, 0.2, 1300); },
  release: (a, t) => a.noise(t, 0.12, 0.06, 'bandpass', 1200, 0.8, 600),
  pullover: (a, t) => { breath(a, t, 0.12, 0.3, 500); a.noise(t + 0.15, 0.3, 0.12, 'bandpass', 900, 0.6, 400); },
  // Palm flat on the wall: a soft pat and a breath in.
  cling: (a, t) => { a.noise(t, 0.06, 0.18, 'lowpass', 1400); a.noise(t + 0.02, 0.18, 0.05, 'bandpass', 700, 1, 1100); },
  pump: (a, t) => { a.noise(t, 0.2, 0.06, 'bandpass', 500, 0.7, 900); a.tone(t, 0.12, 0.05, 220, 180, 'triangle'); },
  // The headlamp's switch: a small plastic click.
  click: (a, t) => { a.noise(t, 0.015, 0.25, 'highpass', 4000); a.tone(t, 0.02, 0.06, 2400, 1800, 'square'); },
  // Doors and windows (M3-36): a hinge's creak, a slam, a lock wrenched out, glass going.
  'door-open': (a, t) => { a.noise(t, 0.3, 0.08, 'bandpass', 700, 3, 350); a.tone(t + 0.04, 0.28, 0.04, 240, 190, 'sawtooth'); },
  'door-close': (a, t) => { a.tone(t, 0.14, 0.3, 95, 55); a.noise(t, 0.1, 0.2, 'lowpass', 500); },
  force: (a, t) => { a.tone(t, 0.18, 0.5, 130, 45); a.noise(t, 0.25, 0.4, 'bandpass', 1100, 1, 300); a.noise(t + 0.2, 0.15, 0.3, 'highpass', 2500); },
  // The start hideout's grate (M3-72): iron bolts shot or drawn and the grate grinding over its frame; a lighter
  // clang lifting or lowering it; bin bags dragged; something let fall.
  // The pistol's magazine out and in, and the slide (M4-21).
  reload: (a, t) => { a.tone(t, 0.05, 0.12, 900, 700, 'square'); a.noise(t + 0.55, 0.06, 0.2, 'highpass', 2500); a.tone(t + 1.05, 0.07, 0.18, 600, 400, 'square'); a.noise(t + 1.1, 0.05, 0.22, 'highpass', 3000); },
  bags: (a, t) => { a.noise(t, 0.6, 0.12, 'bandpass', 1400, 0.6, 600); a.noise(t + 0.5, 0.5, 0.1, 'bandpass', 1100, 0.6, 500); },
  // The sounds of things as he starts on them (M4-50, U-051): a drawer sliding out on its runners, a cabinet's hinge, a
  // steel locker's clang, a crate's lid scraping up, a fridge's seal letting go, a car boot's catch, a bag's rustle;
  // a door's latch, a grate's cold iron under his hands, a first blow at a window, stones shifting, springs, a knock.
  'open-drawer': (a, t) => { a.noise(t, 0.22, 0.14, 'bandpass', 1400, 1.5, 900); a.tone(t + 0.2, 0.05, 0.12, 300, 180, 'triangle'); },
  // A tap turned (M4-96), and the water running from it.
  tap: (a, t) => { a.tone(t, 0.09, 0.08, 1400, 1700, 'square'); a.noise(t, 0.05, 0.08, 'bandpass', 3000, 3); },
  'water-run': (a, t) => { a.noise(t + 0.1, 1.4, 0.12, 'bandpass', 1800, 0.8, 1300); a.noise(t + 0.1, 1.4, 0.06, 'highpass', 4500, 0.7); },
  'open-wardrobe': (a, t) => { a.noise(t, 0.05, 0.12, 'highpass', 2200); a.noise(t + 0.04, 0.55, 0.07, 'bandpass', 700, 6, 450); a.tone(t + 0.06, 0.5, 0.035, 330, 240, 'sawtooth'); },
  'open-cabinet': (a, t) => { a.noise(t, 0.04, 0.12, 'highpass', 2500); a.noise(t + 0.03, 0.4, 0.06, 'bandpass', 900, 6, 600); a.tone(t + 0.05, 0.35, 0.03, 420, 300, 'sawtooth'); },
  'open-crate': (a, t) => { a.noise(t, 0.35, 0.16, 'bandpass', 700, 2, 1200); a.tone(t + 0.3, 0.1, 0.2, 130, 70, 'triangle'); },
  'open-fridge': (a, t) => { a.noise(t, 0.08, 0.1, 'lowpass', 1200); a.tone(t, 0.06, 0.12, 180, 110); a.noise(t + 0.06, 0.3, 0.03, 'bandpass', 3000, 1, 2000); },
  'open-car': (a, t) => { a.tone(t, 0.05, 0.25, 700, 400, 'square'); a.noise(t, 0.05, 0.25, 'highpass', 2500); a.noise(t + 0.08, 0.5, 0.08, 'bandpass', 500, 3, 300); a.tone(t + 0.55, 0.12, 0.2, 110, 60); },
  'open-stash': (a, t) => { for (let i = 0; i < 4; i++) a.noise(t + i * 0.07, 0.12, 0.09, 'bandpass', 3000 + i * 400, 1.2, 1800); },
  rustle: (a, t) => { for (let i = 0; i < 3; i++) a.noise(t + i * 0.08, 0.1, 0.08, 'bandpass', 3400 - i * 300, 1.2, 2000); },
  latch: (a, t) => { a.tone(t, 0.03, 0.18, 1600, 900, 'square'); a.noise(t, 0.03, 0.15, 'highpass', 3000); a.tone(t + 0.06, 0.03, 0.1, 1200, 800, 'square'); },
  'blow-glass': (a, t) => { a.tone(t, 0.12, 0.3, 160, 80); a.tone(t, 0.2, 0.05, 2600, 2500); },
  rubble: (a, t) => { for (let i = 0; i < 5; i++) a.noise(t + i * 0.09 + (i % 2) * 0.03, 0.12, 0.16, 'bandpass', 500 + i * 150, 2, 300); a.tone(t, 0.1, 0.2, 900, 850, 'triangle'); },
  springs: (a, t) => { a.noise(t, 0.2, 0.08, 'lowpass', 700); for (let i = 0; i < 3; i++) a.tone(t + i * 0.06, 0.12, 0.03, 900 + i * 140, 820, 'sawtooth'); },
  knock: (a, t) => { for (let i = 0; i < 2; i++) { a.tone(t + i * 0.16, 0.07, 0.25, 260, 140, 'triangle'); a.noise(t + i * 0.16, 0.03, 0.1, 'bandpass', 1500, 2); } },
  glass: (a, t) => { a.noise(t, 0.5, 0.45, 'highpass', 3500, 0.7, 7000); for (let i = 0; i < 5; i++) a.tone(t + 0.05 + i * 0.04, 0.06, 0.08, 3800 + i * 600, 3000, 'sine'); },
  // A rocket's launch and roar (M4-65).
  rocket: (a, t) => { a.noise(t, 0.12, 0.7, 'highpass', 900); a.noise(t + 0.05, 1.2, 0.35, 'bandpass', 700, 0.6, 300); a.tone(t, 0.3, 0.3, 90, 40); },
  // Eating and drinking (U-058): a wrapper's rustle and chewing, a few bites; a bottle's gulps, swallowed.
  eat: (a, t) => { a.noise(t, 0.25, 0.08, 'bandpass', 3000, 1.2, 4500); for (let i = 0; i < 5; i++) { a.noise(t + 0.35 + i * 0.32, 0.12, 0.16, 'bandpass', 1300, 1.5, 700); a.tone(t + 0.36 + i * 0.32, 0.08, 0.05, 140, 90); } },
  drink: (a, t) => { for (let i = 0; i < 4; i++) { a.tone(t + 0.15 + i * 0.42, 0.13, 0.22, 230, 120); a.noise(t + 0.15 + i * 0.42, 0.1, 0.07, 'bandpass', 800, 2, 400); } a.noise(t + 1.9, 0.25, 0.06, 'lowpass', 900); },
  // Blows (M4-60): the swing's whoosh, then what it meets a beat later: a crowbar's clang off metal, knock off concrete,
  // thud off wood; a knife's ring, scrape, or thunk.
  whoosh: (a, t) => a.noise(t, 0.24, 0.13, 'bandpass', 600, 0.9, 2400),
  'blow-crowbar-metal': (a, t) => { a.tone(t + 0.12, 0.7, 0.32, 1240, 1190, 'triangle'); a.tone(t + 0.12, 0.55, 0.16, 2950, 2900); a.noise(t + 0.12, 0.05, 0.4, 'highpass', 3000); },
  'blow-crowbar-hard': (a, t) => { a.tone(t + 0.12, 0.12, 0.45, 190, 90); a.noise(t + 0.12, 0.16, 0.35, 'bandpass', 1500, 1, 600); a.tone(t + 0.12, 0.2, 0.08, 1700, 1600, 'triangle'); },
  'blow-crowbar-soft': (a, t) => { a.tone(t + 0.12, 0.16, 0.45, 120, 65); a.noise(t + 0.12, 0.12, 0.3, 'lowpass', 600); },
  'blow-knife-metal': (a, t) => { a.tone(t + 0.1, 0.3, 0.14, 3300, 3150); a.noise(t + 0.1, 0.12, 0.2, 'highpass', 4000); },
  'blow-knife-hard': (a, t) => a.noise(t + 0.1, 0.26, 0.22, 'bandpass', 3600, 2, 2400),
  'blow-knife-soft': (a, t) => { a.tone(t + 0.1, 0.07, 0.25, 320, 150); a.noise(t + 0.1, 0.06, 0.15, 'lowpass', 1200); },
  // Live busbars humming (M6-15): a low 100 Hz drone, loud, a warning.
  hum: (a, t) => { a.tone(t, 1.4, 0.16, 100, 100, 'sawtooth'); a.tone(t, 1.4, 0.08, 200, 200, 'sine'); },
  // His stomach growling, hungry (M8-08): a low gurgling rumble.
  stomach: (a, t) => { a.tone(t, 0.9, 0.12, 95, 70, 'sawtooth'); a.noise(t + 0.1, 0.7, 0.08, 'bandpass', 180, 2, 120); a.tone(t + 0.5, 0.5, 0.08, 120, 85, 'triangle'); },
  dyno: (a, t) => { a.tone(t, 0.1, 0.35, 130, 60, 'triangle'); breath(a, t, 0.14, 0.22, 800); },
};

export function playMove(a: Audio, id: string) {
  const f = MOVE_SOUNDS[id];
  if (!f || !a.ready) return;
  // (The grab as recorded, the one recording kept: U-079.)
  if (playRecorded(a, id)) return;
  f(a, a.ctx!.currentTime + 0.005);
}

/** A machine's beep (M4-07, U-038): a camera's, short and high, from where it hangs. */
export function beep(a: Audio, gain: number, out?: AudioNode) {
  if (!a.ready || gain < 0.005) return;
  const t = a.ctx!.currentTime + 0.005;
  a.tone(t, 0.05, gain, 3100, 3100, 'square', out);
  a.tone(t + 0.09, 0.05, gain * 0.8, 3100, 3100, 'square', out);
}

/** A walker's footfall (M4-33), where it lands: a humanoid's hard rubber pad; a quadruped's soft padded paw and a faint
 *  tick of its servos (U-065); the heavy's thud; the spider's sharp tap and hydraulic hiss; a colossus's boom, felt as much as heard. */
export function footfall(a: Audio, kind: string, out: AudioNode, gain = 0.5) {
  if (!a.ready) return;
  const t = a.ctx!.currentTime + 0.005, g = gain;
  if (kind === 'humanoid') { a.tone(t, 0.08, 0.3 * g, 110, 60, 'sine', out); a.noise(t, 0.05, 0.18 * g, 'bandpass', 900, 1.2, undefined, out); }
  else if (kind === 'quadruped') { a.tone(t, 0.07, 0.12 * g, 130 + Math.random() * 40, 80, 'sine', out); a.noise(t, 0.06, 0.05 * g, 'lowpass', 600 + Math.random() * 300, 1, undefined, out); }
  else if (kind === 'heavy') { a.tone(t, 0.3, 0.7 * g, 70, 35, 'sine', out); a.noise(t, 0.2, 0.3 * g, 'lowpass', 400, 1, undefined, out); a.tone(t + 0.05, 0.25, 0.12 * g, 300, 450, 'sawtooth', out); }
  else if (kind === 'spider') { a.noise(t, 0.03, 0.4 * g, 'highpass', 2500, 1, undefined, out); a.tone(t, 0.06, 0.25 * g, 900, 500, 'triangle', out); a.noise(t + 0.04, 0.35, 0.12 * g, 'bandpass', 5000, 2, 3000, out); }
  else { a.tone(t, 0.9, 0.9 * g, 48, 24, 'sine', out); a.noise(t, 0.6, 0.45 * g, 'lowpass', 220, 1, 90, out); a.tone(t + 0.1, 0.8, 0.1 * g, 180, 120, 'sawtooth', out); }
}

/** A humanoid calling the others (M4-10): a burst of radio static round a clipped two-tone, louder nearer. */
export function radio(a: Audio, gain: number) {
  if (!a.ready || gain < 0.005) return;
  const t = a.ctx!.currentTime + 0.005;
  a.noise(t, 0.35, gain * 0.5, 'bandpass', 1800, 3);
  a.tone(t + 0.05, 0.12, gain, 880, 880, 'square');
  a.tone(t + 0.19, 0.12, gain, 660, 660, 'square');
}

/** His pistol fired: a hard crack and its thump. */
export function gunshot(a: Audio, gain: number, quiet = false) {
  if (!a.ready || gain < 0.005) return;
  const t = a.ctx!.currentTime + 0.005;
  // Suppressed (U-058): a muffled crack and the slide's clack, not the bang.
  if (quiet) { a.noise(t, 0.05, gain * 0.35, 'bandpass', 1800, 1.2); a.tone(t, 0.06, gain * 0.25, 180, 90, 'sine'); a.noise(t + 0.03, 0.03, gain * 0.2, 'highpass', 3500); return; }
  a.noise(t, 0.06, gain, 'highpass', 1200, 0.7);
  a.tone(t, 0.12, gain * 0.8, 140, 50, 'sine');
}
