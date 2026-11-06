// M3-53 (U-022), M4-83b (U-061): the frame budget for 150 fps (6.7 ms a frame), by day and at night. At four Yuzhong viewpoints (a street, a rooftop,
// the tunnel, the overview) the draw calls and triangles stay in budget, and so does the CPU of a frame: a sim tick
// plus building and submitting the render. GPU time can't be measured headlessly (software WebGL); the director
// reports the real frame rate (asked of the director).
// A frame's CPU cost as D-132 counts it (as framecost.e2e does): the game's own frame JS, 0.4 of a 60 Hz sim tick and
// SUBMIT a draw call handed to three.js, at most 6.6 ms; software GL can't time a real driver's submission (U-027).
// The draw-call and triangle budgets are the game's own (window.__cq.gfx.budget).
const SUBMIT = 0.015, CPU = 6.6;

export default async function ({ open, fail }) {
  const page = await open('?scenario=shibati&seed=1', 'perf');
  const BUDGET = await page.evaluate('window.__cq.gfx.budget');
  // [name, teleport, up from the feet, yaw, pitch]
  const views = [['street', 'jiaochangkou', 0, 0, -0.05], ['rooftop', 'shibati', 25, -0.585, -0.1], ['tunnel', "Friends' hideout (vent grate)", 0, 0.4, 0], ['overview', 'jiefangbei', 120, 2.6, -0.35]];
  // (By day and at night, M4-83b: the night's lamps and lit windows cost too.)
  for (const [name, tp, up, yaw, pitch, hour] of views.flatMap(v => [[...v, 14], [`${v[0]} at night`, ...v.slice(1), 23]])) {
    const r = await page.evaluate(`(async () => {
      const g = window.__cq.game, s = g.world.teleports.find(t => t.name === ${JSON.stringify(tp)});
      g.state.time = ${hour} * 3600; g.state.flags.clear = true; g.state.flags.noclip = ${up > 0};
      Object.assign(g.state.player.pos, { x: s.x, y: s.y - 1.45 + ${up}, z: s.z }); g.input.yaw = ${yaw}; g.input.pitch = ${pitch};
      window.__cq.runFrames(30);
      // The sim: a second of ticks standing still.
      let t0 = performance.now();
      for (let i = 0; i < 60; i++) g.tick();
      const sim = (performance.now() - t0) / 60;
      // A frame's render on the CPU, each from an idle GPU so the software GPU behind it never holds the page up (a
      // pause no longer does: it takes seconds to raster one frame, and the game's own loop draws more meanwhile); the
      // median of 25, as this machine's other work makes single frames noisy.
      // (The game's own frame work timed apart from three.js drawing it: renderer.render wrapped.)
      const times = [], gl = g.view.renderer.getContext(), px = new Uint8Array(4), idle = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const R = g.view.renderer, draw = R.render.bind(R); let drawn = 0;
      R.render = (sc, cam) => { const t = performance.now(); draw(sc, cam); drawn += performance.now() - t; };
      for (let i = 0; i < 28; i++) {
        idle();
        drawn = 0; t0 = performance.now(); g.render(1, 1 / 60); if (i >= 3) times.push(performance.now() - t0 - drawn);
      }
      R.render = draw;
      times.sort((a, b) => a - b);
      const render = times[times.length >> 1], worst = times[Math.floor(times.length * 0.9)];
      const info = g.view.renderer.info.render;
      return { sim, render, worst, calls: info.calls, tris: info.triangles };
    })()`);
    const cpu = r.render + 0.4 * r.sim + SUBMIT * r.calls;
    console.log(`  perf ${name}: ${r.calls} calls, ${(r.tris / 1000).toFixed(0)}k tris, sim ${r.sim.toFixed(2)} ms, frame JS ${r.render.toFixed(2)} ms (90th ${r.worst.toFixed(2)}): ${cpu.toFixed(2)} ms a frame`);
    // (No frame of its own work twice the usual or worse: no stalls from garbage made every frame, M4-83b.)
    if (r.worst > 2 * r.render + 1) fail('perf', `${name}: a slow frame, ${r.worst.toFixed(2)} ms against ${r.render.toFixed(2)} usually`);
    if (r.calls > BUDGET.calls) fail('perf', `${name}: ${r.calls} draw calls (budget ${BUDGET.calls})`);
    if (r.tris > BUDGET.tris) fail('perf', `${name}: ${r.tris} triangles (budget ${BUDGET.tris})`);
    if (cpu > CPU) fail('perf', `${name}: ${cpu.toFixed(2)} ms of CPU a frame (budget ${CPU})`);
  }
  await page.close();
}
