// M10-12 (U-104): Tab pulls Anna's laptop out, held in both hands, the page on its glass, time going on behind it; the
// corner shows the battery, the date and time and the skull; the lean keys (Mouse4/5) turn Map, Status, Scan and
// Notes round, with no tabs or hints; Status reads his body as the sim has it (logs/laptop.png). Tab puts it away.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=hideout&seed=1', 'laptop');
  await page.evaluate(`(() => { const g = window.__cq.game; g.state.time = 21.5 * 3600; g.state.deaths = 2; g.state.body.hp = 73; g.state.body.leg = 'sprain'; g.state.body.legHealAt = g.state.time + 86400; window.__cq.runFrames(5); })()`);
  await page.keyboard.press('Tab');
  const t0 = await page.evaluate(`(() => { window.__cq.runFrames(30); return window.__cq.game.state.time; })()`);
  const side = b => page.evaluate(`(() => { for (const t of ['mousedown', 'mouseup']) window.dispatchEvent(new MouseEvent(t, { button: ${b}, bubbles: true, cancelable: true })); window.__cq.runFrames(3); })()`);
  const look = () => page.evaluate(`(() => { window.__cq.runFrames(3); const el = document.getElementById('laptop'), r = el.getBoundingClientRect();
    return { shown: el.style.display, bar: el.querySelector('.lt-bar')?.textContent ?? '', on: el.querySelector('.lt-body')?.dataset.on, t: window.__cq.game.state.time,
      tabs: el.querySelectorAll('[data-page], .lt-tabs, .lt-foot').length, inView: r.width > 200 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight + 1 }; })()`);
  const a = await look();
  if (a.shown !== 'block' || !a.inView) fail('laptop', `not on the glass: ${JSON.stringify(a)}`);
  if (!(a.t > t0)) fail('laptop', 'the game stopped while it was out');
  if (!/▮ \d+%/.test(a.bar) || !a.bar.includes('2038') || !/\d\d:\d\d/.test(a.bar) || !a.bar.includes('☠ 2')) fail('laptop', `corner: ${a.bar}`);
  if (a.tabs) fail('laptop', 'tabs or hints on the screen');
  // The lean keys round the four.
  const order = [a.on];
  for (let i = 0; i < 4; i++) { await side(4); order.push((await look()).on); }
  if (order.join() !== 'map,status,scan,notes,map') fail('laptop', `Mouse5 turns: ${order}`);
  await side(3);
  if ((await look()).on !== 'notes') fail('laptop', 'Mouse4 did not turn back');
  await side(3); await side(3);
  const r = await page.evaluate(`(() => { const el = document.getElementById('laptop'), b = window.__cq.game.state.body;
    const v = k => el.querySelector('[data-k="' + k + '"] b')?.textContent ?? '';
    return { on: el.querySelector('.lt-body').dataset.on, hp: v('hp'), want: Math.round(b.hp), leg: v('leg'), fed: v('satiety'), wantFed: Math.round(b.satiety) }; })()`);
  if (r.on !== 'status' || !r.hp.endsWith(String(r.want)) || !r.leg.includes('sprained') || !r.fed.endsWith(String(r.wantFed))) fail('laptop', `status doesn't match the sim: ${JSON.stringify(r)}`);
  await screenshot(page, 'laptop');
  await page.keyboard.press('Tab');
  const shut = await page.evaluate(`(() => { window.__cq.runFrames(20); return { el: document.getElementById('laptop').style.display, open: !!window.__cq.game.state.laptop?.open }; })()`);
  if (shut.el !== 'none' || shut.open) fail('laptop', `did not put it away: ${JSON.stringify(shut)}`);
  await page.close();
}
