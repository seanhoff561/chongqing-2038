// M4-78 (U-058): the pistol with a suppressor and the 4x scope fitted, at the hip and aimed through the scope.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=hideout&seed=1', 'mods');
  await page.waitForFunction('window.__cq.game.hands.ready', { timeout: 20000 });
  await page.evaluate(`(() => { const g = window.__cq.game; g.state.time = 12 * 3600; Object.assign(g.state.player.pos, { x: 80, y: 9, z: 25 }); g.input.yaw = 0; g.input.pitch = 0;
    window.__cq.give('pistol'); window.__cq.give('suppressor'); window.__cq.give('scope4x');
    const p = g.state.inv.pack.items, gun = p.find(x => x.id === 'pistol'); gun.charge = 15;
    g.input.cmds.push({ c: 'fit', uid: p.find(x => x.id === 'suppressor').uid, onto: gun.uid }, { c: 'fit', uid: p.find(x => x.id === 'scope4x').uid, onto: gun.uid }, { c: 'bind', slot: 0, uid: gun.uid });
    g.runFrames(2); g.state.inv.held = 1; g.runFrames(40); })()`);
  const mods = await page.evaluate('window.__cq.game.state.inv.pack.items.find(x => x.id === "pistol").mods');
  if (JSON.stringify(mods) !== '["suppressor","scope4x"]') fail('mods', `fitted ${JSON.stringify(mods)}`);
  await screenshot(page, 'mods-hip');
  const fov = await page.evaluate('(() => { const g = window.__cq.game; g.input.mouse = 128; g.runFrames(60); return g.view.fp.cam.fov; })()');
  if (!(fov < 25)) fail('mods', `aimed through the scope the view's ${fov.toFixed(1)} degrees`);
  await screenshot(page, 'mods-aimed');
  await page.close();
}
