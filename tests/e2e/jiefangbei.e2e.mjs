// M6-02: Jiefangbei's look: the Liberation Monument on its plaza among the towers, the malls' fronts, and the giant
// LED screens running the machine's edicts between their campaigns (logs/jiefangbei-*.png).
export default async function ({ open, screenshot, fail }) {
  const page = await open('?scenario=yuzhong&seed=1', 'jiefangbei');
  const look = (yaw, pitch, hour) => page.evaluate(`(() => { const g = window.__cq.game, t = g.world.teleports.find(t => t.name === 'jiefangbei'); g.state.time = ${hour} * 3600; g.state.flags.clear = true;
    Object.assign(g.state.player.pos, { x: t.x, y: t.y - 1.45, z: t.z }); g.input.yaw = t.yaw + ${yaw}; g.input.pitch = ${pitch}; window.__cq.runFrames(10); return g.view.renderer.info.render.calls; })()`);
  await look(0, 0.3, 15);
  await screenshot(page, 'jiefangbei-monument');
  await look(0.35, 0.25, 21);
  await screenshot(page, 'jiefangbei-night');
  const mon = await page.evaluate(`window.__cq.game.world.plots.some(p => p.kind === 'monument')`);
  if (!mon) fail('jiefangbei', 'no monument');
  await page.close();
}
