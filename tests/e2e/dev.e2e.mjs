// M1-24: dev panel, teleports, seed parsing.
export default async function ({ open, fail }) {
  const page = await open('?scenario=hideout&seed=4242&dev=1', 'dev');
  if (!(await page.$('#dev'))) fail('dev', 'no dev panel');
  const seed = await page.evaluate('window.__cq.game.state.seed');
  if (seed !== 4242) fail('dev', `seed ${seed}`);
  // The hideout's third teleport: the street above, at (6, 9, 0).
  await page.select('#dev .tp', '2');
  await page.evaluate('window.__cq.runFrames(5)');
  const p = await page.evaluate('({ ...window.__cq.player().pos })');
  if (Math.abs(p.x - 6) > 1 || Math.abs(p.y - 9) > 1) fail('dev', `teleport went to ${JSON.stringify(p)}`);
  await page.click('#dev .noclip');
  const nc = await page.evaluate('window.__cq.game.state.flags.noclip');
  if (!nc) fail('dev', 'noclip toggle');
  await page.close();
}
