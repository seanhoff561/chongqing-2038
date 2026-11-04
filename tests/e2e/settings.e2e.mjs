// M10-05 (U-104): Esc opens the settings, centred, holding exactly what the director listed, word for word: Menu (last
// sleep saved), Volume, Sensitivity and the twelve keys with their defaults; one key rebound to mouse button 4; after
// a reload the volume, sensitivity and keys are as set. M10-06: the world runs under the settings, not the main menu.
export default async function ({ open, fail }) {
  const page = await open('?scenario=hideout&seed=2', 'settings');
  await page.evaluate(`localStorage.removeItem('cq2038.settings')`);
  await page.evaluate('window.__cq.runFrames(3)');
  await page.keyboard.press('Escape');
  const r = await page.evaluate(`(() => {
    const el = document.querySelector('#settings .st-panel'), b = el.getBoundingClientRect();
    return { rows: [...el.children].map(c => c.tagName === 'LABEL' ? c.childNodes[0].textContent.trim() : c.textContent.trim()), centre: [b.left + b.width / 2, b.top + b.height / 2, innerWidth / 2, innerHeight / 2] };
  })()`);
  const want = ['设置 SETTINGS', '主菜单 Menu (last sleep saved)', '音量 Volume', '灵敏度 Sensitivity', '按键 Keys',
    '冲刺 SprintShift', '蹲下 CrouchCtrl', '爬行 CrawlC', '互动 InteractE', '左探/左页 Lean/Tab LeftMouse4', '右探/右页 Lean/Tab RightMouse5',
    '装弹 ReloadR', '头灯/专注 Headlamp/Focus LaptopQ', '撑墙 ChimneyX', '露宿 Sleep RoughZ', '笔记本 LaptopTab', '背包 BackpackAlt'];
  if (JSON.stringify(r.rows) !== JSON.stringify(want)) fail('settings', `rows: ${JSON.stringify(r.rows)}`);
  const [cx, cy, wx, wy] = r.centre;
  if (Math.abs(cx - wx) > 4 || Math.abs(cy - wy) > 4) fail('settings', `not centred: ${r.centre.map(Math.round)}`);
  // M10-06: under the settings the world goes on; under the main menu nothing runs, and the mouse turns nothing.
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const t0 = await page.evaluate('window.__cq.game.state.time');
  await wait(1500);
  const t1 = await page.evaluate('window.__cq.game.state.time');
  if (!(t1 > t0)) fail('settings', `the world stood still under the settings (${t0} -> ${t1})`);
  await page.click('#settings [data-a="menu"]');
  const m0 = await page.evaluate('[window.__cq.game.state.time, window.__cq.game.input.yaw, !!document.getElementById("boot")]');
  await page.mouse.move(100, 100); await page.mouse.move(700, 400); await page.evaluate(`window.dispatchEvent(new MouseEvent('mousemove', { movementX: 300, movementY: 50 }))`);
  await wait(1500);
  const m1 = await page.evaluate('[window.__cq.game.state.time, window.__cq.game.input.yaw]');
  if (!m0[2]) fail('settings', 'Menu did not open the main menu');
  if (m1[0] !== m0[0] || m1[1] !== m0[1]) fail('settings', `the main menu let things run: ${JSON.stringify([m0, m1])}`);
  await page.click('#boot .new');
  await page.keyboard.press('Escape');
  // Volume and sensitivity set; Chimney moved to mouse button 4 (Lean/Tab Left gives it up).
  await page.evaluate(`(() => {
    const set = (k, v) => { const i = document.querySelector('#settings input[data-set="' + k + '"]'); i.value = String(v); i.dispatchEvent(new Event('input')); };
    set('vol', 0.4); set('sens', 0.002);
  })()`);
  await page.click('#settings button[data-bind="chimney"]');
  await page.evaluate(`window.dispatchEvent(new MouseEvent('mousedown', { button: 3, bubbles: true, cancelable: true }))`);
  const shown = await page.evaluate(`document.querySelector('#settings button[data-bind="chimney"] b').textContent`);
  if (shown !== 'Mouse4') fail('settings', `chimney shows ${shown}`);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction('window.__cq && window.__cq.ready', { timeout: 240000 });
  const k = await page.evaluate(`(() => { const g = window.__cq.game, s = JSON.parse(localStorage.getItem('cq2038.settings')); return { vol: g.audio.volumes.master, sens: g.input.sensitivity, chimney: s.keys.chimney, lean: s.keys.leanL }; })()`);
  if (Math.abs(k.vol - 0.4) > 1e-9 || Math.abs(k.sens - 0.002) > 1e-9 || k.chimney.join() !== 'Mouse4' || k.lean.length) fail('settings', `after reload: ${JSON.stringify(k)}`);
  await page.evaluate(`localStorage.removeItem('cq2038.settings')`);
  await page.close();
}
