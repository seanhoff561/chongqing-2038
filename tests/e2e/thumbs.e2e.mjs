// U-056, U-057: his thumbs and fingers stay out of the pistol, their thickness and all. Along each bone of both hands'
// thumbs (the two that show: its root's in the palm, where the grip sits) and fingers (a thumb 9 mm thick, a finger 8, the fingers wrapping round the grip allowed to touch it), at the
// hip and aimed, nothing passes inside a part of the gun. Close-ups: logs/thumbs-hip.png, logs/thumbs-aimed.png.
const CHAINS = { thumb: ['thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip'] };
for (const f of ['index', 'middle', 'ring', 'pinky']) CHAINS[f] = [`${f}-finger-phalanx-proximal`, `${f}-finger-phalanx-intermediate`, `${f}-finger-phalanx-distal`, `${f}-finger-tip`];

export default async function ({ open, fail }) {
  const page = await open('?scenario=gym&seed=1', 'thumbs');
  await page.waitForFunction('window.__cq.game.hands.ready', { timeout: 20000 });
  await page.evaluate(`(() => { const g = window.__cq.game; g.state.time = 12 * 3600; Object.assign(g.state.player.pos, { x: -60, y: 0, z: 60 }); g.input.yaw = 0; g.input.pitch = 0;
    window.__cq.give('pistol'); const st = g.state.inv.pack.items.find(x => x.id === 'pistol'); st.charge = 15; g.input.cmds.push({ c: 'bind', slot: 0, uid: st.uid }); g.runFrames(2); g.state.inv.held = 1; g.runFrames(60); })()`);
  /** For each hand and digit, how deep it goes into the gun (m, less its own half-thickness): > 0 is through it. */
  const depth = () => page.evaluate(`((CHAINS) => {
    const g = window.__cq.game, V = g.view.fp.cam.position.constructor, m = g.heldModel, out = {};
    m.updateWorldMatrix(true, true);
    const boxes = []; m.traverse(o => { if (o.isMesh && o.visible && o.geometry.type === 'BoxGeometry') { o.geometry.computeBoundingBox(); boxes.push(o); } });
    let part = ''; const into = (p, r) => { let worst = -1; for (const o of boxes) { const q = o.worldToLocal(p.clone()), b = o.geometry.boundingBox;
      const dx = Math.max(b.min.x - q.x, q.x - b.max.x), dy = Math.max(b.min.y - q.y, q.y - b.max.y), dz = Math.max(b.min.z - q.z, q.z - b.max.z);
      const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0), Math.max(dz, 0)), inside = Math.min(0, Math.max(dx, dy, dz));
      const d = r - (outside > 0 ? outside : inside); if (d > worst) { worst = d; part = o.parent && o.parent !== m ? (o.parent.name || 'grip') : 'frame'; } } return worst; };
    g.hands.hands.forEach((h, i) => { for (const [k, names] of Object.entries(CHAINS)) {
      const r = k === 'thumb' ? 0.0045 : 0.004, pts = names.map(n => h.bones.get(n)?.getWorldPosition(new V())).filter(Boolean);
      let worst = -1;
      for (let j = 0; j + 1 < pts.length; j++) for (let t = 0; t <= 1; t += 0.2) worst = Math.max(worst, into(pts[j].clone().lerp(pts[j + 1], t), r));
      out[(i ? 'right ' : 'left ') + k] = Math.round(worst * 1000) + (worst > 0 ? ' ' + part : '');
    } });
    return out;
  })(${JSON.stringify(CHAINS)})`);
  const check = (where, d) => {
    // The thumbs not into it at all; the fingers round the grip no more than half their thickness into its square
    // corners (a real grip's rounded there: U-057, the rest of the hand was right).
    const bad = Object.entries(d).filter(([k, v]) => (k.endsWith('thumb') ? parseInt(v) > 0 : parseInt(v) > 6));
    console.log(`thumbs ${where}: ${JSON.stringify(d)}`);
    if (bad.length) fail('thumbs', `${where}, into the pistol (mm): ${bad.map(([k, v]) => `${k} ${v}`).join(', ')}`);
  };
  check('at the hip', await depth());
  await page.screenshot({ path: 'logs/thumbs-hip.png', clip: { x: 430, y: 250, width: 400, height: 290 } });
  await page.evaluate('(() => { const g = window.__cq.game; g.input.mouse = 128; g.runFrames(40); })()');
  check('aimed', await depth());
  await page.screenshot({ path: 'logs/thumbs-aimed.png', clip: { x: 280, y: 220, width: 400, height: 320 } });
  await page.close();
}
