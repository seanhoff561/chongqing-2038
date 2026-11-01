// M4-71: shift-click moves an item straight across (backpack to the open stash, and back), 'take all' empties it.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=hideout&seed=1', 'takeall');
  await page.evaluate(`(() => { const g = window.__cq.game; Object.assign(g.state.player.pos, { x: 12.6, y: 0, z: 0.2 }); g.input.yaw = -2.75; g.input.pitch = -0.6; g.runFrames(5); })()`);
  await page.evaluate(`window.__cq.game.state.inv.pack.items.length = 0; window.__cq.game.state.containers.stash.items.length = 0; window.__cq.give('crowbar')`);
  await page.keyboard.down('KeyF');
  await page.evaluate('window.__cq.runFrames(3)');
  await page.keyboard.up('KeyF');
  await page.evaluate('window.__cq.runFrames(2)');
  const shiftClick = async sel => {
    const el = await page.$(sel), b = el && await el.boundingBox();
    if (!b) return fail('takeall', `nothing at ${sel}`);
    await page.keyboard.down('Shift'); await page.mouse.click(b.x + 8, b.y + 8); await page.keyboard.up('Shift');
    await page.evaluate('window.__cq.runFrames(2)');
  };
  await shiftClick('#inv .inv-panel:nth-child(1) .inv-item');
  let ids = await page.evaluate('window.__cq.game.state.containers.stash.items.map(i => i.id)');
  if (!ids.includes('crowbar')) fail('takeall', `shift-click to the stash: it holds ${ids}`);
  await shiftClick('#inv .inv-panel:nth-child(2) .inv-item');
  ids = await page.evaluate('window.__cq.game.state.inv.pack.items.map(i => i.id)');
  if (!ids.includes('crowbar')) fail('takeall', `shift-click back: the pack holds ${ids}`);
  await page.evaluate(`window.__cq.game.state.containers.stash.items.push(...['water', 'bread', 'firstaid', 'bandage'].map((id, i) => ({ uid: 9001 + i, id, n: 1, x: i * 2, y: 0, rot: false }))); window.__cq.runFrames(2)`);
  const btn = await page.$('#inv .inv-takeall');
  if (!btn) fail('takeall', 'no take-all button');
  else { await btn.click(); await page.evaluate('window.__cq.runFrames(2)'); }
  const left = await page.evaluate('window.__cq.game.state.containers.stash.items.length');
  ids = await page.evaluate('window.__cq.game.state.inv.pack.items.map(i => i.id).sort().join()');
  if (left !== 0 || ids !== 'bandage,bread,crowbar,firstaid,water') fail('takeall', `after take all: ${left} left, pack ${ids}`);
  await screenshot(page, 'takeall');
  await page.close();
}
