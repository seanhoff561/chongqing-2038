// M10-16 (U-104): sitting at the laptop, the Drone app launches the drone (he stays sat, flying it), the laptop's key
// brings it back to him at the Drone window; the Cams app picks a tapped camera and loops it; the Logs app picks a
// sighting and the map opens on it, ringed (logs/lapsit.png).
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'lapsit');
  await page.evaluate(`(() => { const g = window.__cq.game, p = g.state.player.pos; g.state.flags.god = true; g.state.time = 12 * 3600;
    for (const id of ['drone', 'dronectl', 'binoculars', 'cameratap']) window.__cq.give(id);
    const C = g.world.cameras.map((c, i) => [c, i]).filter(([c]) => c.kind !== 'turret' && c.box).sort((a, b) => Math.hypot(a[0].x - p.x, a[0].z - p.z) - Math.hypot(b[0].x - p.x, b[0].z - p.z));
    g.state.taps = C.slice(0, 2).map(([, i]) => i);
    g.state.sightings = [{ u: 1, kind: 'quadruped', x: p.x + 120, y: 0, z: p.z - 80, t: g.state.time - 600, head: 0 }, { u: 2, kind: 'quadruped', x: p.x - 60, y: 0, z: p.z + 40, t: g.state.time - 300, head: 1 }];
    g.input.pitch = -0.55; window.__cq.runFrames(60); })()`);
  await page.keyboard.press('Tab');
  await page.evaluate('window.__cq.runFrames(30)');
  await page.keyboard.press('KeyQ');
  await page.evaluate('window.__cq.runFrames(40)');
  await page.waitForFunction('!document.pointerLockElement', { timeout: 3000 }).catch(() => {});
  const at = sel => page.evaluate(`(() => { const b = document.querySelector('${sel}')?.getBoundingClientRect(); return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null; })()`);
  const click = async sel => { await page.waitForSelector(sel, { timeout: 3000 }).catch(() => {}); const r = await at(sel); if (!r) { fail('lapsit', `no ${sel}`); return; } await page.mouse.click(r.x, r.y); await page.evaluate('window.__cq.runFrames(3)'); };
  const W = '#laptop .lt-win.front .lt-content';
  const front = () => page.evaluate(`document.querySelector('#laptop .lt-win.front')?.dataset.win`);
  // Drone: launched, flown, brought back.
  await click('#laptop .lt-task [data-app="drone"]');
  await click(`${W} [data-act="launch"]`);
  const fly = await page.evaluate(`(() => { const g = window.__cq.game; window.__cq.runFrames(10); return { flight: !!g.state.flight, sit: !!g.state.laptop?.sit, ui: g.input.uiOpen, page: document.getElementById('laptop').style.display }; })()`);
  if (!fly.flight || !fly.sit || fly.ui || fly.page !== 'none') fail('lapsit', `launching from the Drone app: ${JSON.stringify(fly)}`);
  await page.keyboard.down('KeyW'); await page.evaluate('window.__cq.runFrames(60)'); await page.keyboard.up('KeyW');
  const moved = await page.evaluate(`(() => { const f = window.__cq.game.state.flight, p = window.__cq.game.state.player.pos; return f ? Math.hypot(f.x - p.x, f.z - p.z) : -1; })()`);
  if (!(moved > 1)) fail('lapsit', `the drone didn't fly: ${moved}`);
  await page.keyboard.press('Tab');
  const back = await page.evaluate(`(() => { const g = window.__cq.game; window.__cq.runFrames(40); return { flight: !!g.state.flight, sit: !!g.state.laptop?.sit, ui: g.input.uiOpen, front: document.querySelector('#laptop .lt-win.front')?.dataset.win }; })()`);
  if (back.flight || !back.sit || !back.ui || back.front !== 'drone') fail('lapsit', `landing, he's not back at the Drone app: ${JSON.stringify(back)}`);
  await page.waitForFunction('!document.pointerLockElement', { timeout: 3000 }).catch(() => {});
  // Cams: the second camera picked, then looped.
  await click('#laptop .lt-task [data-app="cams"]');
  await click(`${W} [data-cam="1"]`);
  const cam = await page.evaluate(`(() => { window.__cq.runFrames(3); return window.__cq.game.laptop.cam; })()`);
  if (cam !== 1) fail('lapsit', `picking the second camera: ${cam}`);
  await click(`${W} [data-act="loop"]`);
  const looped = await page.evaluate(`(() => { window.__cq.runFrames(5); return document.querySelector('${W} [data-k="feed"]')?.textContent ?? ''; })()`);
  if (!/looped till/.test(looped)) fail('lapsit', `Loop didn't loop it: ${looped}`);
  // Logs: the first sighting picked, shown ringed on the map.
  await click('#laptop .lt-task [data-app="logs"]');
  await click(`${W} [data-sight="0"]`);
  const shown = await page.evaluate(`(() => { window.__cq.runFrames(3); const g = window.__cq.game, v = g.laptop.map.view, x = g.state.sightings[0]; return { front: document.querySelector('#laptop .lt-win.front')?.dataset.win, d: v ? Math.hypot(v.cx - x.x, v.cz - x.z) : -1, hi: g.laptop.map.hi }; })()`);
  if (shown.front !== 'map' || !(shown.d >= 0 && shown.d < 1) || !shown.hi) fail('lapsit', `the sighting isn't shown on the map: ${JSON.stringify(shown)}`);
  await screenshot(page, 'lapsit');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Tab');
  await page.close();
}
