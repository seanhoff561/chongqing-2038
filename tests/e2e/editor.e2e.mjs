// M10-32: the map editor. From a map in play, Esc's Back to the editor opens it (the main menu's Maps is checked in
// mainmenu.e2e.mjs). A small map is built with the mouse: a platform placed, dragged, sized by its handle, turned with
// R, its height typed; a red floor sign with its text; a crate with chosen things; a bin placed and deleted. Played,
// he's at its spawn, the platform stands, the sign reads and the crate holds what was chosen. Back in the editor it's
// saved, exported (the file's JSON), a new map made, and the file imported back.
import fs from 'fs';
import path from 'path';

export default async function ({ open, fail, screenshot }) {
  const F = (m) => fail('editor', m);
  const page = await open('?scenario=map&seed=1', 'editor');
  const ev = (f, ...a) => page.evaluate(f, ...a);
  await ev(() => { localStorage.removeItem('cq2038.maps'); localStorage.removeItem('cq2038.maps.last'); });
  await ev(() => window.__cq.game.settings.show());
  await page.click('#settings [data-a="edit"]');
  if (!(await page.$('#editor'))) { F('Back to the editor did not open it'); await page.close(); return; }
  const doc = () => ev(() => JSON.parse(JSON.stringify(window.__cq.game.editor.doc)));
  const frame = () => ev(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  /** A world point on the screen, as the editor's camera sees it. */
  const screen = (x, y, z) => ev(([x, y, z]) => { const cam = window.__cq.game.view.fp.cam, v = cam.position.clone().set(x, y, z).project(cam), r = window.__cq.game.view.renderer.domElement.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; }, [x, y, z]);
  const place = async (kind, x, z) => { await page.click(`#editor .ed-pal [data-k="${kind}"]`); const [sx, sy] = await screen(x, 0, z); await page.mouse.move(sx, sy); await page.mouse.click(sx, sy); await frame(); };
  const drag = async (a, b) => { await page.mouse.move(a[0], a[1]); await page.mouse.down(); for (let i = 1; i <= 5; i++) await page.mouse.move(a[0] + (b[0] - a[0]) * i / 5, a[1] + (b[1] - a[1]) * i / 5); await page.mouse.up(); await frame(); };
  const field = async (f, v) => { await page.$eval(`#editor .ed-insp [data-f="${f}"]`, (el, v) => { el.value = v; el.dispatchEvent(new Event('change')); }, v); await frame(); };
  await frame();
  const n0 = (await doc()).pieces.length;

  // A platform, in front of the spawn.
  await place('platform', 0, 4);
  let d = await doc(), plat = d.pieces.length - 1, p = d.pieces[plat];
  if (d.pieces.length !== n0 + 1 || p.kind !== 'platform' || Math.abs(p.z - 4) > 0.6) F(`platform not placed: ${JSON.stringify(p)}`);
  // Moved: dragged 3 m to the east.
  await drag(await screen(p.x, p.h, p.z), await screen(p.x + 3, p.h, p.z));
  d = await doc(); const moved = d.pieces[plat];
  if (Math.abs(moved.x - p.x - 3) > 0.6 || Math.abs(moved.z - p.z) > 0.3) F(`platform not moved: ${p.x},${p.z} -> ${moved.x},${moved.z}`);
  // Sized: its red handle (the +x face) drawn out 2 m, its west face staying put.
  p = moved;
  await drag(await screen(p.x + p.w / 2, p.h / 2, p.z), await screen(p.x + p.w / 2 + 2, p.h / 2, p.z));
  d = await doc(); const sized = d.pieces[plat];
  if (Math.abs(sized.w - p.w - 2) > 0.3 || Math.abs((sized.x - sized.w / 2) - (p.x - p.w / 2)) > 0.05) F(`platform not sized: w ${p.w} -> ${sized.w}, x ${p.x} -> ${sized.x}`);
  // Turned with R; its height typed.
  await page.keyboard.press('KeyR');
  await field('h', '1.5');
  d = await doc(); p = d.pieces[plat];
  if (Math.abs(p.yaw - Math.PI / 12) > 1e-6 || p.h !== 1.5) F(`not turned or raised: yaw ${p.yaw}, h ${p.h}`);
  const solidUp = await ev(([x, z]) => window.__cq.game.world.solids.some(s => s.y1 > 1.45 && s.y1 < 1.55 && s.x0 < x && s.x1 > x && s.z0 < z && s.z1 > z), [p.x, p.z]);
  if (!solidUp) F('the turned, raised platform is not in the built world');
  // (Its new meshes' shaders compile a few frames on in software GL.)
  await ev(() => new Promise(r => setTimeout(r, 1500)));
  await screenshot(page, 'editor');
  await page.keyboard.press('Escape');

  // A red sign on the floor beside the spawn, its text typed; a crate with two bandages; a bin, deleted.
  await place('redfloor', -2.5, 0);
  await page.$eval('#editor .ed-insp [data-f="text"]', el => { el.value = '向上爬 Climb up\nthen jump'; el.dispatchEvent(new Event('change')); });
  const sign = (await doc()).pieces.length - 1;
  await page.keyboard.press('Escape');
  await place('crate', -2.5, -3);
  await page.select('#editor .ed-item', 'bandage');
  await page.$eval('#editor .ed-n', el => { el.value = '2'; });
  await page.click('#editor [data-a="add"]');
  d = await doc();
  const crate = d.pieces.length - 1;
  if (JSON.stringify(d.pieces[crate].items) !== '[["bandage",2]]') F(`crate's things: ${JSON.stringify(d.pieces[crate].items)}`);
  await page.keyboard.press('Escape');
  await place('bin', 3, -2);
  const withBin = (await doc()).pieces.length;
  await page.keyboard.press('Delete');
  d = await doc();
  if (d.pieces.length !== withBin - 1 || d.pieces.some(q => q.kind === 'bin')) F('the bin was not deleted');
  if (d.pieces[sign].text !== '向上爬 Climb up\nthen jump') F(`sign text: ${d.pieces[sign].text}`);

  // Played: at the spawn, the world the map's; the sign read with E, the crate searched.
  await page.click('#editor [data-a="play"]');
  await frame();
  const play = await ev(() => { const g = window.__cq.game; return { ed: !!g.editor, el: !!document.getElementById('editor'), sc: g.scenario.name, w: g.world.name, pos: g.state.player.pos, signs: g.world.inter.filter(i => i.kind === 'sign').length }; });
  if (play.ed || play.el || play.sc !== 'map' || play.w !== 'map' || Math.hypot(play.pos.x, play.pos.z) > 0.2 || play.signs !== 1) F(`play: ${JSON.stringify(play)}`);
  const look = async (x, z, yaw, pitch) => ev(([x, z, yaw, pitch]) => { const g = window.__cq.game, pl = g.state.player; pl.pos.x = x; pl.pos.z = z; pl.vel.x = pl.vel.z = 0; g.input.yaw = yaw; g.input.pitch = pitch; window.__cq.runFrames(3); return g.state.target; }, [x, z, yaw, pitch]);
  const use = async (secs) => { await page.keyboard.down('KeyE'); await ev(n => window.__cq.runFrames(n), Math.round(secs * 60)); await page.keyboard.up('KeyE'); await ev(() => window.__cq.runFrames(2)); };
  const sp = d.pieces[sign];
  if ((await look(sp.x, sp.z + 1.2, 0, -0.9)) !== `map-${sign}`) F('the sign is not looked at');
  await screenshot(page, 'editor-play');
  await use(0.1);
  const note = await ev(() => document.querySelector('#hud .notice').textContent);
  if (note !== '向上爬 Climb up\nthen jump') F(`the sign read: ${JSON.stringify(note)}`);
  const cr = d.pieces[crate];
  if ((await look(cr.x, cr.z + 1.4, 0, -0.85)) !== `map-${crate}`) F('the crate is not looked at');
  await use(0.6);
  const held = await ev(id => (window.__cq.game.state.containers[id]?.items ?? []).map(i => `${i.id}:${i.n}`), `map-${crate}`);
  if (JSON.stringify(held) !== '["bandage:2"]') F(`the crate held: ${JSON.stringify(held)}`);
  await ev(() => { const g = window.__cq.game; g.inv.toggle(false); g.state.openContainer = null; });

  // Back to the editor: saved, exported, a new map, the file imported.
  await ev(() => window.__cq.game.settings.show());
  await page.click('#settings [data-a="edit"]');
  await frame();
  if ((await doc()).pieces.length !== d.pieces.length) F('the editor did not come back to the map played');
  await page.$eval('#editor .ed-name', el => { el.value = 'test map'; el.dispatchEvent(new Event('change')); });
  await page.click('#editor [data-a="save"]');
  const saved = await ev(() => Object.keys(JSON.parse(localStorage.getItem('cq2038.maps') ?? '{}')));
  if (!saved.includes('test map')) F(`not saved: ${saved}`);
  await ev(() => { window.__exported = null; const click = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) window.__exported = { href: this.href, name: this.download }; else click.call(this); }; });
  await page.click('#editor [data-a="export"]');
  const out = await ev(async () => window.__exported && { name: window.__exported.name, text: await (await fetch(window.__exported.href)).text() });
  const file = path.resolve('logs/editor-export.json');
  if (!out || out.name !== 'test map.json') F(`export: ${out?.name}`);
  else fs.writeFileSync(file, out.text);
  const exported = out ? JSON.parse(out.text) : null;
  if (exported?.pieces?.length !== d.pieces.length) F('the export is not the map');
  await page.click('#editor [data-a="new"]');
  if ((await doc()).pieces.length !== 2) F('New did not make a new map');
  const input = await page.$('#editor .ed-file');
  await input.uploadFile(file);
  await page.waitForFunction(() => window.__cq.game.editor?.doc.name === 'test map', { timeout: 10000 }).catch(() => {});
  const back = await doc();
  if (back.name !== 'test map' || JSON.stringify(back.pieces) !== JSON.stringify(exported?.pieces)) F(`import: ${back.name}, ${back.pieces.length} pieces`);
  if (!(await ev(() => window.__cq.game.world.solids.some(s => s.y1 > 1.45 && s.y1 < 1.55)))) F('the imported map is not built');
  await page.close();
}
