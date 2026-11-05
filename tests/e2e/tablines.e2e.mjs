// M10-53 (U-104): the laptop out, the map first: Anna's word on the family flat; turned to Scan and left there a moment,
// her line on it; flicked past Notes, nothing; back on Scan, nothing again.
export default async function ({ open, fail }) {
  const page = await open('?scenario=hideout&seed=1', 'tablines');
  await page.evaluate(`(() => { const g = window.__cq.game; window.__said = []; const say = g.hud.say.bind(g.hud); g.hud.say = en => { window.__said.push(en); say(en); }; window.__cq.runFrames(10); })()`);
  await page.keyboard.press('Tab');
  const step = js => page.evaluate(`(() => { const g = window.__cq.game; ${js}; for (let i = 0; i < 6; i++) window.__cq.runFrames(15); return window.__said.splice(0); })()`);
  const map = await step('');
  if (!map.some(l => l.startsWith('This is the map.'))) fail('tablines', `the map's first look: ${JSON.stringify(map)}`);
  // (Status, then Scan, stayed on.)
  await step('g.laptop.turn(1)');
  const scan = await step('g.laptop.turn(1)');
  if (scan.length !== 1 || !scan[0].startsWith('Scan.')) fail('tablines', `on Scan: ${JSON.stringify(scan)}`);
  const past = await page.evaluate(`(() => { const g = window.__cq.game; g.laptop.turn(1); window.__cq.runFrames(10); g.laptop.turn(-1); for (let i = 0; i < 6; i++) window.__cq.runFrames(15); return window.__said.splice(0); })()`);
  if (past.length) fail('tablines', `flicked past Notes, or Scan again: ${JSON.stringify(past)}`);
  if (JSON.stringify(await page.evaluate('window.__cq.game.state.tabs')) !== '["scan"]') fail('tablines', 'not remembered in the run');
  await page.keyboard.press('Tab');
  await page.evaluate('window.__cq.runFrames(5)');
  await page.close();
}
