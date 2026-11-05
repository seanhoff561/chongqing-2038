// M8-11, M10-10 (U-104): the main menu on a boot into the game: 重庆 2038, New Run, Settings (the Esc panel), Maps (the
// map editor, M10-32), the version (the changelog: README, changes, credits, the repository and that Claude coded it;
// Back); with a save, Continue too; its own music, stopped when play starts (M10-60). A ?scenario= load goes straight in.
export default async function ({ open, fail }) {
  const page = await open('?scenario=hideout&seed=3', 'mainmenu');
  if (await page.$('#boot')) fail('mainmenu', 'a scenario load showed the main menu');
  await page.evaluate(`localStorage.removeItem('cq2038.save')`);
  await page.goto(page.url().split('?')[0] + '?seed=3', { waitUntil: 'load' });
  await page.waitForFunction('window.__cq && window.__cq.ready', { timeout: 240000 });
  const items = await page.evaluate(`[...document.querySelectorAll('#boot > *')].map(b => b.textContent)`);
  if (items.length !== 5 || items[0] !== '重庆 2038' || !items[1].includes('New Run') || !items[2].includes('Settings') || !items[3].includes('Maps') || !/^v\d+\.\d+\.\d+$/.test(items[4])) fail('mainmenu', `menu: ${items.join(' | ')}`);
  // M10-32: Maps opens the map editor (for now: the list is M10-33's); its Menu comes back here.
  await page.click('#boot .maps');
  if (!(await page.$('#editor')) || await page.$('#boot')) fail('mainmenu', 'Maps did not open the editor');
  await page.click('#editor [data-a="menu"]');
  if (await page.$('#editor') || !(await page.$('#boot'))) fail('mainmenu', "the editor's Menu did not come back to the menu");
  // M10-60: its music, once a click has started the sound: playing on the menu.
  await page.mouse.click(5, 5);
  await page.evaluate('new Promise(r => setTimeout(r, 1500))');
  const mus = await page.evaluate('(() => { const m = window.__cq.game.menuMusic; return { on: m.playing, notes: m.notes, ready: window.__cq.game.audio.ready }; })()');
  if (!mus.ready || !mus.on || !(mus.notes > 0)) fail('mainmenu', `no music on the menu: ${JSON.stringify(mus)}`);
  // (Settings: the same panel as Esc in play, U-104; Esc closes it.)
  await page.click('#boot .set');
  const sliders = await page.evaluate(`document.querySelectorAll('#settings input[data-set]').length`);
  if (sliders !== 2) fail('mainmenu', `settings: ${sliders} sliders`);
  await page.keyboard.press('Escape');
  if (await page.evaluate(`window.__cq.game.settings.open`)) fail('mainmenu', 'Esc did not close the settings');
  await page.click('#boot .ver');
  const log = await page.evaluate(`(() => { const t = document.querySelector('#boot .bt-log').textContent, a = [...document.querySelectorAll('#boot .bt-log a')].map(x => x.href); return { t, a }; })()`);
  const at = w => log.t.indexOf(w);
  if (!(at('Discord') >= 0 && at("What's built") > at('Discord') && at('OpenStreetMap') > at("What's built"))) fail('mainmenu', 'the changelog is not README, changes, credits in order');
  if (!log.t.includes('coded entirely by Claude') || !log.a.some(h => h.includes('github.com/seanhoff561/chongqing-2038'))) fail('mainmenu', 'no Claude note or repository link');
  await page.click('#boot .back');
  await page.click('#boot .new');
  const gone = await page.evaluate(`!document.getElementById('boot') && !window.__cq.game.input.uiOpen`);
  if (!gone) fail('mainmenu', 'New Run did not start');
  // (The music stops with play: no more notes.)
  await page.waitForFunction('!window.__cq.game.menuMusic.playing', { timeout: 30000 }).catch(() => {});
  const m0 = await page.evaluate('[window.__cq.game.menuMusic.playing, window.__cq.game.menuMusic.notes]');
  await page.evaluate('new Promise(r => setTimeout(r, 2500))');
  const m1 = await page.evaluate('window.__cq.game.menuMusic.notes');
  if (m0[0] || m1 !== m0[1]) fail('mainmenu', `the menu's music went on in play: ${JSON.stringify([m0, m1])}`);
  await page.close();
}
