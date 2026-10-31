// M4-43 (U-050): brighter lights at night. Down a street in Jiefangbei at 23:00, clear: signs, lit windows, the lamps'
// pools on the street; brighter than before (mean luminance of the frame, BEFORE measured on the build before).
const BEFORE = 3.9;
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=yuzhong&seed=1', 'nightlights');
  const lum = await page.evaluate(`(() => {
    const g = window.__cq.game, s = g.state, w = g.world;
    s.time = Math.floor(s.time / 86400) * 86400 + 23 * 3600; s.flags.clear = true; s.player.lamp = 0;
    // Standing in a main street near the Jiefangbei teleport, looking along it (the machines switched off for it).
    s.flags.god = true; for (const u of s.units) u.off = s.time + 1e9;
    const t = w.teleports.find(t => /jiefangbei/i.test(t.name));
    let best = null, bd = Infinity;
    for (const st of w.streets) if (st.kind === 'primary' || st.kind === 'secondary') for (let i = 1; i < st.pts.length; i++) {
      const [ax, az] = st.pts[i - 1], [bx, bz] = st.pts[i], mx = (ax + bx) / 2, mz = (az + bz) / 2, d = Math.hypot(mx - t.x, mz - t.z);
      if (d < bd && Math.hypot(bx - ax, bz - az) > 30) { bd = d; best = { mx, mz, dx: (bx - ax) / Math.hypot(bx - ax, bz - az), dz: (bz - az) / Math.hypot(bx - ax, bz - az) }; }
    }
    Object.assign(s.player.pos, { x: best.mx, y: t.y + 40, z: best.mz }); s.player.vel = { x: 0, y: 0, z: 0 }; s.player.mode = 'air';
    g.runFrames(240);
    g.input.yaw = Math.atan2(-best.dx, -best.dz); g.input.pitch = -0.05;
    g.runFrames(20);
    g.view.render(0, {});
    const gl = g.view.renderer.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, d = new Uint8Array(W * H * 4);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, d);
    let sum = 0; for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2];
    return sum / (d.length / 4) / 3;
  })()`);
  await screenshot(page, 'night-street');
  console.log(`night lights: ${lum.toFixed(1)} (before ${BEFORE})`);
  if (!(lum > BEFORE * 1.4)) fail('nightlights', `night street ${lum.toFixed(1)}, before ${BEFORE}`);
  await page.close();
}
