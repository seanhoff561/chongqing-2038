// M3-41a (D-016): heightfield ground renders: the city's hillside at the top of the Eighteen Stairs, and he stands on it.
export default async function ({ open, screenshot, fail }) {
  const page = await open('?scenario=shibati&seed=1', 'ground');
  const r = await page.evaluate(`(() => { const g = window.__cq.game; g.state.time = 15 * 3600; g.state.flags.clear = true; g.input.pitch = -0.1; window.__cq.runFrames(40); const p = g.state.player; return { ground: !!g.world.ground, y: p.pos.y, onGround: p.onGround }; })()`);
  if (!r.ground) fail('ground', 'the city has no heightfield');
  if (!r.onGround || !Number.isFinite(r.y)) fail('ground', `not standing on the ground: ${JSON.stringify(r)}`);
  await screenshot(page, 'ground-hillside');
  await page.close();
}
