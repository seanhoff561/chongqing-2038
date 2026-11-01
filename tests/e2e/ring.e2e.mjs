// M4-49: holding F at a cabinet fills a ring round the dot at the cabinet's own speed, then it opens.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=gym&seed=1', 'ring');
  await page.evaluate(`(() => { const g = window.__cq.game, p = g.state.player.pos; g.state.time = 12 * 3600;
    g.world.inter.push({ id: 'ring-cab', kind: 'container', x: p.x, y: p.y + 0.6, z: p.z - 1.2, r: 0.6, zh: '柜子', en: 'Cabinet', data: { type: 'cabinet' } });
    g.input.yaw = 0; g.input.pitch = -0.4; g.runFrames(3); })()`);
  const target = await page.evaluate('window.__cq.game.state.target');
  if (target !== 'ring-cab') fail('ring', `looking at ${target}`);
  await page.keyboard.down('KeyF');
  // The page's own loop runs on as well, so watch the ring fill and catch it part way.
  const seen = [];
  for (let i = 0; i < 40; i++) {
    const r = await page.evaluate(`(() => { window.__cq.runFrames(1); const r = document.querySelector('#hud .ring'), f = document.querySelector('#hud .ring .fill');
      return { shown: getComputedStyle(r).display !== 'none', off: Number(f.style.strokeDashoffset), open: window.__cq.game.state.openContainer }; })()`);
    if (r.shown) seen.push(r.off);
    if (r.shown && r.off > 0.2 && r.off < 0.8) { await screenshot(page, 'ring'); break; }
    if (r.open) break;
  }
  if (!seen.some(o => o > 0.2 && o < 0.8)) fail('ring', `the ring never seen part way: ${seen.join(' ')}`);
  await page.evaluate('window.__cq.runFrames(30)');
  await page.keyboard.up('KeyF');
  const opened = await page.evaluate('window.__cq.game.state.openContainer');
  if (opened !== 'ring-cab') fail('ring', `opened ${opened}`);
  await page.close();
}
