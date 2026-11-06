// M3-26 (U-012): soft sun shadows, baked occlusion and filmic tone mapping; screenshots by day, dusk and night;
// the shadow pass costs a bounded share of the frame.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'lighting');
  const at = h => page.evaluate(`(() => { const g = window.__cq.game, T = n => g.world.teleports.find(t => t.name === n), s = T('shibati'); g.state.time = ${h} * 3600; const p = g.state.player; Object.assign(p.pos, { x: s.x, y: s.y - 1.45, z: s.z }); p.fallFrom = p.pos.y; g.input.yaw = 2.42; g.input.pitch = -0.1; window.__cq.runFrames(20); return g.view.sun.castShadow; })()`);
  if (!(await at(15))) fail('lighting', 'no sun shadow by day');
  await screenshot(page, 'light-day');
  await at(18.6);
  await screenshot(page, 'light-dusk');
  if (await at(23)) fail('lighting', 'sun shadow at night');
  await screenshot(page, 'light-night');
  // (Each frame's CPU timed from an idle GPU: software GL takes seconds to raster one of these frames, so frames drawn
  // back to back time its backlog (the shaders just compiled, the frames queued), not this frame's work.)
  const cost = on => page.evaluate(`(() => { const g = window.__cq.game, gl = g.view.renderer.getContext(), px = new Uint8Array(4), idle = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); g.state.time = 15 * 3600; window.__cq.runFrames(1); g.view.sun.castShadow = ${on}; for (let i = 0; i < 5; i++) { g.view.render(); idle(); } let t = 0; for (let i = 0; i < 20; i++) { const t0 = performance.now(); g.view.render(); t += performance.now() - t0; idle(); } return t / 20; })()`);
  const off = await cost(false), on = await cost(true);
  console.log(`  lighting: frame ${off.toFixed(1)} ms without shadows, ${on.toFixed(1)} ms with`);
  if (on > off * 2.2) fail('lighting', `shadows cost too much: ${off.toFixed(1)} -> ${on.toFixed(1)} ms`);
  await page.close();
}
