// M8-03: tools/make-voice, dry: it lists every spoken line with its speaker's voice (each speaker a voice of their
// own), and runs as the director would run it.
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { plan, VOICES } from '../../tools/make-voice';
import { lineById } from '../../src/data/dialogue';

describe('tools/make-voice (M8-03)', () => {
  it('lists every line with its voice, dry', () => {
    const p = plan();
    expect(p.length).toBeGreaterThan(40);
    for (const x of p) { expect(lineById.get(x.id)?.zh).toBe(x.text); expect(x.voice).toBe(VOICES[x.speaker]); expect(x.out).toBe(`public/audio/vo/${x.id}.mp3`); }
    const speakers = [...new Set(p.map(x => x.speaker))], voices = new Set(speakers.map(s => VOICES[s]));
    expect(voices.size).toBe(speakers.length);
    const out = execSync('npx vite-node tools/make-voice.ts -- --dry-run', { encoding: 'utf8', env: { ...process.env, VITEST: '' } });
    expect(out).toContain(`${p.length} lines`);
    expect(out).toContain('vm-01\tliguorong\tzm_029');
  });
});
