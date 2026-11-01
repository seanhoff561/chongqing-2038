// M1-40, U-009: = pauses the game and shows the controls; the menu switches to the movement gym and jumps to an area.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=hideout&seed=1', 'pause');
  await page.evaluate('window.__cq.runFrames(5)');
  await page.keyboard.press('Escape');
  const shown = await page.evaluate(`getComputedStyle(document.getElementById('pause')).display !== 'none' && document.querySelector('#pause .pz-keys').textContent.includes('wall-run')`);
  if (!shown) fail('pause', '= did not open the pause menu with the controls');
  const t0 = await page.evaluate('window.__cq.game.ticks');
  await new Promise(r => setTimeout(r, 400));
  const t1 = await page.evaluate('window.__cq.game.ticks');
  if (t1 !== t0) fail('pause', `sim kept running while paused (${t0} -> ${t1})`);
  await screenshot(page, 'pause');
  // The settings (U-079): volume and sensitivity sliders, each action's key to rebind.
  const set = await page.evaluate(`[document.querySelectorAll('#pause input[data-set]').length, document.querySelectorAll('#pause button[data-bind]').length]`);
  if (set[0] < 6 || set[1] < 10) fail('pause', `settings: ${set[0]} sliders, ${set[1]} keys`);
  await page.click('#pause button[data-a="gym"]');
  // (The gym's areas a dropdown: U-079.)
  const gym = await page.evaluate(`[window.__cq.game.scenario.name, location.search, [...document.querySelectorAll('#pause .pz-tp option')].slice(1).map(o => o.textContent)]`);
  if (gym[0] !== 'gym' || !gym[1].includes('scenario=gym') || gym[2].length < 5) fail('pause', `gym switch: ${JSON.stringify(gym)}`);
  const i = gym[2].indexOf('bars over the pit');
  await page.select('#pause .pz-tp', String(i));
  await page.evaluate('window.__cq.runFrames(30)');
  const at = await page.evaluate(`(() => { const p = window.__cq.player().pos; return [document.getElementById('pause').style.display, Math.hypot(p.x + 41, p.z + 9.6)]; })()`);
  if (at[0] !== 'none' || !(at[1] < 1.5)) fail('pause', `area jump: ${JSON.stringify(at)}`);
  await page.close();
}
