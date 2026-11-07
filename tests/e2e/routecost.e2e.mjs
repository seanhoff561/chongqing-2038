// M9-02: the frame's cost along the four ways out, at the one graphics level (medium, D-132), by day and by night: at
// points along each route (A the bridge: the substation, the checkpoint, the rail deck, out over the river, the far
// bank; B the cableway: the north station, the cabin, out over the river; C the boat: the river-police pier, its
// ladder, the river past Chaotianmen; D underground: the hideout's vent, the Grand Tunnel, the metro, the flooded
// extension) and at the places built since the last measures (Raffles City and The Crystal, Hongyadong, the border
// wall). At each point: the draw calls and triangles looking four ways (the most of them), and a frame's CPU cost
// looking along the route as framecost.e2e counts it (the game's own frame JS, 0.4 of a sim tick, 0.015 ms a draw
// call). Each point stays within the draw-call and triangle budgets (render/view.ts GFX) and each route's frames
// average at most 6.6 ms; written to logs/routecost.json. Real frame rates are the director's to report.
import fs from 'fs';
const SUBMIT = 0.015, CPU = 6.6;
export default async function ({ open, fail }) {
  const page = await open('?scenario=yuzhong&seed=1', 'routecost');
  // Each route's points: a teleport's, a feature's, or worked out in the page (along the cableway's rope, out to an
  // ending's zone); those at a way's far end just short of its ending's zone (inside it the run ends).
  const points = await page.evaluate(`(() => {
    const w = window.__cq.game.world, tp = n => { const t = w.teleports.find(t => t.name === n); return t && [t.x, t.y, t.z]; };
    const ft = k => { const f = w.features.find(f => f.kind === k); return f && [f.x, f.y + 0.1, f.z]; };
    const end = r => { const b = w.zones.find(z => z.kind === 'ending:' + r).box; return [(b.x0 + b.x1) / 2, b.y0, (b.z0 + b.z1) / 2]; };
    const mix = (a, b, t, dy = 0) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + dy, a[2] + (b[2] - a[2]) * t];
    const ends = w.zones.filter(z => z.kind.startsWith('ending:')).map(z => z.box);
    const inside = p => ends.some(b => p[0] > b.x0 - 5 && p[0] < b.x1 + 5 && p[1] > b.y0 - 5 && p[1] < b.y1 + 5 && p[2] > b.z0 - 5 && p[2] < b.z1 + 5);
    const short = (a, b) => { for (let t = 1; t > 0; t -= 0.005) { const p = mix(a, b, t); if (!inside(p)) return p; } return a; };
    const [N, S] = w.features.filter(f => f.kind === 'cable:rope').map(f => [f.x, f.y, f.z]);
    const deck = tp('Dongshuimen Bridge: rail deck'), bank = end('bridge'), farBank = [bank[0], bank[1] + 6.1, bank[2]];
    const ladder = tp('River-police pier: ladder'), open = end('boat'), river = [open[0], 13, open[2]], past = mix([ladder[0], 13, ladder[2]], river, 0.5);
    const wall = w.features.filter(f => f.kind === 'border:turret')[7];
    return {
      A: [['substation gate', tp('Xinhua Road substation: gate')], ['checkpoint', tp('Dongshuimen Bridge: checkpoint')], ['rail deck', deck], ['mid-span', mix(deck, farBank, 0.5)], ['far bank', short(deck, farBank)]],
      B: [['north station', tp('Yangtze cableway: door')], ['cabin', ft('cable:cabin')], ['over the river', mix(N, S, 0.3, -6)], ['the line out', short(mix(N, S, 0.3, -6), mix(N, S, 0.6, -6))]],
      C: [['pier gangway', tp('River-police pier: gangway')], ['pier ladder', ladder], ['past Chaotianmen', past], ['open river', short(past, river)]],
      D: [['hideout vent', tp("Friends' hideout (vent grate)")], ['Grand Tunnel', tp('Tunnel junction (north passage)')], ['metro junction', tp('Tunnel junction (metro)')], ['metro station', tp('Metro station Jiefangbei')], ['metro tunnel', tp('Metro tunnel')], ['extension door', ft('tunnelEnd:door')], ['extension end', short(ft('tunnelEnd:door'), ft('tunnel:end'))]],
      new: [['The Crystal', tp('The Crystal')], ['Chaotianmen square', tp('Chaotianmen square')], ['Hongyadong', tp('hongyadong')], ['Hongyadong riverfront', tp('Hongyadong riverfront')], ['border wall', wall && [wall.x + 30, wall.y + 2, wall.z]]],
    };
  })()`);
  const B = await page.evaluate('window.__cq.gfx.budget');
  const rows = [];
  // (Drawn into a postage stamp the whole time, the game's own loop too, so the time is the JS and the calls', not
  // software rasterising's.)
  await page.evaluate('window.__cq.game.view.renderer.setSize(32, 18, false)');
  for (const [route, pts] of Object.entries(points)) {
    for (const [i, [label, at]] of pts.entries()) {
      if (!at) { fail('routecost', `${route} ${label}: no such place`); continue; }
      // (Looking along the route, toward the next point, or on from the last one.)
      const to = pts[i + 1]?.[1], from = pts[i - 1]?.[1];
      const yaw = to ? Math.atan2(-(to[0] - at[0]), -(to[2] - at[2])) : from ? Math.atan2(-(at[0] - from[0]), -(at[2] - from[2])) : 0;
      for (const hour of [13, 22]) {
        const r = await page.evaluate(`(() => { const g = window.__cq.game, R = g.view.renderer; g.state.time = ${hour} * 3600; Object.assign(g.state.flags, { god: true, noclip: true, clear: true });
          Object.assign(g.state.player.pos, { x: ${at[0]}, y: ${at[1]}, z: ${at[2]} }); g.input.pitch = 0;
          const look = yaw => { g.input.yaw = yaw; for (let k = 0; k < 2; k++) g.runFrames(1); for (let k = 0; k < 200 && g.view.streamStep(g.view.fp.cam.position, 100); k++); g.runFrames(1); };
          const T = [performance.now()];
          // The most draw calls and triangles looking four ways.
          let calls = 0, tris = 0;
          for (let q = 0; q < 4; q++) { look(${yaw} + q * Math.PI / 2); g.render(1, 1 / 60); calls = Math.max(calls, R.info.render.calls); tris = Math.max(tris, R.info.render.triangles); T.push(performance.now()); }
          // A frame's CPU looking along the route: warmed, then the median of 9 (renderer.render wrapped, so the game's
          // own frame work is timed apart from three.js drawing it).
          look(${yaw}); T.push(performance.now()); for (let k = 0; k < 20; k++) g.render(1, 1 / 60); T.push(performance.now());
          let tick = 0, gl = 0; const upd = [], draw = R.render.bind(R);
          R.render = (sc, cam) => { const t = performance.now(); draw(sc, cam); gl += performance.now() - t; };
          for (let k = 0; k < 9; k++) { for (let j = 0; j < 10; j++) { const t0 = performance.now(); g.tick(); tick += performance.now() - t0; } gl = 0; const t1 = performance.now(); g.render(1, 1 / 60); upd.push(performance.now() - t1 - gl); }
          R.render = draw; upd.sort((a, b) => a - b);
          const along = R.info.render.calls;
          return { ended: !!g.state.ended || !!g.state.dead, tick: tick / 90, update: upd[4], along, calls, tris, ms: T.map((t, i) => Math.round(t - (T[i - 1] ?? t))).slice(1).concat(Math.round(performance.now() - T[T.length - 1])) }; })()`);
        if (r.ended) fail('routecost', `${route} ${label}@${hour}: the run ended there`);
        const cpu = +(r.update + 0.4 * r.tick + SUBMIT * r.along).toFixed(2);
        rows.push({ route, at: `${label}@${hour}`, cpu, tick: +r.tick.toFixed(2), update: +r.update.toFixed(2), calls: r.calls, tris: r.tris });
        // (Each point as it's measured, with how long its steps took, so a run cut short still shows what it found.)
        fs.appendFileSync('logs/routecost-progress.log', `${new Date().toISOString()} ${JSON.stringify(rows[rows.length - 1])} steps ${r.ms}\n`);
        if (r.calls > B.calls) fail('routecost', `${route} ${label}@${hour}: ${r.calls} draw calls (budget ${B.calls})`);
        if (r.tris > B.tris) fail('routecost', `${route} ${label}@${hour}: ${Math.round(r.tris / 1000)}k triangles (budget ${B.tris / 1000}k)`);
      }
    }
  }
  await page.evaluate('window.__cq.game.view.renderer.setSize(innerWidth, innerHeight, false)');
  const sum = {};
  for (const route of Object.keys(points)) {
    const rs = rows.filter(r => r.route === route), avg = k => +(rs.reduce((a, r) => a + r[k], 0) / rs.length).toFixed(2), max = k => Math.max(...rs.map(r => r[k]));
    sum[route] = { cpu: avg('cpu'), worstCpu: max('cpu'), calls: max('calls'), tris: max('tris') };
    console.log(`routecost ${route}: frame ${sum[route].cpu} ms (worst ${sum[route].worstCpu}), at most ${sum[route].calls} calls, ${Math.round(sum[route].tris / 1000)}k tris`);
    if (sum[route].cpu > CPU) fail('routecost', `route ${route}: a frame's CPU averages ${sum[route].cpu} ms (budget ${CPU})`);
  }
  fs.writeFileSync('logs/routecost.json', JSON.stringify({ when: new Date().toISOString(), sum, rows }, null, 1));
  await page.close();
}
