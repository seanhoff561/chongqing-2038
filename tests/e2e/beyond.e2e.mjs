// M4-100 (U-077): from the city's edge, looking out past the border: the river going on, the far bank's towers and the
// hills behind, by day and after dark (logs/beyond-day.png, logs/beyond-night.png). Stand-ins: drawn, three draws.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'beyond');
  for (const [name, hour] of [['day', 15], ['night', 22]]) {
    const r = await page.evaluate(`(() => {
      const g = window.__cq.game, gr = g.world.ground, x1 = gr.x0 + (gr.w - 1) * gr.cell, z = gr.z0 + (gr.h - 1) * gr.cell * 0.55;
      g.state.time = ${hour} * 3600; g.state.flags.clear = true; g.state.flags.noclip = true;
      // Over the eastern edge, 40 m up, looking out east across the river.
      Object.assign(g.state.player.pos, { x: x1 - 60, y: g.world.water[0].y1 + 40, z }); g.input.yaw = -Math.PI / 2; g.input.pitch = -0.08;
      for (let i = 0; i < 4; i++) window.__cq.runFrames(10);
      let towers = 0; g.view.scene.traverse(o => { if (o.isInstancedMesh && o.material?.emissiveMap && o.count > 500) towers = o.count; });
      return { towers };
    })()`);
    if (r.towers < 500) fail('beyond', `${name}: only ${r.towers} towers past the edge`);
    await screenshot(page, `beyond-${name}`);
  }
  await page.close();
}
