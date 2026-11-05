// M10-33: the main menu's Maps. The built-in tutorial is listed first, selected, and can't be edited or deleted. New
// makes a map in the editor, saved; its Maps button comes back to the list, where it's listed. The tutorial copied:
// the copy listed and selected, the same pieces. A map deleted (a second click to be sure): gone. Double click plays
// one: the run is the map's, from its spawn (logs/maps.png).
export default async function ({ open, fail, screenshot }) {
  const F = (m) => fail('maps', m);
  const page = await open('?scenario=hideout&seed=1', 'maps');
  const ev = (f, ...a) => page.evaluate(f, ...a);
  await ev(() => localStorage.removeItem('cq2038.maps'));
  const list = () => ev(() => [...document.querySelectorAll('#boot .bt-map')].map(r => ({ name: r.firstChild.textContent, sel: r.classList.contains('sel') })));
  const disabled = (a) => ev(a => document.querySelector(`#boot [data-a="${a}"]`).disabled, a);
  const stored = () => ev(() => JSON.parse(localStorage.getItem('cq2038.maps') ?? '{}'));
  const row = (name) => ev(name => [...document.querySelectorAll('#boot .bt-map')].findIndex(r => r.firstChild.textContent === name), name);
  const pick = async (name, n = 1) => { const i = await row(name); if (i < 0) { F(`${name} not listed`); return; } await page.click(`#boot .bt-map[data-i="${i}"]`, { count: n }); };
  const until = (f, arg) => page.waitForFunction(f, { timeout: 10000 }, arg).catch(() => {});

  // To the main menu (from the Esc panel), then Maps.
  await ev(() => window.__cq.game.settings.show());
  await page.click('#settings [data-a="menu"]');
  await page.click('#boot .maps');
  await until(() => document.querySelector('#boot .bt-map'));
  let l = await list();
  if (l.length !== 1 || !l[0].name.includes('Tutorial') || !l[0].sel) F(`the list: ${JSON.stringify(l)}`);
  if (!(await disabled('edit')) || !(await disabled('delete')) || (await disabled('copy'))) F('the tutorial can be edited or deleted, or not copied');
  const tutorial = l[0].name;

  // New: the editor on a new map, named and saved; Maps back to the list.
  await page.click('#boot [data-a="new"]');
  if (!(await page.$('#editor')) || (await page.$('#boot'))) F('New did not open the editor');
  const n0 = await ev(() => window.__cq.game.editor.doc.pieces.length);
  if (n0 !== 2) F(`New's map has ${n0} pieces`);
  await page.$eval('#editor .ed-name', el => { el.value = 'maps test'; el.dispatchEvent(new Event('change')); });
  await page.click('#editor [data-a="save"]');
  await until(() => JSON.parse(localStorage.getItem('cq2038.maps') ?? '{}')['maps test']);
  await page.click('#editor [data-a="menu"]');
  await until(() => document.querySelectorAll('#boot .bt-map').length === 2);
  l = await list();
  if (l.map(r => r.name).join() !== `${tutorial},maps test`) F(`after New: ${JSON.stringify(l)}`);

  // The tutorial copied.
  await pick(tutorial);
  await page.click('#boot [data-a="copy"]');
  await until(() => document.querySelectorAll('#boot .bt-map').length === 3);
  l = await list();
  const copy = l.find(r => r.sel)?.name;
  if (copy !== 'Tutorial copy' || l[0].name !== tutorial) F(`after Copy: ${JSON.stringify(l)}`);
  const s = await stored();
  if (!s['Tutorial copy'] || s['Tutorial copy'].pieces.length < 10) F(`the copy stored: ${Object.keys(s)}`);
  await screenshot(page, 'maps');

  // A map deleted: the first click asks, the second deletes.
  await pick('maps test');
  if (await disabled('delete')) F('a saved map cannot be deleted');
  await page.click('#boot [data-a="delete"]');
  if ((await list()).length !== 3 || !(await stored())['maps test']) F('one click deleted it');
  await page.click('#boot [data-a="delete"]');
  await until(() => document.querySelectorAll('#boot .bt-map').length === 2);
  l = await list();
  if (l.some(r => r.name === 'maps test') || (await stored())['maps test']) F(`not deleted: ${JSON.stringify(l)}`);

  // Double click plays the copy.
  await pick('Tutorial copy', 2);
  await until(() => !document.getElementById('boot'));
  const play = await ev(() => { const g = window.__cq.game; return { boot: !!document.getElementById('boot'), ed: !!g.editor, sc: g.scenario.name, w: g.world.name, pos: g.state.player.pos, signs: g.world.inter.filter(i => i.kind === 'sign').length }; });
  const signs = s['Tutorial copy']?.pieces.filter(p => p.kind.startsWith('red')).length;
  if (play.boot || play.ed || play.sc !== 'map' || play.w !== 'map' || Math.hypot(play.pos.x, play.pos.z) > 0.2 || play.signs !== signs) F(`play: ${JSON.stringify(play)}, ${signs} signs`);
  await page.close();
}
