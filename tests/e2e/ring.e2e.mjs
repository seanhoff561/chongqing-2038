// M4-49: holding Interact (E) at a cabinet fills a ring round the dot at the cabinet's own speed, then it opens.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=gym&seed=1', 'ring');
  await page.evaluate(`(() => { const g = window.__cq.game, p = g.state.player.pos; g.state.time = 12 * 3600;
    g.world.inter.push({ id: 'ring-cab', kind: 'container', x: p.x, y: p.y + 0.6, z: p.z - 1.2, r: 0.6, zh: '柜子', en: 'Cabinet', data: { type: 'cabinet' } });
    g.input.yaw = 0; g.input.pitch = -0.4; g.runFrames(3); })()`);
  const target = await page.evaluate('window.__cq.game.state.target');
  if (target !== 'ring-cab') fail('ring', `looking at ${target}`);
  await page.keyboard.down('KeyE');
  // (Stepped a frame at a time inside one call, so the page's own loop can't run the fill on unseen.)
  const seen = await page.evaluate(`(() => { const out = []; for (let i = 0; i < 60; i++) { window.__cq.runFrames(1);
    const r = document.querySelector('#hud .ring'), f = document.querySelector('#hud .ring .fill');
    if (getComputedStyle(r).display !== 'none') out.push(Number(f.style.strokeDashoffset)); if (window.__cq.game.state.openContainer) break; } return out; })()`);
  if (seen.some(o => o > 0.2 && o < 0.8)) await screenshot(page, 'ring');
  if (!seen.some(o => o > 0.2 && o < 0.8)) fail('ring', `the ring never seen part way: ${seen.join(' ')}`);
  await page.evaluate('window.__cq.runFrames(30)');
  await page.keyboard.up('KeyE');
  const opened = await page.evaluate('window.__cq.game.state.openContainer');
  if (opened !== 'ring-cab') fail('ring', `opened ${opened}`);
  await page.close();
}
