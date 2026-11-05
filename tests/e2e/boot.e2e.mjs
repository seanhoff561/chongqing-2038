// M1-20: boots, and a key press reaches the player.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=hideout&seed=1', 'boot');
  await page.evaluate('Object.assign(window.__cq.player().pos, { x: 80, y: 9, z: 25 }); window.__cq.game.input.yaw = 0; window.__cq.runFrames(5)');
  const before = await page.evaluate('window.__cq.player().pos.z');
  await page.keyboard.down('KeyW');
  await page.evaluate('window.__cq.runFrames(60)');
  await page.keyboard.up('KeyW');
  const after = await page.evaluate('window.__cq.player().pos.z');
  if (!(after < before - 2)) fail('boot', `W did not move the player (${before} -> ${after})`);
  await page.evaluate('window.__cq.runFrames(1)');
  await screenshot(page, 'boot');
  await page.close();
}
