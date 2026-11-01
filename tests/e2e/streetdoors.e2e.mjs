// M4-91 (U-066): most street doors shut, each shown for what holds it: a chain and padlock, a lock's padlocked hasp,
// a doorway heaped with rubble. Standing outside one of each, by day.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=yuzhong&seed=1', 'streetdoors');
  for (const lock of ['chained', 'locked', 'collapsed']) {
    const ok = await page.evaluate(`(() => {
      const g = window.__cq.game, w = g.world, s = g.state;
      const d = w.inter.find(i => i.kind === 'door' && /\\.street\\d+$/.test(i.id) && i.data?.lock === '${lock}' && w.plots.some(p => p.route && Math.hypot(p.route[0].x - i.x, p.route[0].z - i.z) < 3));
      if (!d) return false;
      const p = w.plots.find(p => p.route && Math.hypot(p.route[0].x - d.x, p.route[0].z - d.z) < 3), o = p.route[0], dx = o.x - d.x, dz = o.z - d.z, L = Math.hypot(dx, dz) || 1;
      Object.assign(s.flags, { clear: true, noclip: true }); s.time = 13 * 3600; s.player.lamp = 0;
      Object.assign(s.player.pos, { x: d.x + (dx / L) * 2.2, y: d.y - 1.1, z: d.z + (dz / L) * 2.2 }); s.player.vel = { x: 0, y: 0, z: 0 };
      g.input.yaw = Math.atan2(dx, dz); g.input.pitch = -0.1; g.runFrames(20);
      return true;
    })()`);
    if (!ok) { fail('streetdoors', `no ${lock} street door found`); continue; }
    await screenshot(page, `streetdoor-${lock}`);
    // And from inside (U-072: what holds it shows on both faces).
    if (lock !== 'collapsed') {
      await page.evaluate(`(() => { const g = window.__cq.game, s = g.state; const yaw = g.input.yaw; s.flags.god = true; s.player.pos.x -= Math.sin(yaw) * 4.4; s.player.pos.z -= Math.cos(yaw) * 4.4; g.input.yaw = yaw + Math.PI; for (let i = 0; i < 10; i++) g.runFrames(2); })()`);
      await screenshot(page, `streetdoor-${lock}-inside`);
    }
  }
}
