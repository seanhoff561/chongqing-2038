// M6-26: the whole city's render budgets: at 10 viewpoints across Yuzhong (each district by day, three by night),
// at every preset, the draw calls and triangles of a frame stay within the preset's budget (render/view.ts PRESETS:
// Medium's DESIGN section 16's), written to logs/budgets.json.
import fs from 'fs';
export default async function ({ open, fail }) {
  const page = await open('?scenario=yuzhong&seed=1', 'budgets');
  const views = ['jiefangbei', 'shibati', 'jiaochangkou', 'hongyadong', 'xiaoshizi', 'chaotianmen', 'cablewayNorth', 'jiefangbei', 'shibati', 'chaotianmen'];
  const out = {};
  for (const preset of ['low', 'medium', 'high']) {
    const r = await page.evaluate(`(() => { const g = window.__cq.game; g.setPreset('${preset}'); const B = window.__cq.presets['${preset}'].budget, rows = [];
      ${JSON.stringify(views)}.forEach((name, i) => {
        const t = g.world.teleports.find(t => t.name === name); g.state.time = (i < 7 ? 13 : 22) * 3600; g.state.flags.god = true;
        Object.assign(g.state.player.pos, { x: t.x, y: t.y, z: t.z }); g.input.yaw = i * 0.9; g.input.pitch = 0;
        for (let k = 0; k < 3; k++) g.runFrames(1);
        for (let k = 0; k < 200 && g.view.streamStep(g.view.fp.cam.position, 100); k++);
        g.runFrames(1);
        const inf = g.view.renderer.info.render; rows.push({ at: name + '@' + (i < 7 ? 13 : 22), calls: inf.calls, tris: inf.triangles });
      });
      return { budget: B, rows }; })()`);
    out[preset] = r;
    for (const row of r.rows) {
      if (row.calls > r.budget.calls) fail('budgets', `${preset} ${row.at}: ${row.calls} draw calls (budget ${r.budget.calls})`);
      if (row.tris > r.budget.tris) fail('budgets', `${preset} ${row.at}: ${Math.round(row.tris / 1000)}k triangles (budget ${r.budget.tris / 1000}k)`);
    }
    console.log(`budgets ${preset}: max ${Math.max(...r.rows.map(q => q.calls))} calls, ${Math.round(Math.max(...r.rows.map(q => q.tris)) / 1000)}k tris`);
  }
  fs.writeFileSync('logs/budgets.json', JSON.stringify(out, null, 1));
  await page.evaluate(`window.__cq.game.setPreset('medium')`);
  await page.close();
}
