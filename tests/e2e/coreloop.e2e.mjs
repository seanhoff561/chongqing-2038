// M4-31 (U-013): the core loop end to end, in a new run in the city. One: a bed laid down claims a shelter; out in the
// street a humanoid has him, he's killed (the dev hook's shot); the death screen, Esc, a new run in the friends' hideout. Two: up and out,
// a container searched and emptied into his pack, back down, the bed slept in, the run saved.
export default async function ({ open, fail }) {
  const page = await open('?scenario=run&seed=1', 'coreloop');
  const look = (x, y, z) => `(() => { const g = window.__cq.game, p = g.state.player.pos, dx = ${x} - p.x, dz = ${z} - p.z; g.input.yaw = Math.atan2(-dx, -dz); g.input.pitch = Math.atan2(${y} - p.y - 1.6, Math.hypot(dx, dz)); })()`;
  await page.evaluate(`(() => { localStorage.removeItem('cq2038.save'); const s = window.__cq.game.state; s.flags.god = false; s.flags.clear = false; s.time = 12 * 3600; })()`);

  // A bedroll laid on the floor in front of him claims a bed: a shelter of his own.
  const a = await page.evaluate(`(() => { const g = window.__cq.game, s = g.state; window.__cq.give('bedroll');
    const st = s.inv.pack.items.find(i => i.id === 'bedroll'); g.input.pitch = -1.0; g.runFrames(3);
    g.input.cmds.push({ c: 'use', uid: st.uid }); g.runFrames(2);
    return { placed: s.placed.map(p => p.item), shelters: s.shelters.length }; })()`);
  if (!a.placed.includes('bedroll') || a.shelters < 1) fail('coreloop', `no bed laid and claimed: ${JSON.stringify(a)}`);

  // Out in the street in front of a humanoid, by day: it has him, and kills him.
  const b = await page.evaluate(`(() => { const g = window.__cq.game, s = g.state, w = g.world, home = s.player.pos;
    const u = s.units.find(u => u.kind === 'humanoid' && !u.extra && u.patrol >= 0 && !u.quiet && w.patrols[u.patrol].kind === 'street' && window.__cq.unitPose(w, u, s.time).active && Math.hypot(w.patrols[u.patrol].pts[0].x - home.x, w.patrols[u.patrol].pts[0].z - home.z) > 300);
    const q = window.__cq.unitPose(w, u, s.time);
    // (On a point of its own beat, solid ground, about 12 m off, ahead of it where it's looking: one behind it, it can
    // walk away from him unseeing, as the real-time frames between these steps decide.)
    const fx = Math.sin(q.yaw), fz = Math.cos(q.yaw), ahead = p => { const dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz) || 1; return (dx * fx + dz * fz) / d; };
    const at = w.patrols[u.patrol].pts.map(p => ({ p, d: Math.abs(Math.hypot(p.x - q.x, p.z - q.z) - 12) + (ahead(p) > 0.7 ? 0 : 50) })).sort((a, b) => a.d - b.d)[0].p;
    Object.assign(s.player.pos, { x: at.x, y: at.y + 0.05, z: at.z }); s.player.vel = { x: 0, y: 0, z: 0 }; s.player.mode = 'ground';
    let engaged = false;
    for (let i = 0; i < 60 && !engaged; i++) { g.runFrames(30); engaged = u.state === 'engaged'; }
    // (Engaged, he's shot dead: the dev hook's kill, the rifle's own work being gunfire.test's.)
    if (engaged) { window.__cq.kill('shot'); g.runFrames(2); }
    const o = window.__cq.unitPose(w, u, s.time);
    return { engaged, dead: !!s.dead, why: { aware: u.aware, state: u.state, d: Math.round(Math.hypot(o.x - s.player.pos.x, o.z - s.player.pos.z)), dy: Math.round(o.y - s.player.pos.y), fog: s.weather.fog, mode: s.player.mode, trip: u.trip?.kind } }; })()`);
  if (!b.engaged) fail('coreloop', `the humanoid never had him: ${JSON.stringify(b.why)}`);
  if (!b.dead) fail('coreloop', 'he did not die');
  if (!(await page.$('#death .d-new'))) fail('coreloop', 'no death screen');
  // Esc: the main menu (U-098), and New Run from it.
  await page.keyboard.press('Escape');
  await page.waitForSelector('#boot .new', { timeout: 240000 });
  await page.click('#boot .new');
  await page.waitForFunction('!window.__cq.game.state.dead && window.__cq.game.state.time < 86400', { timeout: 240000 });
  const c = await page.evaluate(`(() => { const s = window.__cq.game.state; return { shelters: s.shelters.map(h => h.id), placed: s.placed.length }; })()`);
  if (c.shelters.join() !== 'airraid-mattress' || c.placed) fail('coreloop', `the new run isn't a fresh start in the hideout: ${JSON.stringify(c)}`);

  // Up and out: the nearest container holding something, searched (F held) and emptied into his pack.
  const box = await page.evaluate(`(() => { const g = window.__cq.game, s = g.state, w = g.world, home = { ...s.player.pos };
    window.__home = home; s.time = 12 * 3600; s.flags.god = true;
    const its = w.inter.filter(i => i.kind === 'container' && i.data?.loot).sort((a, b) => Math.hypot(a.x - home.x, a.z - home.z) - Math.hypot(b.x - home.x, b.z - home.z)).slice(0, 8);
    // (Stood a step off it on whichever side there's floor, looking at it.)
    for (const it of its) for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.8, 0.8], [-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8]]) {
      Object.assign(s.player.pos, { x: it.x + ox, y: it.y + 0.2, z: it.z + oz }); s.player.vel = { x: 0, y: 0, z: 0 }; s.player.mode = 'air';
      for (let i = 0; i < 4; i++) g.runFrames(15);
      const p = s.player.pos, dx = it.x - p.x, dz = it.z - p.z;
      g.input.yaw = Math.atan2(-dx, -dz); g.input.pitch = Math.atan2(it.y - p.y - 1.6, Math.hypot(dx, dz)); g.runFrames(2);
      if (s.target === it.id && s.player.mode === 'ground') return { id: it.id };
    }
    return { id: null }; })()`);
  if (!box.id) fail('coreloop', 'no container to search near the hideout');
  const before = await page.evaluate(`window.__cq.game.state.inv.pack.items.length`);
  await page.keyboard.down('KeyF');
  for (let i = 0; i < 12; i++) await page.evaluate('window.__cq.runFrames(15)');
  await page.keyboard.up('KeyF');
  const opened = await page.evaluate(`(() => { const g = window.__cq.game, s = g.state; const n = s.containers['${box.id}']?.items.length ?? -1; g.input.cmds.push({ c: 'takeall' }); g.runFrames(2); return { open: s.openContainer, n, pack: s.inv.pack.items.length }; })()`);
  if (opened.n < 0) fail('coreloop', 'the container was never opened');
  else if (opened.n > 0 && opened.pack <= before) fail('coreloop', `nothing came out of it: ${JSON.stringify(opened)}`);
  await page.keyboard.press('KeyF');

  // Back down to the hideout clean (nothing on him, nothing given away), the bed slept in: the run saved.
  const d = await page.evaluate(`(() => { const g = window.__cq.game, s = g.state, w = g.world, home = window.__home; s.flags.god = false;
    const bed = w.inter.find(i => i.id === 'airraid-mattress');
    Object.assign(s.player.pos, { x: bed.x + 1.1, y: home.y, z: bed.z }); s.player.vel = { x: 0, y: 0, z: 0 }; g.runFrames(3);
    return { x: bed.x, y: bed.y, z: bed.z, tag: !!s.player.tag }; })()`);
  if (d.tag) fail('coreloop', 'he came back tagged');
  await page.evaluate(look(d.x, d.y, d.z));
  await page.evaluate('window.__cq.runFrames(3)');
  const slept = await page.evaluate(`(() => { const g = window.__cq.game, s = g.state, t0 = s.time; g.input.cmds.push({ c: 'act', name: 'sleep', arg: 6 }); g.runFrames(3);
    return { target: s.target, slept: s.time - t0 > 3600, dead: !!s.dead, save: !!localStorage.getItem('cq2038.save') }; })()`);
  if (slept.target !== 'airraid-mattress') fail('coreloop', `not at the bed: ${slept.target}`);
  if (!slept.slept || slept.dead) fail('coreloop', `no night's sleep: ${JSON.stringify(slept)}`);
  if (!slept.save) fail('coreloop', 'the run was not saved on waking');
  await page.evaluate(`localStorage.removeItem('cq2038.save')`);
  await page.close();
}
