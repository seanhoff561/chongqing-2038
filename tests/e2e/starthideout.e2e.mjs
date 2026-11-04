// M3-42 (U-018): a run starts in the friends' hideout; looking up the vent shaft at night, the grate against the
// shop neon above. M3-72 (U-038): up top, the grate under its bags in the alley,
// the neon on the walls over it.
export default async function ({ open, screenshot, fail }) {
  const page = await open('?scenario=run&seed=1', 'starthideout');
  const r = await page.evaluate(`(() => { const g = window.__cq.game, v = g.world.inter.find(i => i.id === 'airraid-grate'); return { d: Math.hypot(g.state.player.pos.x - v.x, g.state.player.pos.z - v.z), under: v.y - g.state.player.pos.y }; })()`);
  if (!(r.d < 15 && r.under > 7)) fail('starthideout', 'run did not start in the hideout: ' + JSON.stringify(r));
  await page.evaluate(`(() => { const g = window.__cq.game; g.state.time = 22 * 3600; g.state.flags.clear = true; const v = g.world.props.find(q => q.kind === 'grate' && q.text === 'airraid-grate'); Object.assign(g.state.player.pos, { x: v.x, y: g.state.player.pos.y, z: v.z }); g.input.yaw = 0; g.input.pitch = 1.5; window.__cq.runFrames(10); })()`);
  await screenshot(page, 'starthideout-grate');
  // Up in the alley at night, looking back along it at the bags over the grate.
  await page.keyboard.press('Tab');
  await page.evaluate(`(() => { const g = window.__cq.game, c = g.world.props.find(q => q.kind === 'cover'), f = -g.world.props.find(q => q.text === '老巷小面').yaw, x = c.x + Math.cos(f) * 5, z = c.z + Math.sin(f) * 5; Object.assign(g.state.player.pos, { x, y: c.y + 0.05, z }); g.state.player.mode = 'ground'; g.input.yaw = Math.atan2(Math.cos(f), Math.sin(f)); g.input.pitch = 0.05; window.__cq.runFrames(30); })()`);
  await screenshot(page, 'starthideout-alley');
  await page.close();
}
