// M5-23b: a roller shutter on a shopfront in the city, down, then prised up its crawl gap (logs/shutter.png,
// logs/shutter-up.png).
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'shutter');
  const r = await page.evaluate(`(() => { const g = window.__cq.game, p = g.state.player, sh = g.world.inter.filter(i => i.data && i.data.shutter);
    if (!sh.length) return null;
    sh.sort((a, b) => Math.hypot(a.x - p.pos.x, a.z - p.pos.z) - Math.hypot(b.x - p.pos.x, b.z - p.pos.z));
    const it = sh[0], b = g.world.index.solids[it.data.solid], e = b.rot || b, alongX = e.x1 - e.x0 > e.z1 - e.z0;
    // Out in front of it, in the street (whichever side is clear), looking at it.
    for (const s of [1, -1]) { const x = it.x + (alongX ? 0 : 3 * s), z = it.z + (alongX ? 3 * s : 0); Object.assign(p.pos, { x, y: it.y - 1.1, z }); g.input.yaw = Math.atan2(-(it.x - x), -(it.z - z)); g.input.pitch = -0.1; g.state.time = 12 * 3600; g.state.flags.god = true; window.__cq.runFrames(10); if (Math.hypot(p.pos.x - x, p.pos.z - z) < 0.5) break; }
    return it.id; })()`);
  if (!r) { fail('shutter', 'no roller shutters in the city'); await page.close(); return; }
  await screenshot(page, 'shutter');
  await page.evaluate(`(() => { const g = window.__cq.game; g.state.wstate.open[${JSON.stringify(r)}] = true; window.__cq.runFrames(5); })()`);
  await screenshot(page, 'shutter-up');
  await page.close();
}
