// M10-56 (U-105): Resume closes the settings and takes the mouse back; so does closing the backpack; the laptop's
// held out low in front of him with no arms, going with his body, not his look: looking ahead it's low in the view,
// looking down at it it's in front of him, looking up it's gone; sat at it he comes to look straight ahead
// (logs/heldlow.png).
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=hideout&seed=1', 'resume');
  await page.evaluate(`(() => { const g = window.__cq.game; window.__caps = 0; const c = g.input.capture.bind(g.input); g.input.capture = () => { window.__caps++; c(); }; window.__cq.runFrames(60); })()`);
  const caps = () => page.evaluate('(() => { window.__cq.runFrames(3); return window.__caps; })()');
  await page.keyboard.press('Escape');
  await page.evaluate('window.__cq.runFrames(3)');
  const c0 = await caps();
  await page.click('#settings [data-a="resume"]');
  const r = await page.evaluate('(() => { window.__cq.runFrames(3); return { open: window.__cq.game.settings.open, caps: window.__caps }; })()');
  if (r.open || !(r.caps > c0)) fail('resume', `Resume: ${JSON.stringify(r)} (before ${c0})`);
  await page.keyboard.press('AltLeft');
  await page.evaluate('window.__cq.runFrames(3)');
  const c1 = await caps();
  await page.keyboard.press('AltLeft');
  if (!((await caps()) > c1)) fail('resume', 'closing the backpack did not take the mouse back');
  // The laptop held out low, no arms, looked at three ways.
  const look = pitch => page.evaluate(`(() => { const g = window.__cq.game; g.input.pitch = ${pitch}; window.__cq.runFrames(40); const el = document.getElementById('laptop'), r = el.getBoundingClientRect();
    return { shown: el.style.display !== 'none', mid: (r.top + r.bottom) / 2 / innerHeight, arms: g.hands.group.visible }; })()`);
  await page.keyboard.press('Tab');
  const ahead = await look(0), down = await look(-0.55);
  await screenshot(page, 'heldlow');
  const above = await look(0.9);
  if (ahead.arms || down.arms) fail('resume', 'arms shown with the laptop out');
  if (!(ahead.mid > 0.75)) fail('resume', `looking ahead, the laptop's not low in the view: ${JSON.stringify(ahead)}`);
  if (!down.shown || Math.abs(down.mid - 0.5) > 0.15) fail('resume', `looking down at it, it's not in front of him: ${JSON.stringify(down)}`);
  if (above.shown) fail('resume', `looking up, the laptop's page still shows: ${JSON.stringify(above)}`);
  await look(-0.55);
  await page.keyboard.press('KeyQ');
  const pitch = await page.evaluate('(() => { window.__cq.runFrames(90); return window.__cq.game.input.pitch; })()');
  if (Math.abs(pitch) > 0.03) fail('resume', `sitting he doesn't look straight ahead: pitch ${pitch}`);
  await page.keyboard.press('KeyQ');
  await page.keyboard.press('Tab');
  await page.close();
}
