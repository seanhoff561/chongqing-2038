// M5-25b: a chain-link fence drawn whole, then cut, its bottom peeled back (logs/fence.png, logs/fence-cut.png). One's
// put up on the street above the hideout for it (the drawing picks up a world's fences when it next looks).
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=hideout&seed=1', 'fence');
  const ok = await page.evaluate(`(() => { const g = window.__cq.game, p = g.state.player;
    g.world.inter.push({ id: 'test-fence', kind: 'fence', x: 80, y: 9.5, z: 22, r: 1.5, zh: '铁丝网', en: 'Chain-link fence', data: { solid: -1, x0: 78, x1: 82, z: 22, h: 2.2 } });
    g.fx.fences.of = null;
    Object.assign(p.pos, { x: 80, y: 9, z: 25 }); g.input.yaw = 0; g.input.pitch = -0.15; g.state.time = 12 * 3600; window.__cq.runFrames(10);
    return g.fx.fences.made.has('test-fence'); })()`);
  if (!ok) fail('fence', 'the fence was not drawn');
  await screenshot(page, 'fence');
  await page.evaluate(`(() => { const g = window.__cq.game; g.state.wstate.open['test-fence'] = true; window.__cq.runFrames(5); })()`);
  const cut = await page.evaluate(`window.__cq.game.fx.fences.made.get('test-fence').flap.rotation.x`);
  if (!(cut < -1)) fail('fence', `the cut fence's flap not peeled back: ${cut}`);
  await screenshot(page, 'fence-cut');
  await page.close();
}
