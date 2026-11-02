// M5-01..M5-03: L opens Anna's laptop over the view (time going on behind it) and shuts it again. Its pages turn with
// Q E or ← →, past the greyed ones (U-098); the Status page reads his body as the sim has it (logs/laptop.png); Logs is greyed without binoculars and says
// what it needs; Notes lists his hideouts.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=gym&seed=1', 'laptop');
  await page.evaluate(`(() => { const g = window.__cq.game; g.state.time = 21.5 * 3600; g.state.body.hp = 73; g.state.body.leg = 'sprain'; g.state.body.legHealAt = g.state.time + 86400; window.__cq.runFrames(5); })()`);
  await page.keyboard.press('KeyL');
  const t0 = await page.evaluate(`(() => { window.__cq.runFrames(30); return window.__cq.game.state.time; })()`);
  const r = await page.evaluate(`(() => { window.__cq.runFrames(60); const el = document.getElementById('laptop'), b = window.__cq.game.state.body;
    const v = k => el.querySelector('[data-k="' + k + '"] b')?.textContent ?? '';
    return { shown: el.style.display, text: el.textContent, t: window.__cq.game.state.time, hp: v('hp'), want: Math.round(b.hp), leg: v('leg'), fed: v('satiety'), wantFed: Math.round(b.satiety) }; })()`);
  if (r.shown !== 'block' || !r.text.includes('ANNA') || !r.text.includes('%')) fail('laptop', `not open: ${JSON.stringify(r).slice(0, 200)}`);
  if (!(r.t > t0)) fail('laptop', 'the game stopped while it was open');
  if (!r.hp.endsWith(String(r.want)) || !r.leg.includes('sprained') || !r.fed.endsWith(String(r.wantFed))) fail('laptop', `status doesn't match the sim: ${JSON.stringify(r)}`);
  await screenshot(page, 'laptop');
  // E turns the pages (U-098), past the greyed ones he can't open yet: from Status, Scan and Map, then Notes (Logs, Cams
  // and Drone skipped); a greyed tab says what it needs.
  for (let i = 0; i < 3; i++) await page.keyboard.press('KeyE');
  const turned = await page.evaluate(`(() => { window.__cq.runFrames(3); return { body: document.querySelector('#laptop .lt-body').textContent, logs: document.querySelector('#laptop [data-page="3"]')?.getAttribute('title') ?? '' }; })()`);
  if (!turned.body.includes('Hideouts')) fail('laptop', `E didn't turn past the locked pages to Notes: ${turned.body.slice(0, 120)}`);
  if (!turned.logs.includes('binoculars')) fail('laptop', `the greyed Logs tab doesn't say what it needs: ${turned.logs}`);
  // A bedroll laid down: Notes (still the page shown) lists that hideout.
  await page.keyboard.press('KeyL');
  await page.evaluate(`(() => { const g = window.__cq.game; window.__cq.give('bedroll'); const st = g.state.inv.pack.items.find(i => i.id === 'bedroll'); g.input.pitch = -1; g.runFrames(3); g.input.cmds.push({ c: 'use', uid: st.uid }); g.runFrames(3); })()`);
  await page.keyboard.press('KeyL');
  await page.evaluate('window.__cq.runFrames(3)');
  const notes = await page.evaluate(`(() => { window.__cq.runFrames(3); return document.querySelector('#laptop .lt-body').textContent; })()`);
  if (!notes.includes('Hideouts') || notes.includes('None yet')) fail('laptop', `Notes doesn't list the hideout: ${notes}`);
  await page.keyboard.press('KeyL');
  const shut = await page.evaluate(`(() => { window.__cq.runFrames(3); return document.getElementById('laptop').style.display; })()`);
  if (shut !== 'none') fail('laptop', 'did not shut');
  await page.close();
}
