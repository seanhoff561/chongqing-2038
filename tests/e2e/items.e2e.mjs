// M5-34 (U-053): every item modelled as the real thing. Each is held in turn (one model in the hand, of several parts,
// a sensible size); what's in his hand is gathered into contact sheets (logs/items-hand-N.png), the models laid out in
// rows in front of him, labelled (logs/items-sheet-N.png), and every item shown in the backpack (logs/items-pack-N.png).
import fs from 'fs';

const ids = [...fs.readFileSync('src/data/items.ts', 'utf8').matchAll(/^\s*[IF]\('([a-z0-9]+)'/gm)].map(m => m[1]);

/** Lay images (data URLs) out over the page in a grid, each labelled; returns once they're drawn. */
const tiles = (shots, cols) => `(async () => {
  const d = document.createElement('div'); d.id = 'sheet';
  d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#111;display:grid;grid-template-columns:repeat(${cols},1fr);grid-auto-rows:${100 / cols}vh';
  for (const [id, src] of ${JSON.stringify(shots)}) d.insertAdjacentHTML('beforeend', '<div style="position:relative;overflow:hidden"><img src="' + src + '" style="width:100%;height:100%;object-fit:cover"><span style="position:absolute;left:4px;bottom:2px;color:#fff;font:11px monospace;text-shadow:0 0 3px #000">' + id + '</span></div>');
  document.body.appendChild(d);
  await Promise.all([...d.querySelectorAll('img')].map(i => i.decode()));
})()`;

export default async function ({ open, fail, screenshot }) {
  if (ids.length < 100) { fail('items', `only ${ids.length} items read from items.ts`); return; }
  const page = await open('?scenario=hideout&seed=1', 'items');
  await page.waitForFunction('window.__cq.game.hands.ready', { timeout: 20000 });
  await page.evaluate(`(() => { const g = window.__cq.game; g.state.time = 12 * 3600; Object.assign(g.state.player.pos, { x: 80, y: 9, z: 25 }); g.input.yaw = 0; g.input.pitch = 0; window.__sheet = []; })()`);

  // Each held in turn: one model in the right hand, built of parts, not too big for it; a shot of the hand.
  const hand = [];
  for (const id of ids) {
    const r = await page.evaluate(`(() => { const g = window.__cq.game, inv = g.state.inv;
      inv.pack.items.length = 0; inv.hotbar = inv.hotbar.map(() => null); window.__cq.give('${id}');
      const st = inv.pack.items[0]; if (!st) return { err: 'not given' };
      inv.hotbar[0] = st.uid; inv.held = 1; g.runFrames(30);
      const kids = g.hands.heldSlot(1).children; if (kids.length !== 1) return { err: kids.length + ' models in hand' };
      const m = kids[0]; let parts = 0, Box3; m.traverse(o => { if (o.geometry) { parts++; if (!Box3) { o.geometry.computeBoundingBox(); Box3 = o.geometry.boundingBox.constructor; } } });
      const b = new Box3().setFromObject(m.clone()), s = b.getSize(b.min.clone());
      window.__sheet.push(['${id}', m.clone()]);
      return { parts, big: Math.max(s.x, s.y, s.z) }; })()`);
    if (r.err) { fail('items', `${id}: ${r.err}`); continue; }
    if (r.parts < 2) fail('items', `${id}: a single shape in hand`);
    if (r.big > 1.2 || r.big < 0.03) fail('items', `${id}: ${r.big.toFixed(2)} m across in hand`);
    hand.push([id, 'data:image/png;base64,' + await page.screenshot({ clip: { x: 430, y: 290, width: 320, height: 180 }, encoding: 'base64' })]);
  }
  for (let k = 0; k * 16 < hand.length; k++) {
    await page.evaluate(tiles(hand.slice(k * 16, k * 16 + 16), 4));
    await screenshot(page, `items-hand-${k + 1}`);
    await page.evaluate(`document.getElementById('sheet').remove()`);
  }

  // The models laid out in rows in front of him on a slate backdrop (the sky's as pale as a white plate), each turned
  // three-quarters on to him and scaled to its cell, a key light over his shoulder.
  const per = 24, cols = 6, rows = 4;
  for (let k = 0; k * per < ids.length; k++) {
    await page.evaluate(`(() => { const g = window.__cq.game, cam = g.view.fp.cam; g.state.inv.held = 0; g.input.pitch = 0.35; g.runFrames(30);
      const Group = g.hands.heldSlot(1).constructor, D = 1.2, H = 2 * D * Math.tan(cam.fov * Math.PI / 360), W = H * cam.aspect;
      const sheet = new Group(), key = new g.view.sun.constructor(0xffffff, 1.6); sheet.name = "sheet"; cam.add(sheet); key.position.set(0.8, 1.5, 1); key.target = sheet; sheet.add(key);
      let slab; window.__sheet.forEach(([, m]) => m.traverse(x => { if (!slab && x.geometry?.type === 'BoxGeometry') slab = x; }));
      const back = new slab.constructor(new slab.geometry.constructor(W * 2.2, H * 2.2, 0.01), slab.material.clone()); back.material.map = null; back.material.color.setHex(0x2a2e33); back.material.metalness = 0;
      back.position.set(0, 0, -D - 0.8); sheet.add(back);
      const labels = document.createElement('div'); labels.id = 'labels'; labels.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none;font:11px monospace;color:#fff;text-shadow:0 0 3px #000';
      window.__sheet.slice(${k * per}, ${(k + 1) * per}).forEach(([id, m], i) => {
        const c = i % ${cols}, r = Math.floor(i / ${cols}), turn = new Group(), o = new Group();
        m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.updateMatrixWorld(true);
        let Box3; m.traverse(x => { if (x.geometry && !Box3) { x.geometry.computeBoundingBox(); Box3 = x.geometry.boundingBox.constructor; } });
        // (Upright as held, -x up; a gun or anything longest fore and aft turned side on, its muzzle to the right.)
        const raw = new Box3().setFromObject(m).getSize(new (new Box3().min.constructor)()); m.rotation.set(0, raw.z > Math.max(raw.x, raw.y) ? -Math.PI / 2 : 0, -Math.PI / 2); turn.add(m); turn.rotation.set(0.3, -0.45, 0); turn.updateMatrixWorld(true);
        const b = new Box3().setFromObject(turn), s = b.getSize(b.min.clone()), ctr = b.getCenter(b.min.clone()), k2 = Math.min(W / ${cols}, H / ${rows}) * 0.72 / Math.max(s.x, s.y, s.z);
        // (Each turned to face the eye down its own line of sight, or the ones out at the sides are seen edge on.)
        const x = -W / 2 + (c + 0.5) * W / ${cols}, y = H / 2 - (r + 0.45) * H / ${rows};
        turn.position.copy(ctr).negate(); o.add(turn); o.scale.setScalar(k2); o.position.set(x, y, -D); o.rotation.set(Math.atan2(y, D), Math.atan2(-x, D), 0);
        sheet.add(o);
        labels.insertAdjacentHTML('beforeend', '<span style="position:absolute;left:' + (c / ${cols} * 100 + 1) + '%;top:' + ((r + 1) / ${rows} * 100 - 3.5) + '%">' + id + '</span>');
      });
      document.body.appendChild(labels); g.runFrames(1); })()`);
    await screenshot(page, `items-sheet-${k + 1}`);
    await page.evaluate(`(() => { const cam = window.__cq.game.view.fp.cam; cam.remove(cam.getObjectByName('sheet')); document.getElementById('labels').remove(); })()`);
  }

  // Every item in the backpack: as many as fit at a time, the backpack open (its key, Alt: M10-05), each with its icon.
  await page.evaluate(`(() => { const g = window.__cq.game; g.state.inv.held = 0; g.input.pitch = 0; g.runFrames(2); })()`);
  let next = 0, n = 0;
  while (next < ids.length) {
    const r = await page.evaluate(`(() => { const g = window.__cq.game, inv = g.state.inv, ids = ${JSON.stringify(ids)}; inv.pack.items.length = 0; inv.hotbar = inv.hotbar.map(() => null);
      let i = ${next}; while (i < ids.length && window.__cq.give(ids[i]) === 0) i++; g.runFrames(2); return { next: i, held: inv.pack.items.length }; })()`);
    if (r.next === next) { fail('items', `${ids[next]} won't go in an empty backpack`); break; }
    await page.keyboard.press('AltLeft');
    const shown = await page.evaluate(`(() => { window.__cq.runFrames(2); return document.querySelectorAll('#inv .inv-item').length; })()`);
    if (shown < r.held) fail('items', `backpack ${n + 1}: ${shown} of ${r.held} items shown`);
    await screenshot(page, `items-pack-${++n}`);
    await page.keyboard.press('AltLeft');
    await page.evaluate('window.__cq.runFrames(2)');
    next = r.next;
  }
  await page.close();
}
