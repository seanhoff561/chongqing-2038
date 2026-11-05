// M10-34: the Training Room. Sat at the laptop, its Training Room app (open now) puts the goggles on: the screen goes
// black and comes up in the built-in tutorial map, at its spawn, his run kept aside. Ten seconds there, then Esc's
// Take off the goggles: black, and back to the very same run, sat where he was on the same app, the time he spent in
// the goggles passed on its clock (logs/training.png).
export default async function ({ open, fail, screenshot }) {
  const F = (m) => fail('training', m);
  const page = await open('?scenario=hideout&seed=1', 'training');
  const ev = (f, ...a) => page.evaluate(f, ...a);
  await ev(() => localStorage.removeItem('cq2038.maps'));
  await ev(() => { window.__cq.game.input.pitch = -0.55; window.__cq.runFrames(60); });
  const at = (sel) => ev(sel => { const b = document.querySelector(sel)?.getBoundingClientRect(); return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null; }, sel);
  const click = async (sel) => { const r = await at(sel); if (!r) { F(`no ${sel}`); return; } await page.mouse.click(r.x, r.y); await ev(() => window.__cq.runFrames(3)); };
  // (The map's first frame compiles its shaders: some 20 s in software GL.)
  const until = (f, ms = 90000) => page.waitForFunction(f, { timeout: ms }).then(() => true, () => false);

  // Sat down, the Training Room open: not locked, the goggles' button.
  await page.keyboard.press('Tab');
  await ev(() => window.__cq.runFrames(40));
  await page.keyboard.press('KeyQ');
  await ev(() => window.__cq.runFrames(40));
  await click('#laptop .lt-task [data-app="training"]');
  const app = await ev(() => { const f = document.querySelector('#laptop .lt-win.front'); return { front: f?.dataset.win, locked: !!f?.querySelector('.lt-locked'), btn: !!f?.querySelector('[data-act="train"]') }; });
  if (app.front !== 'training' || app.locked || !app.btn) F(`the Training Room: ${JSON.stringify(app)}`);
  const before = await ev(() => { const g = window.__cq.game, s = g.state; window.__keep = s; return { pos: { ...s.player.pos }, time: s.time, sit: !!s.laptop?.sit, world: g.world.name }; });
  if (!before.sit) F('not sat down');

  // The goggles on.
  // (Each time the screen is set to go black, counted: a frame can take longer than the fade in software GL.)
  await ev(() => { window.__black = 0; let was = ''; new MutationObserver(ms => { for (const m of ms) if (m.target.id === 'fade') { const o = m.target.style.opacity; if (o === '1' && was !== '1') window.__black++; was = o; } }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['style'] }); });
  await click('#laptop .lt-win.front [data-act="train"]');
  if (!(await until(() => { const g = window.__cq.game; return g.training && g.world.name === 'map' && getComputedStyle(document.getElementById('fade')).opacity === '0'; }))) F('the tutorial did not come up');
  const inside = await ev(() => { const g = window.__cq.game; return { sc: g.scenario.name, pos: g.state.player.pos, kept: g.training?.state === window.__keep, vr: document.body.classList.contains('vr'), signs: g.world.inter.filter(i => i.kind === 'sign').length, laptop: !!g.state.laptop?.open }; });
  if ((await ev(() => window.__black)) !== 1) F('the screen did not go black on the way in');
  if (inside.sc !== 'map' || Math.hypot(inside.pos.x, inside.pos.z) > 0.2 || !inside.kept || !inside.vr || inside.signs < 8 || inside.laptop) F(`in the goggles: ${JSON.stringify(inside)}`);
  await ev(() => window.__cq.runFrames(600));
  const spent = await ev(() => window.__cq.game.state.time - window.__cq.game.training.t0);
  if (!(spent >= 390)) F(`time in the goggles: ${spent}`);
  // (Looking down the course, the Esc panel that headless Chrome's refused mouse lock brings up out of the way.)
  await ev(() => { const g = window.__cq.game; document.getElementById('settings').style.display = 'none'; g.input.pitch = -0.15; window.__cq.runFrames(2); return new Promise(r => setTimeout(r, 1500)); });
  await screenshot(page, 'training');

  // Off again, from the Esc panel.
  await ev(() => window.__cq.game.settings.show());
  if (await page.$('#settings [data-a="edit"]')) F('the Esc panel offers the editor in the goggles');
  await page.click('#settings [data-a="vr"]');
  if (!(await until(() => { const g = window.__cq.game; return !g.training && g.world.name !== 'map' && getComputedStyle(document.getElementById('fade')).opacity === '0'; }))) F('the goggles did not come off');
  await ev(() => window.__cq.runFrames(40));
  if ((await ev(() => window.__black)) !== 2) F('the screen did not go black on the way out');
  const after = await ev(() => { const g = window.__cq.game, s = g.state, el = document.getElementById('laptop'); return { same: s === window.__keep, pos: { ...s.player.pos }, time: s.time, sit: !!s.laptop?.sit, world: g.world.name, cls: el.className, shown: el.style.display, front: el.querySelector('.lt-win.front')?.dataset.win, vr: document.body.classList.contains('vr') }; });
  if (!after.same || after.world !== before.world || Math.hypot(after.pos.x - before.pos.x, after.pos.y - before.pos.y, after.pos.z - before.pos.z) > 0.01) F(`not back where he was: ${JSON.stringify({ before, after })}`);
  if (!after.sit || after.cls !== 'sit' || after.shown !== 'block' || after.front !== 'training' || after.vr) F(`not sat back at the laptop: ${JSON.stringify(after)}`);
  if (!(after.time >= before.time + spent && after.time < before.time + spent + 600)) F(`the clock: ${before.time} + ${spent} -> ${after.time}`);
  await page.close();
}
