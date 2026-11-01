// M4-33: the audio engine starts after a click with no errors, and the machines are heard where they are: with one
// drone overhead the rotors are quieter than with three, and the walkers' footfalls and the cameras play without error;
// the machines' dread (M4-52) plays its cues and the full alert without error.
export default async function ({ open, fail }) {
  const page = await open('?scenario=units&seed=1', 'audio');
  await page.mouse.click(480, 270);
  const r = await page.evaluate(`(async () => {
    const g = window.__cq.game, a = g.audio, U = g.state.units, p = g.state.player.pos;
    await a.ctx?.resume();
    const fly = U.filter(u => (u.kind === 'drone' || u.kind === 'hunter') && !u.reserve).slice(0, 3);
    const hear = n => {
      U.forEach(u => { u.stop = { x: 1000, y: 30, z: 1000, yaw: 0, t: 0 }; });
      fly.slice(0, n).forEach((u, i) => { u.stop = { x: p.x + i * 4 - 4, y: 12, z: p.z - 10, yaw: 0, t: 0 }; });
      for (let i = 0; i < 40; i++) g.runFrames(1);
      return g.sound.voices.level();
    };
    const one = hear(1), three = hear(3);
    // The walkers back on their beats, round him: their footfalls.
    U.forEach(u => { u.stop = undefined; });
    for (let i = 0; i < 120; i++) g.runFrames(1);
    // Frightening machines (M4-52): one makes him out, notices him, has him; the city at full alert.
    const h = U.find(u => u.kind === 'humanoid'), d0 = g.sound.dread;
    h.state = 'unaware'; h.aware = 0.2; for (let i = 0; i < 10; i++) g.runFrames(1);
    h.state = 'suspicious'; h.aware = 0.5; for (let i = 0; i < 10; i++) g.runFrames(1);
    h.state = 'engaged'; h.aware = 1.5; d0.alert = 1; for (let i = 0; i < 200; i++) g.runFrames(1);
    // Hurt and hunted (M4-55): his breath and heart loud.
    g.state.flags.god = true; g.state.body.hp = 15; for (let i = 0; i < 30; i++) g.runFrames(1);
    const br = g.sound.breath.level;
    // The rain as recorded (U-070), loaded and looping.
    g.state.weather.rain = 1; for (let i = 0; i < 10; i++) g.runFrames(1);
    for (let k = 0; k < 40 && !g.sound.ambience.rec; k++) { await new Promise(r => setTimeout(r, 250)); g.runFrames(1); }
    const rec = !!g.sound.ambience.rec; g.state.weather.rain = 0;
    // The recorded sounds (M4-98) loaded.
    for (let k = 0; k < 40 && g.sound.recorded < 65; k++) { await new Promise(r => setTimeout(r, 250)); }
    const recorded = g.sound.recorded;
    return { state: a.ctx?.state, one, three, n: fly.length, hum: g.sound.ambience.level.hum, alert: d0.alert, heart: br.heart, track: g.sound.music.track, rec, recorded };
  })()`);
  if (r.state !== 'running') fail('audio', `the audio is ${r.state} after a click`);
  // The city's ambience playing under it all (M4-51).
  if (!(r.hum > 0)) fail('audio', 'no ambience');
  // The music for the street playing (M4-86).
  if (!r.rec) fail('audio', 'the rain recording did not load');
  if (r.recorded < 65) fail('audio', `only ${r.recorded} recorded sounds loaded`);
  if (r.track !== 'ground') fail('audio', `the music on the plaza is ${r.track}`);
  if (!(r.alert > 0.9)) fail('audio', `the alert fell at once (${r.alert})`);
  if (!(r.heart > 0.8)) fail('audio', `hurt and hunted, his heart only ${r.heart}`);
  if (r.n < 3) fail('audio', `only ${r.n} flyers in the lineup`);
  if (!(r.one > 0)) fail('audio', `a drone overhead is silent (${r.one})`);
  if (!(r.three > r.one * 1.8)) fail('audio', `three drones (${r.three.toFixed(3)}) no louder than one (${r.one.toFixed(3)})`);
  console.log(`audio: one drone ${r.one.toFixed(3)}, three ${r.three.toFixed(3)}`);
  await page.close();
}
