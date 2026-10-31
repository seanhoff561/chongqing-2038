// M4-26 (U-031): the machines' lineup. ?scenario=units boots with every kind on the plaza; a screenshot of the lineup
// walking their beats, and one up close: a street heavy (M4-26b), a humanoid at the low ready, one engaged and aiming
// at him, a quadruped, the drones hovering.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=units&seed=1', 'units');
  const kinds = await page.evaluate(`[...new Set(window.__cq.game.state.units.map(u => u.kind))].sort().join()`);
  for (const k of ['acoustic', 'camera', 'carrier', 'delivery', 'drone', 'heavy', 'humanoid', 'hunter', 'pir', 'quadruped', 'sweeper', 'tripwire', 'turret']) if (!kinds.includes(k)) fail('units', `no ${k} in the lineup`);
  await page.evaluate(`(() => { const g = window.__cq.game; g.runFrames(80); g.input.pitch = -0.1; g.runFrames(1); })()`);
  await screenshot(page, 'units-lineup');
  const aim = await page.evaluate(`(() => {
    const g = window.__cq.game, U = g.state.units, hs = U.filter(u => u.kind === 'humanoid'), at = (u, x, y, z, yaw) => { u.stop = { x, y, z, yaw, t: 0 }; };
    at(hs[0], -1.6, 0, 10, 0.5); at(hs[1], 0.9, 0, 9.6, Math.atan2(0.2 - 0.9, 13.6 - 9.6)); at(U.find(u => u.kind === 'quadruped'), 2.4, 0, 10.5, -Math.PI / 2); at(U.find(u => u.kind === 'carrier'), 30, 0, -20, 0); at(U.find(u => u.kind === 'heavy'), -4.2, 0, 7.5, 0.7);
    at(U.find(u => u.kind === 'hunter' && !u.reserve), -0.8, 2.6, 9, 0.6); at(U.find(u => u.kind === 'drone'), 2.2, 2.4, 9, -0.4);
    Object.assign(hs[1], { state: 'engaged', aware: 1.5 });
    Object.assign(g.state.player.pos, { x: 0.2, y: 0, z: 13.6 }); g.input.yaw = 0; g.input.pitch = -0.02;
    for (let i = 0; i < 40; i++) { hs[0].state = 'unaware'; hs[0].aware = 0; Object.assign(hs[1], { state: 'engaged', aware: 1.5 }); g.runFrames(1); }
    return hs[1].aim;
  })()`);
  if (!aim) fail('units', 'the engaged humanoid is not aiming');
  await screenshot(page, 'units-pose');
  await page.close();
}
