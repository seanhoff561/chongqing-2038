// M4-95 (U-069): a spider robot clinging upside down to the roof of a sewer run, in his headlamp.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=yuzhong&seed=1', 'crawlers');
  const ok = await page.evaluate(`(() => {
    const g = window.__cq.game, s = g.state, w = g.world;
    const u = s.units.find(u => u.kind === 'crawler' && u.id % 2 && u.patrol >= 0 && !u.extra && !u.reserve);
    if (!u) return false;
    Object.assign(s.flags, { god: true, clear: true }); window.__cq.give('headlamp'); s.player.lamp = 1;
    u.stop = undefined; const q = window.__cq.unitPose(w, u, s.time), p = w.patrols[u.patrol].pts;
    // Along its run from it, 3.5 m off, looking back at it and up a little.
    const b = p.find(t => Math.hypot(t.x - q.x, t.z - q.z) > 3.5) ?? p[0], d = Math.hypot(b.x - q.x, b.z - q.z) || 1, dx = (b.x - q.x) / d, dz = (b.z - q.z) / d;
    u.stop = { x: q.x, y: q.y, z: q.z, yaw: Math.atan2(dx, dz), t: 0 };
    Object.assign(s.player.pos, { x: q.x + dx * 3.5, y: q.y + 0.05, z: q.z + dz * 3.5 }); s.player.vel = { x: 0, y: 0, z: 0 };
    g.input.yaw = Math.atan2(dx, dz); g.input.pitch = 0.25;
    for (let i = 0; i < 35; i++) { s.player.lamp = 1; u.aware = 0; u.state = 'unaware'; u.trip = undefined; g.runFrames(1); }
    return true;
  })()`);
  if (!ok) { fail('crawlers', 'no spider robot on a sewer roof'); return; }
  await screenshot(page, 'crawler-sewer');
  await page.evaluate(`(() => { const u = window.__cq.game.state.units.find(u => u.kind === 'crawler' && u.id % 2 && u.patrol >= 0 && !u.extra); if (u) u.stop = undefined; window.__cq.game.state.player.lamp = 0; })()`);
}
