// M10-13 (U-104): with the laptop out, Q sits him down: the screen comes close (it fills more of the view), the mouse
// is a cursor on it; the nine dots open a launcher of all nine tabs and each opens from it, a locked one to what it
// needs; Q stands him up, and so does Esc (logs/focus.png).
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=hideout&seed=1', 'focus');
  await page.evaluate('(() => { window.__cq.game.input.pitch = -0.55; window.__cq.runFrames(60); })()');
  const box = () => page.evaluate(`(() => { window.__cq.runFrames(40); const el = document.getElementById('laptop'), r = el.getBoundingClientRect(), g = window.__cq.game;
    return { h: r.height / innerHeight, sit: !!g.state.laptop?.sit, cls: el.className, ui: g.input.uiOpen, on: el.querySelector('.lt-body')?.dataset.on, shown: el.style.display }; })()`);
  await page.keyboard.press('Tab');
  const held = await box();
  await page.keyboard.press('KeyQ');
  const sat = await box();
  if (!sat.sit || sat.cls !== 'sit' || !sat.ui) fail('focus', `Q did not sit him down: ${JSON.stringify(sat)}`);
  // (Sitting lets the mouse go, which the browser does a moment later.)
  await page.waitForFunction('!document.pointerLockElement', { timeout: 3000 }).catch(() => fail('focus', 'sitting, the mouse was not let go'));
  if (!(sat.h > held.h * 1.5)) fail('focus', `the screen didn't come close: ${held.h.toFixed(2)} then ${sat.h.toFixed(2)}`);
  // (A real click where the cursor is: the page under it must take it.)
  const click = async sel => {
    const r = await page.evaluate(`(() => { const b = document.querySelector('${sel}')?.getBoundingClientRect(); return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null; })()`);
    if (!r) { fail('focus', `no ${sel}`); return; }
    await page.mouse.click(r.x, r.y);
    await page.evaluate('window.__cq.runFrames(3)');
  };
  const want = ['map', 'status', 'scan', 'notes', 'drone', 'cams', 'logs', 'songs', 'training'];
  for (const id of want) {
    await click('#laptop .lt-dots');
    const tabs = await page.evaluate(`[...document.querySelectorAll('#laptop .lt-launch [data-tab]')].map(b => b.dataset.tab).join()`);
    if (tabs !== want.join()) { fail('focus', `launcher: ${tabs}`); break; }
    if (id === 'logs') await screenshot(page, 'focus');
    await click(`#laptop [data-tab="${id}"]`);
    const r = await page.evaluate(`(() => { const b = document.querySelector('#laptop .lt-body'); return { on: b.dataset.on, text: b.textContent, locked: !!b.querySelector('.lt-locked') }; })()`);
    if (r.on !== id) fail('focus', `the ${id} tile opened ${r.on}`);
    if (['drone', 'cams', 'logs', 'songs', 'training'].includes(id) && !(r.locked && /needs/.test(r.text))) fail('focus', `locked ${id} says nothing of what it needs: ${r.text}`);
  }
  await page.keyboard.press('KeyQ');
  const up = await box();
  if (up.sit || up.cls || up.ui) fail('focus', `Q did not stand him up: ${JSON.stringify(up)}`);
  if (up.on !== 'map') fail('focus', `standing, a sitting-only tab still shown: ${up.on}`);
  await page.keyboard.press('KeyQ');
  if (!(await box()).sit) fail('focus', 'Q did not sit him down again');
  await page.keyboard.press('Escape');
  const esc = await box();
  if (esc.sit || esc.shown !== 'block') fail('focus', `Esc did not stand him up (laptop still out): ${JSON.stringify(esc)}`);
  await page.keyboard.press('Tab');
  await page.close();
}
