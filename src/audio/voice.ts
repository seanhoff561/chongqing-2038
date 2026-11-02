// Spoken lines (M8-02): a line's recording, public/audio/vo/<id>.mp3, if there is one (the folder's index.json lists
// them: tools/make-voice writes both); else the browser's own Mandarin voice (zh-CN), if it has one; else nothing but
// its subtitle (always shown: hud.ts). Never waits on any of it: all of it is fetched in the background.
import type { Audio } from './audio';
import { lineById } from '../data/dialogue';

const clips = new Map<string, AudioBuffer>();
let recorded: Promise<Set<string>> | null = null;
/** The lines that have recordings. */
const index = () => (recorded ??= fetch('./audio/vo/index.json').then(r => (r.ok ? r.json() : [])).then((ids: string[]) => new Set(ids)).catch(() => new Set<string>()));

/** The browser's Mandarin voice, if it has one. */
function zhVoice(): SpeechSynthesisVoice | null {
  const s = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
  return s?.getVoices().find(v => /^zh(-CN)?/i.test(v.lang)) ?? null;
}

/** Say a line, by the best way there is. */
export function speak(a: Audio, id: string) {
  const line = lineById.get(id);
  if (!line || !a.ready) return;
  const play = (buf: AudioBuffer) => { const src = a.ctx!.createBufferSource(); src.buffer = buf; src.connect(a.bus.voice); src.start(); };
  const synth = () => {
    const v = zhVoice();
    if (!v) return;
    const u = new SpeechSynthesisUtterance(line.zh);
    u.voice = v; u.lang = v.lang; u.rate = 0.95;
    // (Outside the mixer: set to the master and voice volumes as they are now, M8-07.)
    u.volume = Math.min(1, a.volumes.master * a.volumes.voice);
    speechSynthesis.speak(u);
  };
  const clip = clips.get(id);
  if (clip) { play(clip); return; }
  index().then(have => {
    if (!have.has(id)) { synth(); return; }
    fetch(`./audio/vo/${id}.mp3`).then(r => r.arrayBuffer()).then(b => a.ctx!.decodeAudioData(b)).then(buf => { clips.set(id, buf); play(buf); }).catch(synth);
  });
}
