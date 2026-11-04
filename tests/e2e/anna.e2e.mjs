// M10-18 (U-104): Anna in the laptop's corner, drawn: each pose (idle, blink, wave, laugh, pout, blush) looks
// different, the moving ones switch between their frames like a gif, she blinks by herself while idle and waves as
// the laptop comes out; a screenshot of each pose (logs/anna-<pose>.png).
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=hideout&seed=1', 'anna');
  await page.evaluate('(() => { window.__cq.game.input.pitch = -0.55; window.__cq.runFrames(60); })()');
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
      const frames = new Set([a]);
      for (let i = 0; i < 6; i++) frames.add(await page.evaluate(`(() => { window.__cq.runFrames(9); return document.querySelector('#laptop .lt-anna').innerHTML; })()`));
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
