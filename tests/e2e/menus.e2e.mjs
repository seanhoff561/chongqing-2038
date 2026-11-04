// M3-31 (U-014, U-104): the backpack opens and closes with Alt; the sleep menu closes with F, right-click or its
// stay-awake button; Esc opens the settings.
export default async function ({ open, fail }) {
  const page = await open('?scenario=hideout&seed=1', 'menus');
  const shown = id => page.evaluate(`getComputedStyle(document.getElementById('${id}')).display !== 'none'`);
  await page.keyboard.press('AltLeft');
  await page.evaluate('window.__cq.runFrames(2)');
  if (!(await page.evaluate('window.__cq.game.inv.open'))) fail('menus', 'Alt did not open the backpack');
  await page.keyboard.press('AltLeft');
  await page.evaluate('window.__cq.runFrames(2)');
  if (await page.evaluate('window.__cq.game.inv.open')) fail('menus', 'Alt did not close the backpack');
  const sleepMenu = () => page.evaluate(`(() => { const g = window.__cq.game; g.sleep.toggle(true); })()`);
  await sleepMenu();
  await page.keyboard.press('KeyF');
  if (await shown('sleep')) fail('menus', 'F did not close the sleep menu');
  await sleepMenu();
  await page.mouse.click(480, 270, { button: 'right' });
  if (await shown('sleep')) fail('menus', 'right-click did not close the sleep menu');
  await sleepMenu();
  await page.click('#sleep .stay');
  if (await shown('sleep')) fail('menus', 'the stay-awake button did not close the sleep menu');
  await page.keyboard.press('Escape');
  await page.evaluate('window.__cq.runFrames(2)');
  if (!(await page.evaluate('window.__cq.game.settings.open'))) fail('menus', 'Esc did not open the settings');
  await page.keyboard.press('Escape');
  await page.close();
}
