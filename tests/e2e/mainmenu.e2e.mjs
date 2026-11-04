// M8-11: the main menu on a boot into the game: New Run, Settings (the Esc panel), Credits (and back); with a save,
// Continue too. A ?scenario= load goes straight in.
export default async function ({ open, fail }) {
  const page = await open('?scenario=hideout&seed=3', 'mainmenu');
  if (await page.$('#boot')) fail('mainmenu', 'a scenario load showed the main menu');
  await page.evaluate(`localStorage.removeItem('cq2038.save')`);
  await page.goto(page.url().split('?')[0] + '?seed=3', { waitUntil: 'load' });
  await page.waitForFunction('window.__cq && window.__cq.ready', { timeout: 240000 });
  const items = await page.evaluate(`[...document.querySelectorAll('#boot button')].map(b => b.textContent)`);
  if (items.some(t => t.includes('Continue')) || !['New Run', 'Settings', 'Credits'].every(w => items.some(t => t.includes(w)))) fail('mainmenu', `menu: ${items.join(' | ')}`);
  // (Settings: the same panel as Esc in play, U-104; Esc closes it.)
  await page.click('#boot .set');
  const sliders = await page.evaluate(`document.querySelectorAll('#settings input[data-set]').length`);
  if (sliders !== 2) fail('mainmenu', `settings: ${sliders} sliders`);
  await page.keyboard.press('Escape');
  if (await page.evaluate(`window.__cq.game.settings.open`)) fail('mainmenu', 'Esc did not close the settings');
  await page.click('#boot .cred');
  const cred = await page.evaluate(`document.querySelector('#boot').textContent`);
  if (!cred.includes('OpenStreetMap')) fail('mainmenu', 'credits missing');
  await page.click('#boot .back');
  await page.click('#boot .new');
  const gone = await page.evaluate(`!document.getElementById('boot') && !window.__cq.game.input.uiOpen`);
  if (!gone) fail('mainmenu', 'New Run did not start');
  await page.close();
}
