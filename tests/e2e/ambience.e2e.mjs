// M8-09: the ambience in three places, without errors: in the Grand Tunnel (muffled, water dripping in the dark), on
// the bank at Chaotianmen (the river lapping, louder by night), and up on the street at Jiefangbei (machinery far off).
export default async function ({ open, fail }) {
  const page = await open('?scenario=tunnels&seed=1', 'ambience');
  await page.mouse.click(480, 270);
  const r = await page.evaluate(`(async () => {
    const g = window.__cq.game, am = g.sound.ambience, p = g.state.player;
    await g.audio.ctx?.resume();
    g.state.flags.god = true;
    const go = name => { const t = g.world.teleports.find(t => t.name === name); p.pos.x = t.x; p.pos.y = t.y; p.pos.z = t.z; p.vel.x = p.vel.y = p.vel.z = 0; };
    const stay = secs => { for (let i = 0; i < secs * 2; i++) g.runFrames(30); };
    const out = {};
    am.heard.drips = 0; stay(12);
    out.tunnel = { where: g.sound.env.where, drips: am.heard.drips, muffle: am.level.muffle };
    // Down on the bank below Chaotianmen: the nearest ground a little over the water (the riverside road).
    const c = g.world.teleports.find(t => t.name === 'chaotianmen'), hf = g.world.ground, sea = g.world.water.find(q => q.x1 - q.x0 > 1000);
    let bank = null;
    for (let d = 0; d < 400 && !bank; d += 4) for (let k = 0; k < 32 && !bank; k++) { const x = c.x + Math.cos(k / 32 * 6.283) * d, z = c.z + Math.sin(k / 32 * 6.283) * d, h = hf.y[Math.round(z / hf.cell) * hf.w + Math.round(x / hf.cell)]; if (h > sea.y1 + 1 && h < sea.y1 + 16) bank = { x, y: h + 0.1, z }; }
    p.pos.x = bank.x; p.pos.y = bank.y; p.pos.z = bank.z; p.vel.x = p.vel.y = p.vel.z = 0; g.state.time = 23 * 3600; am.heard.laps = 0; stay(12);
    out.bank = { where: g.sound.env.where, river: g.sound.river, laps: am.heard.laps, level: am.level.river };
    go('jiefangbei'); g.state.time = 12 * 3600; stay(1); am.heard.laps = 0; stay(6);
    out.street = { where: g.sound.env.where, far: am.level.far, laps: am.heard.laps, river: g.sound.river };
    return out;
  })()`);
  if (r.tunnel.where !== 'under' || !(r.tunnel.drips > 0)) fail('ambience', `tunnel: ${JSON.stringify(r.tunnel)}`);
  if (!(r.bank.laps > 0)) fail('ambience', `riverbank: ${JSON.stringify(r.bank)}`);
  if (!(r.street.far > 0) || r.street.laps > 0) fail('ambience', `street: ${JSON.stringify(r.street)}`);
  await page.close();
}
