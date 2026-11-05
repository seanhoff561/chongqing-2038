// M3-67, M10-50 (U-104): a lamppost from the pavement, the side of its post he climbs (the added poles with step bolts
// are gone). (The plank across to a line of stubs up a taller wall went with the lines, U-044.)
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'climbing');
  const ok = await page.evaluate(`(() => {
    const g = window.__cq.game, cs = g.world.climbables.filter(c => c.kind === 'post' && c.y1 - c.y0 > 5), c = cs[Math.min(cs.length - 1, 20)];
    if (!c) return false;
    g.state.time = 14 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; g.state.flags.god = true;
    // From 5 m out on its climbing side, at eye height, looking a little up it.
    Object.assign(g.state.player.pos, { x: c.x + c.nx * 5, y: c.y0 + 1.7, z: c.z + c.nz * 5 });
    g.input.yaw = Math.atan2(c.nx, c.nz); g.input.pitch = 0.35;
    window.__cq.runFrames(10);
    return true;
  })()`);
  if (!ok) fail('climbing', 'no lamppost');
  else await screenshot(page, 'climbing-pole');
  await page.close();
}
