// M4-41 (U-050): the start hideout lit. In the chamber at noon, daylight down the vent; at night the alley's neon down
// it; both brighter than the chamber was (luminance over the middle of the view, BEFORE measured on the build before).
const BEFORE = { day: Number(process.env.HL_DAY ?? 0), night: Number(process.env.HL_NIGHT ?? 0) };
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=run&seed=1', 'hideout-light');
  const lum = hour => page.evaluate(`(() => {
    const g = window.__cq.game, s = g.state, w = g.world, bed = w.inter.find(i => i.id === 'airraid-mattress'), gr = w.inter.find(i => i.id === 'airraid-grate');
    s.time = Math.floor(s.time / 86400) * 86400 + ${hour} * 3600; s.flags.clear = true; s.player.lamp = 0;
    const sp = w.teleports.find(t => t.name.startsWith("Friends' hideout"));
    Object.assign(s.player.pos, { x: sp.x, y: sp.y, z: sp.z }); s.player.vel = { x: 0, y: 0, z: 0 };
    // Looking along the chamber toward the foot of the shaft.
    g.input.yaw = Math.atan2(-(gr.x - sp.x), -(gr.z - sp.z)); g.input.pitch = -0.05;
    g.runFrames(30);
    g.view.render(0, {});
    const gl = g.view.renderer.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, d = new Uint8Array(400 * 240 * 4);
    gl.readPixels((W >> 1) - 200, (H >> 1) - 120, 400, 240, gl.RGBA, gl.UNSIGNED_BYTE, d);
    let t = 0; for (let i = 0; i < d.length; i += 4) t += d[i] + d[i + 1] + d[i + 2];
    return t / (d.length / 4) / 3;
  })()`);
  const day = await lum(12);
  await screenshot(page, 'hideout-day');
  const night = await lum(23);
  await screenshot(page, 'hideout-night');
  console.log(`hideout light: day ${day.toFixed(1)} (before ${BEFORE.day}), night ${night.toFixed(1)} (before ${BEFORE.night})`);
  if (BEFORE.day && !(day > BEFORE.day * 1.5 + 4)) fail('hideout-light', `day ${day.toFixed(1)} not brighter than ${BEFORE.day}`);
  if (BEFORE.night && !(night > BEFORE.night * 1.5 + 4)) fail('hideout-light', `night ${night.toFixed(1)} not brighter than ${BEFORE.night}`);
  await page.close();
}
