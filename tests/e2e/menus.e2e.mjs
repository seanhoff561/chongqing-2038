// M10-08 (U-104): each menu closes with the key that opened it and with Esc: the backpack (Alt), the laptop (Tab),
// the crafting and a bed's sleep menu (Interact, E), the rough-sleep menu (Sleep Rough, Z); the sleep menu says how
// long he'll sleep and when he'll wake, and has no stay-awake button; Esc with nothing up opens the settings.
export default async function ({ open, fail }) {
  const page = await open('?scenario=hideout&seed=1', 'menus');
  const up = what => page.evaluate(`(() => { const g = window.__cq.game; window.__cq.runFrames(2); return ${what}; })()`);
  const tries = [
    ['backpack', 'AltLeft', 'g.inv.open', null],
    ['laptop', 'Tab', '!!g.state.laptop?.open', null],
    ['crafting', null, 'g.craft.open', 'g.craft.toggle(true)'],
    ['sleep menu', null, 'g.sleep.open', 'g.sleep.toggle(true)'],
  ];
  for (const [name, key, isUp, show] of tries) for (const close of [key ?? 'KeyE', 'Escape']) {
    if (key) await page.keyboard.press(key); else await page.evaluate(`(() => { const g = window.__cq.game; ${show}; })()`);
    if (!(await up(isUp))) { if (name !== 'crafting') fail('menus', `${name} did not open`); break; }
    await page.keyboard.press(close);
    if (await up(isUp)) fail('menus', `${close} did not close the ${name}`);
  }
  // Sleeping rough: its own key closes it; each choice is hours and a time.
  await page.evaluate(`window.__cq.game.sleep.toggle(true, true)`);
  const s = await page.evaluate(`[...document.querySelectorAll('#sleep button')].map(b => b.textContent)`);
  if (s.length !== 8 || !s.every(t => /\d+ h( \d+ min)? · \d\d:00$/.test(t)) || s.some(t => /awake|Stay/i.test(t))) fail('menus', `sleep choices: ${JSON.stringify(s)}`);
  await page.keyboard.press('KeyZ');
  if (await up('g.sleep.open')) fail('menus', 'Z did not close the rough-sleep menu');
  await page.keyboard.press('Escape');
  if (!(await up('g.settings.open'))) fail('menus', 'Esc did not open the settings');
  await page.keyboard.press('Escape');
  await page.close();
}
