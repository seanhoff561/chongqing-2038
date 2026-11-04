// M9-12: the frame's cost at the High preset at 10 viewpoints across Yuzhong, by day and by night: the sim tick's
// and the render's JS time, the draw calls and the triangles, written to logs/framecost.json (and compared with the
// last run's there, so a change shows before and after). The render's time here is software rendering's
// (SwiftShader), not a GPU's; the real frame rate is the director's to tell. The sim tick must stay well under a 144 fps frame.
import fs from 'fs';
export default async function ({ open, fail }) {
  const page = await open('?scenario=yuzhong&seed=1', 'framecost');
  await page.evaluate(`window.__cq.game.setPreset('high')`);
  const views = ['jiefangbei', 'shibati', 'jiaochangkou', 'hongyadong', 'xiaoshizi', 'chaotianmen', 'cablewayNorth', 'jiefangbei', 'shibati', 'chaotianmen'];
  const rows = [];
  for (const [i, name] of views.entries()) {
    const hour = i < 7 ? 13 : 22;
    rows.push(await page.evaluate(`(() => { const g = window.__cq.game, t = g.world.teleports.find(t => t.name === '${name}'); g.state.time = ${hour} * 3600; g.state.flags.god = true;
      Object.assign(g.state.player.pos, { x: t.x, y: t.y, z: t.z }); g.input.yaw = ${i} * 0.9; g.input.pitch = 0;
      for (let k = 0; k < 4; k++) g.runFrames(1);
      // (Everything near streamed in first, so each run measures the same: M9-12.)
      for (let k = 0; k < 200 && g.view.streamStep(g.view.fp.cam.position, 100); k++);
      g.runFrames(1);
      let tick = 0, ren = 0; const N = 4;
      for (let k = 0; k < N; k++) { for (let j = 0; j < 30; j++) { const t0 = performance.now(); g.tick(); tick += performance.now() - t0; } const t1 = performance.now(); g.render(1, 1 / 60); ren += performance.now() - t1; }
      const inf = g.view.renderer.info.render;
      return { at: '${name}@${hour}', tick: +(tick / N / 30).toFixed(3), render: +(ren / N).toFixed(1), calls: inf.calls, tris: inf.triangles }; })()`));
  }
  const avg = k => +(rows.reduce((a, r) => a + r[k], 0) / rows.length).toFixed(3);
  const now = { when: new Date().toISOString(), tick: avg('tick'), render: avg('render'), calls: avg('calls'), rows };
  let last = null;
  try { last = JSON.parse(fs.readFileSync('logs/framecost.json', 'utf8')).now; } catch { /* the first run */ }
  fs.writeFileSync('logs/framecost.json', JSON.stringify({ now, last }, null, 1));
  console.log(`framecost: tick ${now.tick} ms, render ${now.render} ms (software), ${now.calls} calls${last ? `; last run tick ${last.tick}, calls ${last.calls}` : ''}`);
  if (now.tick > 6.9) fail('framecost', `the sim tick averages ${now.tick} ms: over a 144 fps frame`);
  if (rows.some(r => r.calls > 600)) fail('framecost', `draw calls over 600: ${rows.filter(r => r.calls > 600).map(r => r.at + ' ' + r.calls).join(', ')}`);
  await page.close();
}
