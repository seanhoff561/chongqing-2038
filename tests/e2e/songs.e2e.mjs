// M10-17 (U-104): the Songs app plays his own songs, the city's own music silent while they do (M10-66, U-107). In the
// browser he picks a folder of songs: two picked, Play plays one of them, its name shown; Skip plays the other; Pause stops it (logs/songs.png).
import fs from 'fs';
import os from 'os';
import path from 'path';

/** A WAV of a quiet tone, two minutes long (a loaded machine can take tens of seconds between Play and Skip, and a
 *  song ending on its own moves on by itself). */
function wav(file, hz) {
  const rate = 8000, n = rate * 120, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin((2 * Math.PI * hz * i) / rate) * 3000), 44 + i * 2);
  fs.writeFileSync(file, b);
}

export default async function ({ open, fail, screenshot }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cq-songs-')), a = path.join(dir, 'first song.wav'), b = path.join(dir, 'second song.wav');
  wav(a, 330); wav(b, 440);
  const page = await open('?scenario=hideout&seed=1', 'songs');
  await page.evaluate('(() => { window.__cq.game.input.pitch = -0.55; window.__cq.runFrames(60); })()');
  if (!(await page.evaluate('!!window.__cq.game.sound.music'))) fail('songs', 'the city has no music of its own');
  await page.keyboard.press('Tab');
  await page.evaluate('window.__cq.runFrames(30)');
  await page.keyboard.press('KeyQ');
  await page.evaluate('window.__cq.runFrames(40)');
  await page.waitForFunction('!document.pointerLockElement', { timeout: 3000 }).catch(() => {});
  const at = sel => page.evaluate(`(() => { const b = document.querySelector('${sel}')?.getBoundingClientRect(); return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null; })()`);
  const click = async sel => { await page.waitForSelector(sel, { timeout: 3000 }).catch(() => {}); const r = await at(sel); if (!r) { fail('songs', `no ${sel}`); return; } await page.mouse.click(r.x, r.y); await page.evaluate('window.__cq.runFrames(3)'); };
  const W = '#laptop .lt-win.front .lt-content';
  await click('#laptop .lt-task [data-app="songs"]');
  const input = await page.$(`${W} input[data-songs]`);
  if (!input) { fail('songs', 'no folder to pick'); await page.close(); return; }
  // (Puppeteer can't answer a folder dialog: the two files given to the same input as a plain pick.)
  await input.evaluate(el => el.removeAttribute('webkitdirectory'));
  await input.uploadFile(a, b);
  const st = () => page.evaluate(`(() => { window.__cq.runFrames(3); const S = window.__cq.game.songs; return { n: S.list.length, playing: S.playing, cur: S.current()?.name, started: S.started, paused: S.el.paused, city: window.__cq.game.sound.music.playing, shown: document.querySelector('${W} [data-k="song"]')?.textContent ?? '' }; })()`);
  // (What the song player did, to tell why a skip went wrong.)
  await page.evaluate(`(() => { const S = window.__cq.game.songs, ev = window.__songEv = []; for (const k of ['error', 'ended', 'abort', 'emptied']) S.el.addEventListener(k, () => ev.push(k + (k === 'error' ? ':' + S.el.error?.code + ' ' + S.el.error?.message : '') + '@' + S.started + ' t' + Math.round(performance.now()) + ' ct' + S.el.currentTime.toFixed(1) + ' d' + S.el.duration)); const sk = S.skip.bind(S); S.skip = () => { ev.push('skip@' + S.started + ' t' + Math.round(performance.now()) + ' ' + new Error().stack.split('\\n')[2]?.trim()); sk(); }; })()`);
  let s = await st();
  if (s.n !== 2) fail('songs', `picked: ${JSON.stringify(s)}`);
  await click(`${W} [data-act="play"]`);
  await page.evaluate('new Promise(r => setTimeout(r, 600))');
  s = await st();
  const first = s.cur;
  if (!s.playing || s.paused || s.city || !/song\.wav$/.test(first ?? '') || !s.shown.includes(first)) fail('songs', `Play: ${JSON.stringify(s)}`);
  await screenshot(page, 'songs');
  await click(`${W} [data-act="skip"]`);
  await page.evaluate('new Promise(r => setTimeout(r, 400))');
  s = await st();
  if (!s.playing || s.cur === first || !/song\.wav$/.test(s.cur ?? '') || s.started !== 2 || !s.shown.includes(s.cur)) fail('songs', `Skip: ${JSON.stringify(s)} after ${first}; ${await page.evaluate('JSON.stringify(window.__songEv)')}`);
  await click(`${W} [data-act="pause"]`);
  s = await st();
  if (s.playing || !s.paused) fail('songs', `Pause: ${JSON.stringify(s)}`);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Tab');
  await page.close();
  fs.rmSync(dir, { recursive: true, force: true });
}
