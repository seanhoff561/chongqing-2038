// M10-14 (U-104): sitting at the Map, he places a marker, draws a line, writes words and rubs one out; the wheel zooms
// and the right button drags the map; standing, his marks are still drawn and it's on him again (logs/maptools.png).
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=hideout&seed=1', 'maptools');
  await page.evaluate('window.__cq.runFrames(60)');
  await page.keyboard.press('Tab');
  await page.evaluate('window.__cq.runFrames(30)');
  await page.keyboard.press('KeyQ');
  await page.evaluate('window.__cq.runFrames(40)');
  const st = () => page.evaluate(`(() => { window.__cq.runFrames(3); const g = window.__cq.game, v = g.laptop.map.view; return { marks: g.state.marks ?? [], view: v && { ...v }, on: document.querySelector('#laptop .lt-win.front')?.dataset.win }; })()`);
  const at = (fx, fy) => page.evaluate(`(() => { const r = document.querySelector('#laptop .lt-map canvas').getBoundingClientRect(); return { x: r.x + r.width * ${fx}, y: r.y + r.height * ${fy} }; })()`);
  const tool = async id => { const r = await page.evaluate(`(() => { const b = document.querySelector('#laptop [data-tool="${id}"]').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`); await page.mouse.click(r.x, r.y); await page.evaluate('window.__cq.runFrames(2)'); };
  if ((await st()).on !== 'map') fail('maptools', 'not on the map sitting');
  // A marker.
  await tool('pin');
  let p = await at(0.3, 0.4); await page.mouse.click(p.x, p.y);
  // A line, pressed and dragged.
  await tool('line');
  p = await at(0.5, 0.3); await page.mouse.move(p.x, p.y); await page.mouse.down();
  p = await at(0.8, 0.7); await page.mouse.move(p.x, p.y, { steps: 4 }); await page.mouse.up();
  // Words.
  await tool('text');
  p = await at(0.6, 0.8); await page.mouse.click(p.x, p.y);
  await page.evaluate('new Promise(r => setTimeout(r, 50))');
  await page.keyboard.type('cache here');
  await page.keyboard.press('Enter');
  let s = await st();
  const kinds = s.marks.map(k => (k.x2 !== undefined ? 'line' : k.text ? `text:${k.text}` : 'pin')).join();
  if (kinds !== 'pin,line,text:cache here') fail('maptools', `marks: ${kinds}`);
  if (!s.view?.m) fail('maptools', 'no view sitting');
  await screenshot(page, 'maptools');
  // The marker rubbed out.
  await tool('erase');
  p = await at(0.3, 0.4); await page.mouse.click(p.x, p.y);
  s = await st();
  if (s.marks.length !== 2 || s.marks.some(k => k.x2 === undefined && !k.text)) fail('maptools', `the rubber took the wrong mark: ${JSON.stringify(s.marks)}`);
  // Zoomed in with the wheel, and dragged with the right button.
  const v0 = s.view;
  p = await at(0.5, 0.5); await page.mouse.move(p.x, p.y); await page.mouse.wheel({ deltaY: -100 });
  s = await st();
  if (!(s.view.m < v0.m)) fail('maptools', `the wheel didn't zoom: ${v0.m} then ${s.view.m}`);
  const v1 = s.view;
  await page.mouse.down({ button: 'right' }); await page.mouse.move(p.x + 60, p.y + 30, { steps: 4 }); await page.mouse.up({ button: 'right' });
  s = await st();
  if (!(s.view.cx < v1.cx - 1 && s.view.cz < v1.cz - 1)) fail('maptools', `the right button didn't drag the map: ${JSON.stringify([v1, s.view])}`);
  if (s.marks.length !== 2) fail('maptools', 'dragging made a mark');
  // Standing: on him again, the marks still his (and drawn: ice-blue pixels on the map).
  await page.keyboard.press('KeyQ');
  await page.evaluate('window.__cq.runFrames(30)');
  const up = await page.evaluate(`(() => { const g = window.__cq.game, c = document.querySelector('#laptop .lt-map canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 191) + Math.abs(d[i + 1] - 230) + Math.abs(d[i + 2] - 245) < 30) n++;
    return { view: g.laptop.map.view, marks: (g.state.marks ?? []).length, ice: n, tools: [...document.querySelectorAll('#laptop .lt-tools')].some(t => t.offsetParent) }; })()`);
  if (up.view || up.tools || up.marks !== 2) fail('maptools', `standing: ${JSON.stringify(up)}`);
  if (!(up.ice > 20)) fail('maptools', `standing, his marks aren't drawn: ${up.ice} px`);
  await page.keyboard.press('Tab');
  await page.close();
}
