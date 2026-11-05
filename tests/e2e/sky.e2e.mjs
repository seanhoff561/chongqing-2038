// M2-02: sky follows the clock.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=hideout&seed=1', 'sky');
  await page.evaluate('Object.assign(window.__cq.player().pos, { x: 80, y: 9, z: 25 }); window.__cq.game.input.yaw = 0; window.__cq.game.input.pitch = 0.3; window.__cq.game.state.flags.clear = true; window.__cq.runFrames(5)');
  const bg = h => page.evaluate(`(() => { const g = window.__cq.game; g.state.time = ${h} * 3600; g.runFrames(1); return g.view.scene.background.getHSL({}).l; })()`);
  const noon = await bg(12);
  await screenshot(page, 'sky-noon');
  const night = await bg(24);
  await screenshot(page, 'sky-midnight');
  if (!(noon > 0.3 && night < 0.05)) fail('sky', `lightness noon ${noon} midnight ${night}`);
  await page.close();
}
