// The one recorded sound kept (U-079): his hands taking hold of a ledge or a bar (Kenney's RPG Audio, CC0; CREDITS.md).
// Every other sound is synthesised (U-074). Till it's loaded, or if it can't be had, the synthesised grab plays.
import type { Audio } from './audio';

const GRAB = ['handleSmallLeather.ogg', 'handleSmallLeather2.ogg'];
/** Which sounds play from the recording, and how loud. */
const RECORDED: Record<string, number> = { grab: 0.4, grab2: 0.35 };
const bufs: AudioBuffer[] = [];
let started = false;

/** Play a sound from the recording if it's one of them and it's loaded; false if not. */
export function playRecorded(a: Audio, id: string): boolean {
  if (!(id in RECORDED) || !a.ready) return false;
  const ctx = a.ctx!;
  if (!started) {
    started = true;
    for (const f of GRAB) void fetch(`audio/sfx/${f}`).then(r => (r.ok ? r.arrayBuffer() : null)).then(b => b && ctx.decodeAudioData(b)).then(d => { if (d) bufs.push(d); }).catch(() => undefined);
  }
  if (!bufs.length) return false;
  const src = ctx.createBufferSource(), gain = ctx.createGain();
  src.buffer = bufs[Math.floor(Math.random() * bufs.length)];
  src.playbackRate.value = 0.94 + Math.random() * 0.12;
  gain.gain.value = RECORDED[id];
  src.connect(gain).connect(a.bus.effects);
  src.start(ctx.currentTime + 0.005);
  return true;
}
