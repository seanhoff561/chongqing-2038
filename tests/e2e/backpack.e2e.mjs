// M2-11: the backpack's key (Alt) opens it, dragging moves an item in the sim inventory, the game keeps running.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=hideout&seed=1', 'backpack');
  // (The run's start fills his pack: emptied first, so the bread goes in at the top left.)
  await page.evaluate(`window.__cq.game.state.inv.pack.items.length = 0; window.__cq.game.state.inv.hotbar.fill(null); window.__cq.game.state.inv.held = 0; window.__cq.give('bread'); window.__cq.give('crowbar'); window.__cq.give('noodles', 1)`);
  await page.keyboard.press('AltLeft');
  const t0 = await page.evaluate('window.__cq.game.state.tick');
  await page.evaluate('window.__cq.runFrames(2)');
  const el = await page.$('#inv .inv-item');
  if (!el) { fail('backpack', 'no item elements'); return; }
  const box = await el.boundingBox();
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 10 + 44 * 5, box.y + 10 + 44 * 3, { steps: 4 });
  await page.mouse.up();
  await page.evaluate('window.__cq.runFrames(2)');
  const st = await page.evaluate('window.__cq.game.state.inv.pack.items.find(i => i.id === "bread")');
  if (!(st.x === 5 && st.y === 3)) fail('backpack', `bread at ${st.x},${st.y}`);
  const t1 = await page.evaluate('window.__cq.game.state.tick');
  if (!(t1 > t0)) fail('backpack', 'game paused');
  await screenshot(page, 'backpack');
  await page.close();
}
