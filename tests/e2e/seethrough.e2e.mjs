// M4-89 (U-066): a trapdoor in an apartment floor seen as it is, not tiled over: standing on the floor beside one,
// looking down at it.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=yuzhong&seed=1', 'seethrough');
  const r = await page.evaluate(`(() => {
    const g = window.__cq.game, w = g.world, s = g.state;
    // An inside one: a hatch with a floor round it 3 m or more over the ground.
    const h = w.props.find(p => p.kind === 'hatch' && p.y > 3 + (window.__cq.heightAt?.(p.x, p.z) ?? 0) && w.decor.some(d => d.y1 - d.y0 <= 0.06 && Math.abs(d.y0 - p.y) < 0.2 && Math.hypot((d.x0 + d.x1) / 2 - p.x, (d.z0 + d.z1) / 2 - p.z) < 3));
    if (!h) return null;
    Object.assign(s.flags, { clear: true, noclip: true }); s.time = 13 * 3600; s.player.lamp = 1;
    Object.assign(s.player.pos, { x: h.x + 1.3, y: h.y + 0.05, z: h.z }); s.player.vel = { x: 0, y: 0, z: 0 };
    g.input.yaw = Math.PI / 2; g.input.pitch = -1.1; g.runFrames(20);
    return { x: h.x, y: h.y, z: h.z, text: h.text };
  })()`);
  if (!r) { fail('seethrough', 'no trapdoor in an apartment floor found'); return; }
  await screenshot(page, 'seethrough-trapdoor');
  console.log(`seethrough: trapdoor ${r.text} at ${r.x.toFixed(1)}, ${r.y.toFixed(1)}, ${r.z.toFixed(1)}`);
}
