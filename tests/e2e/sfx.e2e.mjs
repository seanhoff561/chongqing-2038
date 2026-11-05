// M8-07, M8-08: every sound category plays without errors (the harness fails on any console error): each cue (footsteps,
// parkour, landings, tools, weapons, doors, containers, eating, his stomach), footsteps and landings on every surface
// dry and wet, and the body's sounds in play: a growling stomach when he's hungry, his heart when he's badly hurt.
export default async function ({ open, fail }) {
  const page = await open('?scenario=hideout&seed=1', 'sfx');
  await page.mouse.click(480, 270);
  const r = await page.evaluate(`(async () => {
    const q = window.__cq, g = q.game, a = g.audio;
    await a.ctx?.resume();
    const cues = q.cues();
    for (const id of cues) { q.playCue(id); q.runFrames(2); }
    for (const surf of ['hard', 'metal', 'wood', 'water', 'grass', 'grit', 'snow']) for (const id of ['step-jog', 'step-sprint', 'land']) { q.playCue(id, surf, false); q.playCue(id, surf, true); q.runFrames(1); }
    g.state.flags.god = true; g.state.body.satiety = 10;
    for (let i = 0; i < 80; i++) q.runFrames(30);
    g.state.body.hp = 10; q.runFrames(30);
    return { state: a.ctx?.state, cues, heart: g.sound.heart.level, growl: g.state.body.growl };
  })()`);
  if (r.state !== 'running') fail('sfx', `audio ${r.state}`);
  const want = ['step-crouch', 'step-jog', 'step-sprint', 'jump', 'vault', 'wallrun', 'grab', 'land', 'land-hard', 'roll', 'reload', 'blow-crowbar-metal', 'door-open', 'door-close', 'force', 'open-crate', 'eat', 'drink', 'stomach'];
  for (const id of want) if (!r.cues.includes(id)) fail('sfx', `no '${id}' cue`);
  if (!(r.heart > 0.8)) fail('sfx', `badly hurt, his heart only ${r.heart}`);
  if (r.growl === undefined) fail('sfx', 'hungry, his stomach never counted down to a growl');
  // M8-07, U-104: one volume, the settings' slider, moved while it all plays, sets it at once.
  await page.keyboard.press('Escape');
  const m = await page.evaluate(`(() => {
    const a = window.__cq.game.audio, i = document.querySelector('#settings input[data-set="vol"]');
    if (!i) return 'no slider';
    i.value = '0.6'; i.dispatchEvent(new Event('input'));
    localStorage.removeItem('cq2038.settings');
    return +a.master.gain.value.toFixed(2) === 0.6 ? 'ok' : a.master.gain.value;
  })()`);
  if (m !== 'ok') fail('sfx', `volume: ${m}`);
  await page.keyboard.press('Escape');
  await page.close();
}
