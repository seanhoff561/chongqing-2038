// M3-19: the Li family flat on a run, by day: the room turned over, his father's badge and the phone on the floor;
// the phone, used, plays its voicemail (no subtitle: U-104), its words in its description.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=run&seed=1', 'liflat');
  // (A run already under way: past its opening, M10-52.)
  await page.evaluate('(() => { const s = window.__cq.game.state; delete s.opening; delete s.gear; delete s.hello; window.__cq.runFrames(1); })()');
  const r = await page.evaluate(`(() => { const g = window.__cq.game, s = g.state, t = g.world.teleports.find(q => q.name === 'Li family flat');
    if (!t) return null;
    s.time = 14 * 3600; s.flags.clear = true;
    const b = s.dropped.find(d => d.stack.id === 'badge');
    Object.assign(s.player.pos, { x: t.x, y: t.y - 1.45, z: t.z }); s.player.fallFrom = s.player.pos.y;
    const dx = b.x - t.x, dz = b.z - t.z; g.input.yaw = Math.atan2(-dx, -dz); g.input.pitch = -Math.atan2(1.5, Math.hypot(dx, dz));
    window.__cq.runFrames(40);
    return { items: s.dropped.filter(d => !d.loose).map(d => d.stack.id).sort().join(','), mode: s.player.mode }; })()`);
  if (!r) { fail('liflat', 'no Li family flat teleport'); await page.close(); return; }
  if (r.items !== 'badge,phone') fail('liflat', `on the floor: ${r.items}`);
  await screenshot(page, 'liflat');
  // Into the backpack, then used: the voicemail plays, unsubtitled (subtitles are Anna's lines only, U-104); its words
  // are in the phone's description, hovered in the backpack.
  const subs = await page.evaluate(`(() => { const g = window.__cq.game, s = g.state, i = s.dropped.findIndex(d => d.stack.id === 'phone'), st = s.dropped.splice(i, 1)[0].stack;
    Object.assign(st, { x: 9, y: 0 }); s.inv.pack.items.push(st); g.input.cmds.push({ c: 'use', uid: st.uid }); window.__cq.runFrames(30);
    return document.querySelector('#hud .subs').textContent; })()`);
  if (subs) fail('liflat', `the voicemail subtitled: "${subs}"`);
  await page.keyboard.press('AltLeft');
  const at = await page.evaluate(`(() => { window.__cq.runFrames(3); const e = [...document.querySelectorAll('.inv-item')].find(x => x.textContent.includes('破手机')); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`);
  if (at) await page.mouse.move(at.x, at.y);
  const tip = await page.evaluate(`document.querySelector('.inv-tip')?.textContent ?? ''`);
  if (!tip.includes('Weiwei')) fail('liflat', `the phone's description hasn't the voicemail: "${tip.slice(0, 120)}"`);
  await screenshot(page, 'liflat-voicemail');
  await page.close();
}
