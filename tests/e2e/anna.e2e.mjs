// M10-18 (U-104): Anna in the laptop's corner, drawn: each pose (idle, blink, wave, laugh, pout, blush) looks
// different, the moving ones switch between their frames like a gif, she blinks by herself while idle and waves as
// the laptop comes out; a screenshot of each pose (logs/anna-<pose>.png).
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=hideout&seed=1', 'anna');
  // (The map already seen with all he knows on it, so nothing new: its coming up with news has her laugh over the
  // wave, M10-40, M10-53.)
  await page.evaluate('(() => { const g = window.__cq.game; g.input.pitch = -0.55; window.__cq.runFrames(60); (g.state.known ??= {}).flat ??= g.state.time; g.state.mapAt = g.state.time; })()');
  await page.keyboard.press('Tab');
  const svg = () => page.evaluate(`document.querySelector('#laptop .lt-anna').innerHTML`);
  const first = await page.evaluate(`(() => { window.__cq.runFrames(3); return window.__cq.game.laptop.anna.now; })()`);
  if (first !== 'wave') fail('anna', `she didn't wave as it came out: ${first}`);
  await page.keyboard.press('KeyQ');
  await page.evaluate('window.__cq.runFrames(60)');
  const seen = {};
  for (const pose of ['idle', 'blink', 'wave', 'laugh', 'pout', 'blush']) {
    await page.evaluate(`(() => { window.__cq.game.laptop.anna.set('${pose}', 30); window.__cq.runFrames(1); })()`);
    const a = await svg();
    seen[pose] = a;
    await screenshot(page, `anna-${pose}`);
    if (pose !== 'blink') {
      // (Sampled in one go, longer than her slowest frame shows (idle's 1.4 s): the page's own frames, in real time,
      // run between calls and could land each sample on the same frame.)
      const frames = new Set(await page.evaluate(`(() => { const f = []; for (let i = 0; i < 10; i++) { window.__cq.runFrames(9); f.push(document.querySelector('#laptop .lt-anna').innerHTML); } return f; })()`));
      frames.add(a);
      if (frames.size < 2) fail('anna', `${pose} doesn't move`);
    }
  }
  if (new Set(Object.values(seen)).size !== 6) fail('anna', 'two poses look the same');
  // Idle, she blinks by herself.
  await page.evaluate(`window.__cq.game.laptop.anna.set('idle', 0)`);
  let blinked = false;
  for (let i = 0; i < 60 && !blinked; i++) blinked = await page.evaluate(`(() => { window.__cq.runFrames(6); return window.__cq.game.laptop.anna.now === 'blink'; })()`);
  if (!blinked) fail('anna', 'idle, she never blinked');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Tab');
  await page.close();
}
