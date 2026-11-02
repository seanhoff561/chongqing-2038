// M7-15: each of the four endings, through ?scenario=ending-*: the shot lifts away letterboxed while the last exchange
// plays in subtitles, then the run's summary with the ending's name (logs/ending-<route>.png mid-sequence).
const NAMES = { bridge: 'Beneath the Bridge', cable: 'The Cable', boat: 'Into the Fog', tunnel: "Tunnel's End" };
export default async function ({ open, fail, screenshot }) {
  for (const [route, name] of Object.entries(NAMES)) {
    const page = await open(`?scenario=ending-${route}&seed=1`, `ending-${route}`);
    const subs = new Set();
    for (let i = 0; i < 40; i++) {
      const r = await page.evaluate(`(() => { window.__cq.runFrames(60); const s = document.querySelector('#hud .subs'); return { sub: s ? s.textContent : '', box: document.getElementById('letterbox')?.style.display, death: document.getElementById('death')?.textContent ?? '' }; })()`);
      if (r.sub) subs.add(r.sub);
      if (i === 6) await screenshot(page, `ending-${route}`);
      if (i === 2 && r.box !== 'block') fail('endings', `${route}: no letterbox while it plays`);
      if (r.death) { if (!r.death.includes(name) || !r.death.includes('survived')) fail('endings', `${route}: the summary doesn't name the ending: ${r.death}`); break; }
      if (i === 39) fail('endings', `${route}: no summary after the sequence`);
    }
    if (subs.size < 3) fail('endings', `${route}: only ${subs.size} subtitles: ${[...subs].join(' | ')}`);
    await page.close();
  }
}
