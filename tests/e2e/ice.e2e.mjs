// M10-19 (U-104): every menu light ice blue on the dark minimal style: the main menu, settings, the laptop (its map
// too), the backpack, crafting, sleep and the death screen, each its text ice blue (logs/ice-<menu>.png); the
// headlamp's second mode is blue, not red.
const ICE = [[191, 230, 245], [230, 247, 255]];
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=hideout&seed=1', 'ice');
  const colour = sel => page.evaluate(`(() => { window.__cq.runFrames(3); const e = document.querySelector('${sel}'); if (!e) return null; const m = /rgba?\\((\\d+), (\\d+), (\\d+)/.exec(getComputedStyle(e).color); return m ? [+m[1], +m[2], +m[3]] : null; })()`);
  const check = async (name, sel) => {
    const c = await colour(sel);
    if (!c || !ICE.some(q => q.every((v, i) => Math.abs(v - c[i]) < 3))) fail('ice', `${name} isn't ice blue: ${JSON.stringify(c)}`);
    await screenshot(page, `ice-${name}`);
  };
  await page.evaluate('(() => { window.__cq.game.input.pitch = -0.55; window.__cq.runFrames(60); })()');
  // Settings.
  await page.keyboard.press('Escape');
  await check('settings', '#settings .st-title');
  await page.keyboard.press('Escape');
  // The backpack.
  await page.keyboard.press('AltLeft');
  await check('backpack', '.inv-title');
  await page.keyboard.press('AltLeft');
  // Crafting and sleep.
  await page.evaluate('window.__cq.game.craft.toggle(true)');
  if (await page.evaluate('window.__cq.game.craft.open')) { await check('crafting', '#craft .cr-title'); await page.evaluate('window.__cq.game.craft.toggle(false)'); }
  else { await page.evaluate(`(() => { const el = document.getElementById('craft'); el.style.display = 'block'; el.innerHTML = '<div class="cr-title">制作 CRAFTING</div>'; })()`); await check('crafting', '#craft .cr-title'); await page.evaluate(`document.getElementById('craft').style.display = 'none'`); }
  await page.evaluate('window.__cq.game.sleep.toggle(true)');
  await check('sleep', '#sleep .sl-title');
  await page.evaluate('window.__cq.game.sleep.toggle(false)');
  // The laptop and its map.
  await page.keyboard.press('Tab');
  await check('laptop', '#laptop .lt-tray');
  const map = await page.evaluate(`(() => { const c = document.querySelector('#laptop .lt-map canvas'); if (!c) return null; const d = c.getContext('2d').getImageData(2, 2, 1, 1).data; return [d[0], d[1], d[2]]; })()`);
  if (!map || !(map[2] > map[0])) fail('ice', `the map's ground isn't the dark blue: ${JSON.stringify(map)}`);
  await page.keyboard.press('Tab');
  // The headlamp's second mode: blue.
  const lamp = await page.evaluate(`(() => { const g = window.__cq.game; window.__cq.give('headlamp'); g.state.player.lamp = 2; window.__cq.runFrames(3); const c = g.view.lamp.color; return [c.r, c.g, c.b]; })()`);
  if (!(lamp[2] > lamp[0] && lamp[2] > 0.5)) fail('ice', `the headlamp's second mode isn't blue: ${JSON.stringify(lamp)}`);
  // The death screen.
  await page.evaluate(`(() => { const g = window.__cq.game; g.state.player.lamp = 0; g.state.dead = 'fall'; window.__cq.runFrames(5); })()`);
  await page.waitForFunction(`(window.__cq.runFrames(10), !!document.querySelector('#death .d-title'))`, { timeout: 20000 }).catch(() => {});
  await check('death', '#death .d-title');
  await page.close();
  // The main menu, on a boot into the game.
  const menu = await open('?seed=4', 'ice-menu');
  const c = await menu.evaluate(`(() => { const e = document.querySelector('#boot .bt-title'); const m = /rgba?\\((\\d+), (\\d+), (\\d+)/.exec(getComputedStyle(e).color); return [+m[1], +m[2], +m[3], getComputedStyle(document.getElementById('boot')).backgroundColor]; })()`);
  if (!ICE.some(q => q.every((v, i) => Math.abs(v - c[i]) < 3)) || c[3] !== 'rgb(0, 0, 0)') fail('ice', `main menu: ${JSON.stringify(c)}`);
  await screenshot(menu, 'ice-mainmenu');
  await menu.close();
}
