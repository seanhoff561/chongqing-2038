// M10-13, M10-58 (U-104, U-105): with the laptop out, Q sits him down: the screen comes close, the mouse is a cursor on
// it, the app he was on open full. Anna's OS: each of the nine taskbar icons opens its app in a window in front (a
// locked one saying what it needs); X closes one; minimised it's gone from the desktop but still on the taskbar, and
// its icon brings it back; maximise fills the desktop; a window dragged by its title bar moves. Q stands him up on the
// app in front if it's one of the four, and Esc does too (logs/focus.png).
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=hideout&seed=1', 'focus');
  await page.evaluate('(() => { window.__cq.game.input.pitch = -0.55; window.__cq.runFrames(60); })()');
  const box = () => page.evaluate(`(() => { window.__cq.runFrames(40); const el = document.getElementById('laptop'), r = el.getBoundingClientRect(), g = window.__cq.game;
    return { h: r.height / innerHeight, sit: !!g.state.laptop?.sit, cls: el.className, ui: g.input.uiOpen, front: el.querySelector('.lt-win.front')?.dataset.win, shown: el.style.display }; })()`);
  const desk = () => page.evaluate(`(() => { window.__cq.runFrames(3); const ws = [...document.querySelectorAll('#laptop .lt-win')].filter(w => w.style.display !== 'none');
    const f = document.querySelector('#laptop .lt-win.front');
    return { shown: ws.map(w => w.dataset.win), front: f?.dataset.win, max: f?.classList.contains('max'), x: f && parseFloat(f.style.left), text: f?.querySelector('.lt-content').textContent ?? '', locked: !!f?.querySelector('.lt-locked'),
      open: [...document.querySelectorAll('#laptop .lt-task button.open')].map(b => b.dataset.app) }; })()`);
  const at = sel => page.evaluate(`(() => { const b = document.querySelector('${sel}')?.getBoundingClientRect(); return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null; })()`);
  const click = async sel => { const r = await at(sel); if (!r) { fail('focus', `no ${sel}`); return; } await page.mouse.click(r.x, r.y); await page.evaluate('window.__cq.runFrames(3)'); };
  await page.keyboard.press('Tab');
  const held = await box();
  await page.keyboard.press('KeyQ');
  const sat = await box();
  await page.waitForFunction('!document.pointerLockElement', { timeout: 3000 }).catch(() => fail('focus', 'sitting, the mouse was not let go'));
  if (!sat.sit || sat.cls !== 'sit' || !sat.ui) fail('focus', `Q did not sit him down: ${JSON.stringify(sat)}`);
  if (!(sat.h > held.h * 1.5)) fail('focus', `the screen didn't come close: ${held.h.toFixed(2)} then ${sat.h.toFixed(2)}`);
  let d = await desk();
  if (d.front !== 'map' || !d.max) fail('focus', `sitting down, the map isn't open full: ${JSON.stringify(d)}`);
  // Every app from the taskbar, each in front; the locked ones say what they need.
  const apps = ['map', 'status', 'scan', 'notes', 'drone', 'cams', 'logs', 'songs', 'training'];
  for (const id of apps) {
    if (id !== 'map') await click(`#laptop .lt-task [data-app="${id}"]`);
    d = await desk();
    if (d.front !== id) fail('focus', `the ${id} icon brought ${d.front} to the front`);
    if (['drone', 'cams', 'logs', 'songs', 'training'].includes(id) && !(d.locked && /needs/.test(d.text))) fail('focus', `locked ${id} says nothing of what it needs: ${d.text}`);
  }
  if (d.open.join() !== apps.join() || d.shown.length !== 9) fail('focus', `not all open: ${JSON.stringify(d)}`);
  await screenshot(page, 'focus');
  // X closes the one in front.
  await click('#laptop .lt-win.front [data-w="close"]');
  d = await desk();
  if (d.shown.includes('training') || d.open.includes('training') || d.front !== 'songs') fail('focus', `X didn't close it: ${JSON.stringify(d)}`);
  // Minimised: off the desktop, still on the taskbar; its icon brings it back.
  await click('#laptop .lt-win.front [data-w="min"]');
  d = await desk();
  if (d.shown.includes('songs') || !d.open.includes('songs') || d.front !== 'logs') fail('focus', `minimise: ${JSON.stringify(d)}`);
  await click('#laptop .lt-task [data-app="songs"]');
  if ((await desk()).front !== 'songs') fail('focus', 'its icon did not bring it back');
  // Dragged by its title bar; maximised and back.
  const t = await at('#laptop .lt-win.front .lt-title span');
  const x0 = (await desk()).x;
  await page.mouse.move(t.x, t.y); await page.mouse.down(); await page.mouse.move(t.x - 80, t.y + 20, { steps: 5 }); await page.mouse.up();
  d = await desk();
  if (!(d.x < x0 - 20)) fail('focus', `dragging the title bar didn't move it: ${x0} then ${d.x}`);
  await click('#laptop .lt-win.front [data-w="max"]');
  if (!(await desk()).max) fail('focus', 'maximise did not fill the desktop');
  // Up on Status (one of the four), in front.
  await click('#laptop .lt-task [data-app="status"]');
  await page.keyboard.press('KeyQ');
  const up = await box();
  if (up.sit || up.cls || up.ui) fail('focus', `Q did not stand him up: ${JSON.stringify(up)}`);
  if (up.front !== 'status') fail('focus', `standing, not on the app he left in front: ${up.front}`);
  await page.keyboard.press('KeyQ');
  if (!(await box()).sit) fail('focus', 'Q did not sit him down again');
  await page.keyboard.press('Escape');
  const esc = await box();
  if (esc.sit || esc.shown !== 'block') fail('focus', `Esc did not stand him up (laptop still out): ${JSON.stringify(esc)}`);
  await page.keyboard.press('Tab');
  await page.close();
}
