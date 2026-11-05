// M10-49 (U-104): many machines without the lag. On the lineup's plaza at noon, a crowd walks its beats in front of him
// (forty humanoids, twenty quadrupeds, six street heavies, four carriers, three giant walkers and two colossi, with the
// lineup's own): a frame's cost with all of them in view, measured as in framecost (the sim tick's and the frame's JS,
// the draw calls, the triangles), written to logs/crowdcost.json with the last run's. A frame's CPU cost (the frame's
// JS, 0.4 of a sim tick, SUBMIT a draw call) must stay within a 150 fps frame, and the calls and triangles within the
// graphics budget.
import fs from 'fs';
const SUBMIT = 0.015;
export default async function ({ open, fail }) {
  const page = await open('?scenario=units&seed=1', 'crowdcost');
  const row = await page.evaluate(`(() => {
    const g = window.__cq.game, w = g.world, U = g.state.units;
    // The crowd: each on a beat of its own, a fan out in front of him (he stands at z 19 looking up -z), walking at him
    // and back; the giants further off, where there's room.
    const crowd = [['humanoid', 40, 8, 40], ['quadruped', 20, 8, 40], ['heavy', 6, 12, 45], ['carrier', 4, 14, 45], ['spider', 3, 45, 70], ['colossus', 2, 30, 50]];
    for (const [kind, n, near, far] of crowd) for (let i = 0; i < n; i++) {
      const a = (i / n - 0.5) * 1.6, d = near + (far - near) * ((i * 7) % n) / n, x = Math.sin(a) * d, z = 19 - Math.cos(a) * d;
      w.patrols.push({ kind: 'street', unit: kind, pts: [{ x, y: 0, z }, { x: x * 0.8, y: 0, z: z + (19 - z) * 0.3 }], dwell: [1, 1], hours: [0, 24] });
      U.push({ id: U.length, kind, patrol: w.patrols.length - 1, phase: i * 1.7, state: 'unaware' });
    }
    // (Drawn from pools sized to the units there are: rebuilt with the crowd in them.)
    const V = g.units.constructor; g.units.dispose(); g.units = new V(U); g.view.scene.add(g.units.group);
    Object.assign(g.state.player.pos, { x: 0, y: 0, z: 19 }); g.input.yaw = 0; g.input.pitch = 0.12;
    for (let k = 0; k < 120; k++) g.runFrames(1);
    const R = g.view.renderer;
    R.setSize(32, 18, false); for (let k = 0; k < 30; k++) g.render(1, 1 / 60);
    let tick = 0, gl = 0; const ren = [], upd = [], draw = R.render.bind(R);
    R.render = (sc, cam) => { const t = performance.now(); draw(sc, cam); gl += performance.now() - t; };
    for (let k = 0; k < 9; k++) { for (let j = 0; j < 10; j++) { const t0 = performance.now(); g.tick(); tick += performance.now() - t0; } gl = 0; const t1 = performance.now(); g.render(1, 1 / 60); const all = performance.now() - t1; ren.push(all); upd.push(all - gl); }
    R.render = draw;
    ren.sort((a, b) => a - b); upd.sort((a, b) => a - b);
    const inf = R.info.render, out = { units: U.length, tick: +(tick / 90).toFixed(3), update: +upd[4].toFixed(2), render: +ren[4].toFixed(2), calls: inf.calls, tris: inf.triangles };
    R.setSize(innerWidth, innerHeight, false);
    return out; })()`);
  const B = await page.evaluate('window.__cq.gfx.budget');
  const now = { when: new Date().toISOString(), ...row, frame: +(row.update + 0.4 * row.tick + SUBMIT * row.calls).toFixed(2) };
  let last = null;
  try { last = JSON.parse(fs.readFileSync('logs/crowdcost.json', 'utf8')).now; } catch { /* the first run */ }
  fs.writeFileSync('logs/crowdcost.json', JSON.stringify({ now, last }, null, 1));
  console.log(`crowdcost: ${now.units} machines, frame ${now.frame} ms (tick ${now.tick}, update ${now.update}, render ${now.render}), ${now.calls} calls, ${Math.round(now.tris / 1000)}k tris${last ? `; last run frame ${last.frame}, tick ${last.tick}, update ${last.update}, tris ${Math.round(last.tris / 1000)}k` : ''}`);
  if (now.frame > 6.6) fail('crowdcost', `a frame's CPU cost with the crowd in view is ${now.frame} ms: over a 150 fps frame`);
  if (now.calls > B.calls) fail('crowdcost', `${now.calls} draw calls (budget ${B.calls})`);
  if (now.tris > B.tris) fail('crowdcost', `${Math.round(now.tris / 1000)}k triangles (budget ${B.tris / 1000}k)`);
  await page.close();
}
