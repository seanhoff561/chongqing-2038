// M4-63 (U-052): a raid breaking in wakes him to sirens and red light flashing round the chamber. In the start
// hideout at 02:00 with his lamp off: the chamber lit red with the beacon on, dark with it off; the siren sounds.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=run&seed=1', 'raidsiren');
  await page.mouse.click(480, 270);
  const r = await page.evaluate(`(async () => {
    const g = window.__cq.game, s = g.state, w = g.world, gr = w.inter.find(i => i.id === 'airraid-grate');
    await g.audio.ctx?.resume();
    s.time = Math.floor(s.time / 86400) * 86400 + 2 * 3600; s.flags.clear = true; s.flags.god = true; s.player.lamp = 0;
    const sp = w.teleports.find(t => t.name.startsWith("Friends' hideout"));
    Object.assign(s.player.pos, { x: sp.x, y: sp.y, z: sp.z }); s.player.vel = { x: 0, y: 0, z: 0 };
    g.input.yaw = Math.atan2(-(gr.x - sp.x), -(gr.z - sp.z)); g.input.pitch = -0.05;
    s.raid = { id: 'airraid-mattress', at: s.time + 3600, x: gr.x, y: gr.y - 2, z: gr.z };
    const sirens = g.sound.raidSirens;
    g.runFrames(60);
    const red = on => {
      g.raidLight.update(on ? 0.05 : 0.3, s.raid, g.view.fp.cam.position); g.view.render(0, {});
      const gl = g.view.renderer.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, d = new Uint8Array(400 * 240 * 4);
      gl.readPixels((W >> 1) - 200, (H >> 1) - 120, 400, 240, gl.RGBA, gl.UNSIGNED_BYTE, d);
      let R = 0, G = 0; for (let i = 0; i < d.length; i += 4) { R += d[i]; G += d[i + 1]; }
      return { R: R / (d.length / 4), G: G / (d.length / 4) };
    };
    const lit = red(true), dark = red(false);
    g.raidLight.update(0.05, s.raid, g.view.fp.cam.position);
    return { lit, dark, sirens: g.sound.raidSirens - sirens };
  })()`);
  await screenshot(page, 'raid-light');
  await page.evaluate(`(() => { const g = window.__cq.game; g.state.raid = undefined; g.runFrames(1); })()`);
  if (!(r.lit.R > r.dark.R + 15 && r.lit.R > r.lit.G * 2)) fail('raidsiren', `the chamber not lit red by the beacon: ${JSON.stringify(r)}`);
  if (!(r.sirens >= 1)) fail('raidsiren', 'no siren');
  console.log(`raidsiren: red ${r.dark.R.toFixed(1)} -> ${r.lit.R.toFixed(1)} (green ${r.lit.G.toFixed(1)}), sirens ${r.sirens}`);
}
