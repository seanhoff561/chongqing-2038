// M4-92 (U-067): the troop helicopter over the roof of the building he went into, its searchlight lit, its squad
// dropped on the roof. Called the way the sim does it, then brought straight to its hover (its flight in takes a
// minute), seen from across the roof.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=yuzhong&seed=1', 'heli');
  const r = await page.evaluate(`(() => {
    const g = window.__cq.game, w = g.world, s = g.state;
    const b = w.plots.findIndex(p => !p.far && p.route && p.route.length >= 6), route = w.plots[b].route, inside = route[2], roof = route[route.length - 1];
    Object.assign(s.flags, { clear: true, god: true }); s.time = Math.floor(s.time / 86400) * 86400 + 15 * 3600;
    Object.assign(s.player.pos, { x: inside.x, y: inside.y + 0.05, z: inside.z }); s.player.vel = { x: 0, y: 0, z: 0 };
    g.runFrames(2);
    for (const u of s.units.filter(u => u.kind === 'humanoid' && !u.reserve).slice(0, 3)) u.saw = s.time;
    g.runFrames(8);
    const heli = s.units.find(u => u.kind === 'heli');
    if (!s.hive.heli || !heli.trip) return null;
    const t = heli.trip, last = t.path[t.path.length - 1]; t.pos = { ...last }; t.i = t.path.length;
    g.runFrames(30);
    // Across the roof from it, looking up at it.
    Object.assign(s.player.pos, { x: roof.x + 14, y: roof.y + 0.05, z: roof.z + 6 }); s.flags.noclip = true;
    const q = t.pos, dx = q.x - s.player.pos.x, dz = q.z - s.player.pos.z;
    g.input.yaw = Math.atan2(-dx, -dz); g.input.pitch = Math.atan2(q.y - roof.y - 1.6, Math.hypot(dx, dz));
    // (Frame by frame: a machine first seen far off is looked at again only every 30 drawn frames.)
    for (let i = 0; i < 35; i++) g.runFrames(1);
    return { phase: s.hive.heli.phase, squad: s.units.filter(u => u.reserve?.drop && u.kind === 'humanoid' && u.trip).length };
  })()`);
  if (!r) { fail('heli', 'the helicopter was not called'); return; }
  if (r.phase !== 'sweep' || r.squad < 4) fail('heli', `over the roof: ${JSON.stringify(r)}`);
  await screenshot(page, 'heli');
  await page.evaluate(`(() => { const g = window.__cq.game; g.state.flags.noclip = false; })()`);
}
