// M4-68 (U-052): things held as a person holds them. The pistol drawn, at the hip, walking, aimed, firing and mid-reload;
// the knife and its thrust; the crowbar and its swing; and the rest of the held things: one sheet, logs/viewmodel.png.
const OTHERS = ['water', 'firstaid', 'phone', 'extinguisher', 'boltcutters', 'shotgun', 'nailgun', 'grapple', 'binoculars', 'bread'];

export default async function ({ open, fail }) {
  const page = await open('?scenario=gym&seed=1', 'viewmodel');
  await page.waitForFunction('window.__cq.game.hands.ready', { timeout: 20000 });
  await page.evaluate(`(() => { const g = window.__cq.game; g.state.time = 12 * 3600; g.state.flags.god = true; Object.assign(g.state.player.pos, { x: -60, y: 0, z: 60 }); g.input.yaw = 0; g.input.pitch = 0; })()`);
  const shots = [], frames = n => page.evaluate(`window.__cq.runFrames(${n})`);
  const snap = async label => shots.push([label, await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 75 })]);
  // Taken out of the hotbar: the draw starts as it's in his hand (read in the same step: the page's own loop runs on).
  const hold = id => page.evaluate(`(() => { const g = window.__cq.game; g.state.inv.held = 0; g.state.inv.pack.items.length = 0; window.__cq.give('${id}'); window.__cq.give('mag9');
      const st = g.state.inv.pack.items.find(x => x.id === '${id}'); if ('${id}' === 'pistol') st.charge = 12; g.input.cmds.push({ c: 'bind', slot: 0, uid: st.uid }); g.runFrames(2);
      g.state.inv.held = 1; g.runFrames(1); g.runFrames(4); return g.motion.draw; })()`);
  const drawn = await hold('pistol');
  await snap('pistol: drawing');
  if (!(drawn > 0 && drawn < 1)) fail('viewmodel', `draw ${drawn} mid-draw`);
  await frames(40); await snap('pistol: hip');
  await page.keyboard.down('KeyW'); await frames(22); await snap('pistol: walking'); await page.keyboard.up('KeyW'); await frames(30);
  await page.evaluate('(() => { const g = window.__cq.game; g.input.mouse = 128; g.runFrames(40); })()'); await snap('pistol: aimed');
  await page.evaluate('(() => { const g = window.__cq.game; g.input.mouse = 128 | 64; g.input.pressed = 64; g.runFrames(2); })()'); await snap('pistol: firing');
  await page.evaluate('(() => { const g = window.__cq.game; g.input.mouse = 0; g.runFrames(40); })()');
  await page.keyboard.press('KeyR'); await frames(55);
  const task = await page.evaluate('window.__cq.game.state.task?.id');
  if (task !== 'reload') fail('viewmodel', `no reload under way (${task})`);
  await snap('pistol: reloading');
  await frames(120);
  for (const id of ['knife', 'crowbar']) {
    await hold(id); await frames(40); await snap(id);
    await page.evaluate('(() => { const g = window.__cq.game; g.input.pressed = 64; g.input.mouse = 64; g.runFrames(1); g.input.mouse = 0; })()');
    await frames(id === 'knife' ? 9 : 14); await snap(`${id}: blow`);
    await frames(40);
  }
  for (const id of OTHERS) { await hold(id); await frames(40); await snap(id); }
  const sheet = `<body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(4,320px);gap:4px;font:12px sans-serif;color:#ddd">${shots.map(([l, b]) => `<div><img src="data:image/jpeg;base64,${b}" width="320" height="180" style="display:block"><div>${l}</div></div>`).join('')}</body>`;
  await page.setViewport({ width: 1292, height: Math.ceil(shots.length / 4) * 202 });
  await page.setContent(sheet);
  await page.screenshot({ path: 'logs/viewmodel.png' });
  await page.close();
}
