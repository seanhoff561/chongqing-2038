// M10-61 (U-107): the ground is drawn, not see-through: from a drone over the open ground, a lawn and a street, day and
// night, the view straight down differs from the same view with the world hidden (only the sky dome left), and every
// shader program compiled runnable (logs/opaque-*.png).
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=yuzhong&seed=1', 'opaque');
  const spots = await page.evaluate(`(() => {
    const w = window.__cq.game.world, G = w.ground, mid = (a, b) => (a + b) / 2;
    const lawn = w.lawns?.find(p => p.length >= 3), st = w.streets.find(s => s.pts.length >= 2 && !s.steps);
    const out = [{ name: 'ground', x: G.x0 + G.cell * G.w * 0.5, z: G.z0 + G.cell * G.h * 0.55 }];
    if (lawn) out.push({ name: 'lawn', x: lawn.reduce((s, p) => s + p[0], 0) / lawn.length, z: lawn.reduce((s, p) => s + p[1], 0) / lawn.length });
    if (st) out.push({ name: 'street', x: mid(st.pts[0][0], st.pts[1][0]), z: mid(st.pts[0][1], st.pts[1][1]) });
    return out;
  })()`);
  if (spots.length < 3) fail('opaque', `no lawn or street to look at: ${spots.map(s => s.name)}`);
  for (const sp of spots) for (const hour of [13, 23]) {
    const r = await page.evaluate(`(() => {
      const g = window.__cq.game, s = g.state, G = g.world.ground, v = g.view;
      const i = Math.round((${sp.x} - G.x0) / G.cell), j = Math.round((${sp.z} - G.z0) / G.cell), y = G.y[Math.max(0, Math.min(G.h - 1, j)) * G.w + Math.max(0, Math.min(G.w - 1, i))];
      window.__cq.give('drone'); s.flags.clear = true; s.time = ${hour} * 3600;
      s.flight = { x: ${sp.x}, y: y + 22, z: ${sp.z}, yaw: 0, pitch: -1.5, seen: 0 };
      window.__cq.runFrames(30);
      const gl = v.renderer.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, n = 120, px = () => { const d = new Uint8Array(n * n * 4); gl.readPixels((W - n) >> 1, (H - n) >> 1, n, n, gl.RGBA, gl.UNSIGNED_BYTE, d); return d; };
      v.render(0, {}); const a = px();
      v.world.visible = false; v.render(0, {}); const b = px(); v.world.visible = true; v.render(0, {});
      let diff = 0; for (let k = 0; k < a.length; k += 4) diff += Math.abs(a[k] - b[k]) + Math.abs(a[k + 1] - b[k + 1]) + Math.abs(a[k + 2] - b[k + 2]);
      const bad = v.renderer.info.programs.filter(p => p.diagnostics && !p.diagnostics.runnable).map(p => p.name);
      return { diff: diff / (n * n * 3), bad, flying: !!s.flight };
    })()`);
    if (!r.flying) fail('opaque', `${sp.name}: the drone didn't fly`);
    if (r.bad.length) fail('opaque', `shaders that failed: ${r.bad.join(', ')}`);
    if (!(r.diff > 6)) fail('opaque', `${sp.name} at ${hour}h: the ground looks like the sky under it (mean diff ${r.diff.toFixed(1)})`);
    if (hour === 13) await screenshot(page, `opaque-${sp.name}`);
    console.log(`opaque: ${sp.name} ${hour}h diff ${r.diff.toFixed(1)}`);
  }
  await page.close();
}
