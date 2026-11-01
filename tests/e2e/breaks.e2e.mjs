// M4-62 (U-052): machines come apart: a humanoid with its sensor head shot off and its rifle shot out of its hands,
// smoking and sparking, and a crashed drone's wreck: a screenshot.
export default async function ({ open, screenshot }) {
  const page = await open('?scenario=units&seed=1', 'breaks');
  await page.evaluate(`(() => {
    const g = window.__cq.game, U = g.state.units, h = U.find(u => u.kind === 'humanoid'), d = U.find(u => u.kind === 'drone');
    h.stop = { x: -0.8, y: 0, z: 9.5, yaw: 0.3, t: 0 }; Object.assign(h, { blind: true, disarmed: true, hp: 60 });
    d.stop = { x: 1.6, y: 0, z: 9.8, yaw: 1.1, t: g.state.time }; Object.assign(d, { dead: true, hp: 0 });
    Object.assign(g.state.player.pos, { x: 0.2, y: 0, z: 13.6 }); g.input.yaw = 0; g.input.pitch = -0.08;
    for (let i = 0; i < 20; i++) g.runFrames(3);
  })()`);
  await screenshot(page, 'breaks');
  await page.close();
}
