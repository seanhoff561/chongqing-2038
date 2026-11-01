// M5-15: at the hideout's workbench, F opens its list; with a clean cloth and alcohol, Make on the bandage, and a few
// seconds later there's a bandage in the backpack and the parts are gone (logs/craft.png).
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=hideout&seed=1', 'craft');
  const r0 = await page.evaluate(`(() => { const g = window.__cq.game, b = g.world.inter.find(i => i.kind === 'bench');
    if (!b) return 'no bench';
    window.__cq.give('cloth'); window.__cq.give('alcohol');
    const p = g.state.player; Object.assign(p.pos, { x: b.x, y: b.y - 0.95, z: b.z - 1.1 }); g.input.yaw = Math.PI; g.input.pitch = -0.5; window.__cq.runFrames(10);
    return { target: g.state.target, pos: JSON.stringify(g.state.player.pos), bench: JSON.stringify([b.x, b.y, b.z]), mode: g.state.player.mode, before: g.state.inv.pack.items.filter(i => i.id === 'bandage').reduce((a, i) => a + i.n, 0) }; })()`);
  if (r0 === 'no bench') { fail('craft', 'no bench in the hideout'); await page.close(); return; }
  await page.keyboard.press('KeyF');
  await page.evaluate('window.__cq.runFrames(4)');
  const shown = await page.evaluate(`(() => { const el = document.getElementById('craft'); return { d: el.style.display, make: !!el.querySelector('[data-make="bandage"]') }; })()`);
  if (shown.d !== 'block' || !shown.make) fail('craft', `the bench's list didn't open with the bandage makeable (target ${r0.target}, at ${r0.pos} ${r0.mode}, bench ${r0.bench}): ${JSON.stringify(shown)}`);
  await page.click('[data-make="bandage"]').catch(() => {});
  await page.evaluate('window.__cq.runFrames(30)');
  await screenshot(page, 'craft');
  const r = await page.evaluate(`(() => { window.__cq.runFrames(300); const it = window.__cq.game.state.inv.pack.items; return { bandage: it.filter(i => i.id === 'bandage').reduce((a, i) => a + i.n, 0), cloth: it.filter(i => i.id === 'cloth').length }; })()`);
  if (r.bandage !== r0.before + 1 || r.cloth > 0) fail('craft', `no bandage made: ${JSON.stringify(r)}`);
  await page.close();
}
