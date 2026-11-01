// M5-25b: the gym's chain-link fence drawn whole, then cut, its bottom peeled back (logs/fence.png, logs/fence-cut.png).
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=gym&seed=1', 'fence');
  const ok = await page.evaluate(`(() => { const g = window.__cq.game, p = g.state.player; Object.assign(p.pos, { x: 5, y: 0, z: -1 }); g.input.yaw = 0; g.input.pitch = -0.15; g.state.time = 12 * 3600; window.__cq.runFrames(10); return !!g.world.inter.find(i => i.kind === 'fence'); })()`);
  if (!ok) fail('fence', 'no fence in the gym');
  await screenshot(page, 'fence');
  await page.evaluate(`(() => { const g = window.__cq.game; g.state.wstate.open['gym-fence'] = true; window.__cq.runFrames(5); })()`);
  await screenshot(page, 'fence-cut');
  await page.close();
}
