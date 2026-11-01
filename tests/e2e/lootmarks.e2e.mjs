// M4-90 (U-066): what he can loot is plain to see. In the hideout, the stash (not yet searched) and a loaf dropped on
// the floor each carry a mark; the stash searched and found empty goes plain.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=hideout&seed=1', 'lootmarks');
  const both = await page.evaluate(`(() => {
    const g = window.__cq.game, s = g.state;
    Object.assign(s.player.pos, { x: 12.2, y: 0, z: -0.6 }); g.input.yaw = -2.75; g.input.pitch = -0.45;
    s.dropped.push({ stack: { uid: 7777, id: 'bread', n: 1, x: 0, y: 0, rot: false }, x: 12.6, y: 0, z: 0.6 });
    g.runFrames(12);
    return g.loot.shown;
  })()`);
  await screenshot(page, 'lootmarks');
  const after = await page.evaluate(`(() => {
    const g = window.__cq.game, s = g.state, stash = g.world.inter.find(i => i.kind === 'container');
    s.wstate.searched[stash.id] = true;
    if (s.containers[stash.id]) s.containers[stash.id].items.length = 0; else s.containers[stash.id] = { w: 10, h: 8, items: [] };
    g.runFrames(12);
    return g.loot.shown;
  })()`);
  if (both < 2) fail('lootmarks', `only ${both} marks over the stash and the dropped bread`);
  if (after !== both - 1) fail('lootmarks', `searched and empty, the stash still marked (${both} -> ${after})`);
  console.log(`lootmarks: ${both} marked, ${after} once the stash is empty`);
  await page.close();
}
