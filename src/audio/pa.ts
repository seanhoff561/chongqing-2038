// The street speakers' voice (M4-28, U-053): a chime that rings down the streets and comes back off the blocks,
// fainter each time, then the announcement in a calm woman's Mandarin: the browser's own speech, a zh-CN voice (a
// woman's where there's a choice). Quieter the farther the speaker, dull indoors. With no Chinese voice on the
// system, the chime and the subtitle alone.
import type { Audio } from './audio';

/** The chime's echoes off the blocks (s after it), how near a speaker it's heard (m), and how long before the words. */
const CHIME = { echoes: [0, 0.34, 0.75, 1.2], hear: 90, words: 1.9 };

let voice: SpeechSynthesisVoice | null = null;
function pick(): SpeechSynthesisVoice | null {
  const zh = speechSynthesis.getVoices().filter(v => /^zh[-_](CN|Hans)/i.test(v.lang) || v.lang.toLowerCase() === 'zh');
  return zh.find(v => /xiaoxiao|huihui|xiaoyi|tingting|ting-ting|yaoyao|meijia|female|女/i.test(v.name)) ?? zh[0] ?? null;
}

/** An announcement from a speaker `dist` m off. */
export function announce(a: Audio, zh: string, dist: number, indoors: boolean) {
  if (!a.ready) return;
  const loud = Math.max(0, 1 - dist / CHIME.hear) * (indoors ? 0.35 : 1);
  if (loud < 0.02) return;
  const t = a.ctx!.currentTime + 0.05;
  // Two soft falling bell tones, and their echoes.
  CHIME.echoes.forEach((e, k) => {
    const g = 0.06 * loud * 0.5 ** k;
    a.tone(t + e, 1.2, g, 784, 782, 'sine', a.bus.voice);
    a.tone(t + e + 0.55, 1.6, g, 587, 586, 'sine', a.bus.voice);
  });
  if (typeof speechSynthesis === 'undefined' || !(voice ??= pick())) return;
  const u = new SpeechSynthesisUtterance(zh);
  u.voice = voice; u.lang = voice.lang; u.rate = 0.82; u.pitch = 1.05;
  u.volume = Math.min(1, loud * a.volumes.voice * a.volumes.master);
  setTimeout(() => { if (a.master.gain.value > 0) { speechSynthesis.cancel(); speechSynthesis.speak(u); } }, CHIME.words * 1000);
}
