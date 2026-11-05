// M10-64 (U-107): taking the laptop out doesn't hitch, at night. Tab, then the frames while it comes up, the first
// time and again later: no shader is compiled for it (renderer.info.programs doesn't grow) and the worst of those
// frames is close to a normal one, with it away or held. The numbers go to logs/laptoplag.json.
import fs from 'fs';
export default async function ({ open, fail }) {
  const page = await open('?scenario=hideout&seed=1', 'laptoplag');
  // (Its sound already going, as it is once he's pressed any key: Tab here would be the first, and the city's sounds
  // starting up with it no part of the laptop.)
  await page.evaluate(`(() => { const g = window.__cq.game; g.audio.start(); g.state.time = 22 * 3600; g.input.pitch = -0.4; window.__cq.runFrames(30); })()`);
  // Each frame the game draws (its own loop's or a test's), timed (ms): its frame work, three.js drawing it (a shader
  // compiled, linked there) and the page's layout after; software GL's rasterising, slow and shared here, left out.
  await page.evaluate(`(() => { const g = window.__cq.game, f = window.__fr = [], draw = g.render.bind(g);
    g.render = (a, dt) => { const t = performance.now(); draw(a, dt); document.getElementById('laptop').getBoundingClientRect(); f.push(+(performance.now() - t).toFixed(1)); }; })()`);
  const frames = async n => {
    const from = await page.evaluate('window.__fr.length');
    while (await page.evaluate('window.__fr.length') < from + n) await page.evaluate('window.__cq.runFrames(1)');
    return { ms: await page.evaluate(`window.__fr.slice(${from}, ${from + n})`), programs: await page.evaluate('window.__cq.game.view.renderer.info.programs.length') };
  };
  const med = f => [...f.ms].sort((a, b) => a - b)[f.ms.length >> 1];
  await frames(20);
  const rows = [];
  for (const when of ['first', 'again']) {
    const calm = await frames(20);
    await page.keyboard.press('Tab');
    const up = await frames(20), held = await frames(20);
    await page.keyboard.press('Tab');
    await frames(10);
    const normal = Math.max(med(calm), med(held)), worst = Math.max(...up.ms);
    rows.push({ when, away: med(calm), held: med(held), worst, programs: [calm.programs, up.programs] });
    if (up.programs > calm.programs) fail('laptoplag', `${when} open compiled ${up.programs - calm.programs} shader programs`);
    if (worst > normal * 2 + 15) fail('laptoplag', `${when} open: worst frame ${worst} ms against ${normal} ms normally`);
  }
  fs.writeFileSync('logs/laptoplag.json', JSON.stringify(rows));
  await page.close();
}
