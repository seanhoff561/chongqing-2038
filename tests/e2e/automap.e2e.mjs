// M5-06, M10-14 (U-104): Anna's Map page shows the whole city from the start, every building by its type before he's
// been anywhere; walking, the 10 m cells he goes through are noted (logs/automap.png).
const KNOWN = [[154, 128, 80], [90, 138, 168], [98, 168, 120], [176, 120, 56], [192, 74, 54], [88, 84, 74]];
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'automap');
  // (Midday, and nothing kills him on the way: the map's what's tested.)
  await page.evaluate('(() => { const g = window.__cq.game; g.state.flags.god = true; g.state.time = 12 * 3600; window.__cq.runFrames(60); })()');
  const look = async () => {
    await page.keyboard.press('Tab');
    await page.evaluate('window.__cq.runFrames(3)'); // (open first: the sim takes the Tab)
    await page.evaluate(`(() => { const L = window.__cq.game.laptop; L.page = 0; window.__cq.runFrames(20); })()`);
    const r = await page.evaluate(`(() => { const el = document.querySelector('#laptop .lt-win.front .lt-content'), g = window.__cq.game;
      if (!el) return { n: 0, text: 'not out: ' + JSON.stringify({ open: g.state.laptop?.open, mode: g.state.player.mode, grip: g.state.player.hands.map(h => !!h.grip) }) };
      const c = el.querySelector('canvas'), K = ${JSON.stringify(KNOWN)};
      const n = Object.keys(window.__cq.game.state.explored ?? {}).length;
      if (!c) return { n, text: el.textContent };
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, near = (i, q) => Math.abs(d[i] - q[0]) + Math.abs(d[i + 1] - q[1]) + Math.abs(d[i + 2] - q[2]) < 6;
      let known = 0;
      for (let i = 0; i < d.length; i += 4) if (K.some(q => near(i, q))) known++;
      return { n, text: el.textContent, kpx: known }; })()`);
    await page.keyboard.press('Tab');
    await page.evaluate('window.__cq.runFrames(3)');
    return r;
  };
  const a = await look();
  if (!(a.kpx > 2000)) fail('automap', `the city's buildings aren't on the map by type from the start: ${JSON.stringify(a).slice(0, 300)}`);
  await page.keyboard.down('KeyW'); await page.keyboard.down('ShiftLeft');
  for (let i = 0; i < 60; i++) await page.evaluate('window.__cq.runFrames(5)');
  await page.keyboard.up('ShiftLeft'); await page.keyboard.up('KeyW');
  await page.keyboard.press('Tab');
  await page.evaluate('window.__cq.runFrames(3)');
  await page.evaluate(`(() => { window.__cq.game.laptop.page = 0; window.__cq.runFrames(20); })()`);
  await screenshot(page, 'automap');
  await page.keyboard.press('Tab');
  await page.evaluate('window.__cq.runFrames(3)');
  const b = await look();
  if (!(b.n > a.n)) fail('automap', `walking explored no cells: ${a.n} then ${b.n}`);
  if (!b.text.includes(`${b.n} cells explored`)) fail('automap', `the page doesn't count the cells: ${b.text.slice(0, 200)}`);
  // M5-09: a tapped camera's feed on the Cams page (page 5): the city as it sees it, not a blank (logs/camfeed.png).
  await page.keyboard.press('Tab');
  await page.evaluate(`(() => { const g = window.__cq.game, p = g.state.player.pos, C = g.world.cameras;
    let best = -1, bd = 1e9; C.forEach((c, i) => { const d = Math.hypot(c.x - p.x, c.z - p.z); if (c.kind !== 'turret' && c.box && d < bd) { bd = d; best = i; } });
    g.state.taps = [best]; window.__cq.runFrames(3); g.laptop.page = 5; window.__cq.runFrames(20); })()`);
  const feed = await page.evaluate(`(() => { const c = document.querySelector('#laptop .lt-feed canvas'); if (!c) return null;
    const d = c.getContext('2d').getImageData(0, 20, c.width, c.height - 20).data; let lo = 255, hi = 0, sum = 0;
    for (let i = 0; i < d.length; i += 4) { lo = Math.min(lo, d[i + 1]); hi = Math.max(hi, d[i + 1]); sum += d[i + 1]; }
    return { lo, hi, mean: sum / (d.length / 4), text: document.querySelector('#laptop .lt-win.front .lt-content').textContent }; })()`);
  if (!feed || feed.hi - feed.lo < 60 || feed.mean < 15) fail('automap', `the camera feed is blank: ${JSON.stringify(feed)}`);
  await screenshot(page, 'camfeed');
  await page.close();
}
