// M10-04 (U-104; M9-12, M6-26): a frame's cost at the one graphics level (medium) at 10 viewpoints across Yuzhong, by
// day and by night: the sim tick's and the render's JS time, the draw calls and the triangles, written to
// logs/framecost.json (with the last run's, so a change shows before and after). A frame's CPU cost is the game's own
// JS for the frame, the share of a 60 Hz sim tick one 150 fps frame carries (0.4 of one) and its draw calls handed to
// three.js (SUBMIT each); it must average at most 6.6 ms, and
// every view stay within the draw-call and triangle budgets (render/view.ts GFX). The render's time here includes
// no rasterising: it's drawn into a 32 x 18 canvas (a GPU's own time is the director's to tell, with the real frame rate).
import fs from 'fs';
/** What handing three.js one draw call to the GPU costs a desktop browser's JS, roughly (ms): software GL here can't show it. */
const SUBMIT = 0.015;
export default async function ({ open, fail }) {
  const page = await open('?scenario=yuzhong&seed=1', 'framecost');
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
      // (Drawn into a postage stamp, so the time is the JS and the calls', not software rasterising's; warmed first,
      // then the median of 9.)
      const R = g.view.renderer;
      R.setSize(32, 18, false); for (let k = 0; k < 30; k++) g.render(1, 1 / 60);
      // (The game's own frame work timed apart from three.js drawing it: renderer.render wrapped.)
      let tick = 0, gl = 0; const ren = [], upd = [], draw = R.render.bind(R);
      R.render = (sc, cam) => { const t = performance.now(); draw(sc, cam); gl += performance.now() - t; };
      for (let k = 0; k < 9; k++) { for (let j = 0; j < 10; j++) { const t0 = performance.now(); g.tick(); tick += performance.now() - t0; } gl = 0; const t1 = performance.now(); g.render(1, 1 / 60); const all = performance.now() - t1; ren.push(all); upd.push(all - gl); }
      R.render = draw;
      ren.sort((a, b) => a - b); upd.sort((a, b) => a - b);
      const inf = R.info.render, calls = inf.calls, tris = inf.triangles;
      R.setSize(innerWidth, innerHeight, false);
      return { at: '${name}@${hour}', tick: +(tick / 90).toFixed(3), update: +upd[4].toFixed(2), render: +ren[4].toFixed(2), calls, tris }; })()`));
  }
  const B = await page.evaluate('window.__cq.gfx.budget');
  const avg = k => +(rows.reduce((a, r) => a + r[k], 0) / rows.length).toFixed(3);
  const now = { when: new Date().toISOString(), tick: avg('tick'), update: avg('update'), render: avg('render'), frame: +(avg('update') + 0.4 * avg('tick') + SUBMIT * avg('calls')).toFixed(2), calls: avg('calls'), tris: avg('tris'), rows };
  let last = null;
  try { last = JSON.parse(fs.readFileSync('logs/framecost.json', 'utf8')).now; } catch { /* the first run */ }
  fs.writeFileSync('logs/framecost.json', JSON.stringify({ now, last }, null, 1));
  console.log(`framecost: frame ${now.frame} ms (tick ${now.tick}, update ${now.update}, render ${now.render}), ${now.calls} calls, ${Math.round(now.tris / 1000)}k tris${last ? `; last run frame ${last.frame ?? '?'}, tick ${last.tick}, render ${last.render}, calls ${last.calls}` : ''}`);
  if (now.frame > 6.6) fail('framecost', `a frame's CPU cost averages ${now.frame} ms: over a 150 fps frame`);
  for (const r of rows) {
    if (r.calls > B.calls) fail('framecost', `${r.at}: ${r.calls} draw calls (budget ${B.calls})`);
    if (r.tris > B.tris) fail('framecost', `${r.at}: ${Math.round(r.tris / 1000)}k triangles (budget ${B.tris / 1000}k)`);
  }
  await page.close();
}
