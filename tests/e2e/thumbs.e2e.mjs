// U-056: his thumbs (and fingertips) stay out of the pistol: in each hand's grip at the hip and aimed, no thumb joint
// or fingertip lies inside any of the gun's parts. A close-up of each (logs/thumbs-hip.png, logs/thumbs-aimed.png).
export default async function ({ open, fail }) {
  const page = await open('?scenario=gym&seed=1', 'thumbs');
  await page.waitForFunction('window.__cq.game.hands.ready', { timeout: 20000 });
  await page.evaluate(`(() => { const g = window.__cq.game; g.state.time = 12 * 3600; Object.assign(g.state.player.pos, { x: -60, y: 0, z: 60 }); g.input.yaw = 0; g.input.pitch = 0;
    window.__cq.give('pistol'); const st = g.state.inv.pack.items.find(x => x.id === 'pistol'); st.charge = 15; g.input.cmds.push({ c: 'bind', slot: 0, uid: st.uid }); g.runFrames(2); g.state.inv.held = 1; g.runFrames(60); })()`);
  const inside = () => page.evaluate(`(() => {
    const g = window.__cq.game, V = g.view.fp.cam.position.constructor, m = g.heldModel, hit = [];
    m.updateWorldMatrix(true, true);
    const meshes = []; m.traverse(o => { if (o.isMesh && o.visible && o.geometry.type === 'BoxGeometry') { o.geometry.computeBoundingBox(); meshes.push(o); } });
    g.hands.hands.forEach((h, i) => {
      for (const n of ['thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip', 'index-finger-tip', 'middle-finger-tip', 'ring-finger-tip', 'pinky-finger-tip']) {
        const b = h.bones.get(n); if (!b) continue;
        const p = b.getWorldPosition(new V());
        for (const o of meshes) if (o.geometry.boundingBox.containsPoint(o.worldToLocal(p.clone()))) { hit.push((i ? 'right ' : 'left ') + n); break; }
      }
    });
    return hit;
  })()`);
  const hip = await inside();
  await page.screenshot({ path: 'logs/thumbs-hip.png', clip: { x: 430, y: 250, width: 400, height: 290 } });
  if (hip.length) fail('thumbs', `at the hip, inside the pistol: ${hip.join(', ')}`);
  await page.evaluate('(() => { const g = window.__cq.game; g.input.mouse = 128; g.runFrames(40); })()');
  const aimed = await inside();
  await page.screenshot({ path: 'logs/thumbs-aimed.png', clip: { x: 280, y: 220, width: 400, height: 320 } });
  if (aimed.length) fail('thumbs', `aimed, inside the pistol: ${aimed.join(', ')}`);
  await page.close();
}
