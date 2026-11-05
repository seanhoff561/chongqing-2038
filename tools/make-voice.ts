// Every spoken line to an mp3 (M8-03), with a TTS of the director's choice, run locally:
//   npx vite-node tools/make-voice.ts -- --dry-run
//   npx vite-node tools/make-voice.ts -- --cmd "my-tts --voice {voice} --text {text} --out {out}" [--speaker anna]
// Each speaker has a distinct voice (VOICES: names any TTS can map; the defaults are Kokoro-82M v1.1-zh voices, Anna's
// the street speakers' own, U-104); --speaker makes only that speaker's lines; lines already recorded are kept (delete
// an mp3 to make it again). {text} is the line's Chinese, {voice} the speaker's voice, {out} the mp3's path.
// The lines go to public/audio/vo/<id>.mp3 and public/audio/vo/index.json lists them, which the game reads (voice.ts).
import fs from 'fs';
import { execSync } from 'child_process';
import { SPOKEN } from '../src/data/dialogue';

/** Each speaker's voice. */
export const VOICES: Record<string, string> = { anna: 'zf_001', liwei: 'zm_010', liguorong: 'zm_029', xiaoyu: 'zf_017', none: '' };
const OUT = 'public/audio/vo';

/** Every line to be spoken, its voice and where its mp3 goes (lines with no speaker, a caption, are skipped). */
export function plan(): { id: string; speaker: string; voice: string; text: string; out: string }[] {
  return SPOKEN.filter(l => VOICES[l.speaker]).map(l => ({ id: l.id, speaker: l.speaker, voice: VOICES[l.speaker], text: l.zh, out: `${OUT}/${l.id}.mp3` }));
}

const quote = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

// (Run, not imported by the tests.)
if (!process.env.VITEST) {
  const args = process.argv.slice(2), dry = args.includes('--dry-run'), cmd = args[args.indexOf('--cmd') + 1];
  const todo = plan();
  if (dry || !args.includes('--cmd')) {
    for (const p of todo) console.log(`${p.id}\t${p.speaker}\t${p.voice}\t${p.text}`);
    console.log(`${todo.length} lines${dry ? '' : ' (dry run: pass --cmd "<tts command with {voice} {text} {out}>" to make them)'}`);
  } else {
    fs.mkdirSync(OUT, { recursive: true });
    const only = args.includes('--speaker') ? args[args.indexOf('--speaker') + 1] : '', idx = `${OUT}/index.json`;
    const done = new Set<string>();
    for (const p of todo) {
      if (fs.existsSync(p.out)) { done.add(p.id); continue; }
      if (only && p.speaker !== only) continue;
      execSync(cmd.replace('{voice}', quote(p.voice)).replace('{text}', quote(p.text)).replace('{out}', quote(p.out)), { stdio: 'inherit' });
      if (fs.existsSync(p.out)) done.add(p.id);
    }
    fs.writeFileSync(idx, JSON.stringify([...done].sort()) + '\n');
    console.log(`${done.size} of ${todo.length} lines recorded`);
  }
}
