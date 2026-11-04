// M10-15 (U-104): sitting at the laptop, Status's wounds hovered say what they are and how they're treated; Scan lists
// what's in the backpack and scans the one picked; Notes is a box he writes in, kept with the run, and standing he
// only reads it (logs/lapapps.png).
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=hideout&seed=1', 'lapapps');
  await page.evaluate(`(() => { const g = window.__cq.game, b = g.state.body; b.leg = 'sprain'; b.legHealAt = g.state.time + 30 * 3600; b.lightBleed = 0;
    window.__cq.give('bandage'); window.__cq.give('crowbar'); g.input.pitch = -0.55; window.__cq.runFrames(60); })()`);
  await page.keyboard.press('Tab');
  await page.evaluate('window.__cq.runFrames(30)');
  await page.keyboard.press('KeyQ');
  await page.evaluate('window.__cq.runFrames(40)');
  await page.waitForFunction('!document.pointerLockElement', { timeout: 3000 }).catch(() => {});
  const at = sel => page.evaluate(`(() => { const b = document.querySelector('${sel}')?.getBoundingClientRect(); return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null; })()`);
  const click = async sel => { const r = await at(sel); if (!r) { fail('lapapps', `no ${sel}`); return; } await page.mouse.click(r.x, r.y); await page.evaluate('window.__cq.runFrames(3)'); };
  const W = '#laptop .lt-win.front .lt-content';
  // Status: hovering the leg and the bleeding.
  await click('#laptop .lt-task [data-app="status"]');
  await page.evaluate(`(() => { const g = window.__cq.game, b = g.state.body; b.lightBleed = 0; window.__cq.runFrames(2); })()`);
  const tipOf = async k => { const r = await at(`${W} [data-k="${k}"]`); if (!r) return ''; await page.mouse.move(r.x, r.y); return page.evaluate(`getComputedStyle(document.querySelector('${W} [data-k="${k}"]'), '::after').content`); };
  const hp = await tipOf('hp'), bleed = await tipOf('bleed'), leg = await tipOf('leg');
  if (!/sprain/.test(leg) || !/Healed in 3[01] h|Healed in 1 days|Healed in 30 h/.test(leg) || !/Painkillers/.test(leg)) fail('lapapps', `the sprain's hover: ${leg}`);
  if (!/bandage/.test(bleed)) fail('lapapps', `the bleeding's hover: ${bleed}`);
  if (hp && hp !== 'none' && hp !== 'normal') fail('lapapps', `health has a hover: ${hp}`);
  await screenshot(page, 'lapapps');
  // Scan: the backpack's things; the bandage picked.
  await click('#laptop .lt-task [data-app="scan"]');
  const list = await page.evaluate(`[...document.querySelectorAll('${W} [data-scan]')].map(b => b.textContent)`);
  if (!list.some(t => /Bandage/i.test(t)) || !list.some(t => /Crowbar/i.test(t))) fail('lapapps', `scan list: ${JSON.stringify(list)}`);
  const uid = await page.evaluate(`window.__cq.game.state.inv.pack.items.find(i => i.id === 'bandage').uid`);
  await click(`${W} [data-scan="${uid}"]`);
  const sc = await page.evaluate(`(() => { window.__cq.runFrames(3); const g = window.__cq.game; return { last: g.state.lastScan, text: document.querySelector('${W}').textContent }; })()`);
  if (sc.last !== 'item:bandage' || !/Bandage/i.test(sc.text)) fail('lapapps', `picking the bandage didn't scan it: ${JSON.stringify(sc).slice(0, 300)}`);
  // Notes: written, kept, read standing.
  await click('#laptop .lt-task [data-app="notes"]');
  await click(`${W} .lt-notesbox`);
  await page.keyboard.type('cache under the stairs, 2 tins');
  const kept = await page.evaluate(`(() => { window.__cq.runFrames(3); return window.__cq.game.state.notes; })()`);
  if (kept !== 'cache under the stairs, 2 tins') fail('lapapps', `notes not kept: ${JSON.stringify(kept)}`);
  if (!(await page.evaluate('window.__cq.game.state.laptop.sit'))) fail('lapapps', 'typing in Notes stood him up');
  await page.mouse.click(5, 5);
  await page.keyboard.press('KeyQ');
  const st = await page.evaluate(`(() => { window.__cq.runFrames(30); const f = document.querySelector('#laptop .lt-win.front'); return { app: f?.dataset.win, text: f?.querySelector('.lt-notes')?.textContent, box: !!f?.querySelector('textarea') }; })()`);
  if (st.app !== 'notes' || st.text !== 'cache under the stairs, 2 tins' || st.box) fail('lapapps', `standing, Notes isn't read-only: ${JSON.stringify(st)}`);
  await page.keyboard.press('Tab');
  await page.close();
}
