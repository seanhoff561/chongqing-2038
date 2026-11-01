// M4-61 (U-052): after a fight at a wall, its bullet holes and a crowbar's scrapes stay on it: a screenshot; and the
// marks are kept (up to their cap).
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=gym&seed=1', 'marks');
  await page.waitForFunction('window.__cq.game.hands.ready', { timeout: 20000 });
  const shoot = n => page.evaluate(`(() => { const g = window.__cq.game; for (let i = 0; i < ${n}; i++) { g.input.pressed = 64; g.input.mouse = 64; g.runFrames(1); g.input.mouse = 0; g.runFrames(12); } })()`);
  await page.evaluate(`(() => { const g = window.__cq.game; g.state.time = 12 * 3600; g.state.flags.god = true; g.input.yaw = 0; g.input.pitch = -0.1;
    window.__cq.give('pistol'); window.__cq.give('crowbar'); const p = g.state.inv.pack.items; p.find(x => x.id === 'pistol').charge = 15;
    g.input.cmds.push({ c: 'bind', slot: 0, uid: p.find(x => x.id === 'pistol').uid }, { c: 'bind', slot: 1, uid: p.find(x => x.id === 'crowbar').uid }); g.runFrames(2); g.state.inv.held = 1; g.runFrames(30); })()`);
  // A first shot finds the wall ahead; he walks up to 2.5 m from where it hit and empties the magazine into it.
  await shoot(1);
  const at = await page.evaluate(`(() => { const g = window.__cq.game, m = g.marks.sets.hole.mesh, e = m.instanceMatrix.array; return { x: e[12], y: e[13], z: e[14] }; })()`);
  await page.evaluate(`(() => { const g = window.__cq.game, p = g.state.player.pos; const dx = ${at.x} - p.x, dz = ${at.z} - p.z, d = Math.hypot(dx, dz);
    Object.assign(p, { x: ${at.x} - dx / d * 2.5, z: ${at.z} - dz / d * 2.5 }); g.input.yaw = Math.atan2(-dx, -dz); g.input.pitch = -0.15; g.runFrames(10); })()`);
  await shoot(10);
  // The crowbar at it, up close.
  await page.evaluate(`(() => { const g = window.__cq.game, p = g.state.player.pos, yaw = g.input.yaw; p.x += -Math.sin(yaw) * 1.1; p.z += -Math.cos(yaw) * 1.1; g.state.inv.held = 2; g.runFrames(30);
    for (let i = 0; i < 3; i++) { g.input.pressed = 64; g.input.mouse = 64; g.runFrames(1); g.input.mouse = 0; g.runFrames(70); } p.x -= -Math.sin(yaw) * 1.1; p.z -= -Math.cos(yaw) * 1.1; g.state.inv.held = 1; g.runFrames(20); })()`);
  const n = await page.evaluate(`(() => { const s = window.__cq.game.marks.sets; return { holes: s.hole.mesh.count + s.pock.mesh.count, scrapes: s.scrape.mesh.count }; })()`);
  if (n.holes < 8) fail('marks', `${n.holes} bullet marks on the wall`);
  if (n.scrapes < 1) fail('marks', 'no crowbar scrape');
  await screenshot(page, 'marks-wall');
  await page.close();
}
