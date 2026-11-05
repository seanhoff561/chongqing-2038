// M10-52 (U-104): a new run played through its opening. Black, fading up on him lying in the hideout at night looking
// up; he looks round (logs/opening-*.png) and down at the laptop open on his bag, Anna filling its screen; her three
// lines in English, in her recorded voice; the blip to black, and he's up, looking at it. E takes the laptop, then the
// bag; "Tab to open laptop"; Tab, and she's mid-sentence, full screen: her seven lines, red, arms crossed, then off
// to the corner with the status page behind her.
const WAKE = ['You woke up... I thought you were dead 哈哈哈', 'Seems like you hit your head pretty hard, what do you remember?', "If you don't say anything I'm not going to help you. Hmph!"];
const HELLO = ["-all going to die anyways... HEY!!! You can't just turn me on like that without a warning!", 'A-anyways... what I was saying is you, Li Wei, are gonna die. Got a problem with that?',
  "Lets see... starvation, gunshots, death by falling... you're cooked 哈哈哈", "But try not to worry too much. You've lasted much longer than most. In fact, I must admit that your slipperiness and sliminess is quite unmatched.",
  "This is the status page. Now, I know your thick skull can't understand what's going on here, but that's OK.", "If you really don't remember anything, though, I'd highly recommend the training room. It'll get you back in shape real fast.",
  'All you have to do is focus with Q and then click the dots on the side here, got it?'];

export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=run&seed=1', 'opening');
  // (A key first, as the menu's click would: the sound on.)
  await page.keyboard.press('ShiftLeft');
  // What's on screen now; and running the game on (a second and a half at a time) until a condition holds, noting
  // Anna's pose and whether she fills the screen as it goes.
  const LOOK = `(() => { const g = window.__cq.game, s = g.state, c = g.view.fp.cam, L = document.querySelector('#laptop');
    return { t: s.opening, hello: s.hello, black: +getComputedStyle(document.getElementById('wake')).opacity, camY: c.position.y - g.world.spawn.y, pitch: c.rotation.x,
      full: L.classList.contains('full') && L.style.display === 'block', pose: g.laptop.anna.now, hour: (s.time % 86400) / 3600, target: s.target, prompt: document.querySelector('#hud .prompt').textContent,
      notice: document.querySelector('#hud .notice').textContent, open: !!s.laptop?.open, gear: s.gear ?? null, desk: document.querySelector('#laptop .lt-desk').innerHTML }; })()`;
  const look = () => page.evaluate(LOOK);
  const until = async (cond, max = 80) => {
    const seen = [];
    for (let i = 0; i < max; i++) {
      const x = await page.evaluate(`(() => { const g = window.__cq.game, s = g.state; if (${cond}) return null; window.__cq.runFrames(90); const r = ${LOOK}; return (r.full ? 'full:' : 'corner:') + r.pose; })()`);
      if (x === null) break;
      seen.push(x);
    }
    return seen;
  };
  const frames = n => page.evaluate(`window.__cq.runFrames(${n})`);
  // The new run, as the menu starts it; what Anna says, as it's said.
  await page.evaluate(`(() => { const g = window.__cq.game; window.__said = []; const say = g.hud.say.bind(g.hud); g.hud.say = en => { window.__said.push(en); window.__at = g.state.opening; say(en); }; g.newRun(); window.__cq.runFrames(1); })()`);
  let r = await look();
  if (!(r.t !== undefined && r.black > 0.9 && r.hour > 1 && r.hour < 4)) fail('opening', `doesn't start black at night: ${JSON.stringify({ ...r, desk: 0 })}`);
  if (!(r.camY < 0.4 && r.pitch > 1.2)) fail('opening', `not lying looking up: camY ${r.camY} pitch ${r.pitch}`);
  await frames(90);
  r = await look();
  if (!(r.black > 0.2 && r.black < 0.8)) fail('opening', `no fade up: ${r.black}`);
  // His look round and her lines (screenshots by the scene's own seconds: logs/opening-<what>.png).
  const seen = [];
  for (const [at, name] of [[3, 'ceiling'], [5.1, 'debris'], [7.4, 'crate'], [9.5, 'shaft'], [12.5, 'laptop'], [17.5, 'closer']]) {
    seen.push(...await until(`s.opening >= ${at}`));
    await screenshot(page, `opening-${name}`);
  }
  seen.push(...await until('window.__said.length >= 3'));
  if (!seen.includes('full:talk') || !seen.includes('full:pout')) fail('opening', `her poses on the floor: ${[...new Set(seen)]}`);
  // The blip: once her last line's been read (as long as the subtitle shows), black.
  r = await page.evaluate(`(() => { const s = window.__cq.game.state, at = window.__at + 1.5 + window.__said[2].length * 0.06 + 0.2; window.__cq.runFrames(Math.max(1, Math.round((at - s.opening) * 60))); return ${LOOK}; })()`);
  if (!(r.t !== undefined && r.black > 0.99)) fail('opening', `no blip to black at the end: ${r.t} ${r.black}`);
  await until('s.opening === undefined');
  let said = await page.evaluate('window.__said.splice(0)');
  if (JSON.stringify(said) !== JSON.stringify(WAKE)) fail('opening', `her three lines: ${JSON.stringify(said)}`);
  const heard = await page.evaluate(`performance.getEntriesByType('resource').map(e => e.name).filter(n => n.includes('/vo/'))`);
  if (!heard.some(n => n.endsWith('wake-1.mp3'))) fail('opening', `her voice not played: ${heard}`);
  // He's up, looking at the laptop on his bag.
  await frames(5);
  r = await look();
  if (!(r.black < 0.01 && r.camY > 1.2)) fail('opening', `no control after it: black ${r.black} camY ${r.camY}`);
  await screenshot(page, 'opening-up');
  if (r.target !== 'gear-laptop' || !r.prompt.includes('Laptop')) fail('opening', `not looking at the laptop: ${r.target} ${r.prompt}`);
  // The laptop won't open yet; E takes it, then the bag.
  await page.keyboard.press('Tab'); await frames(5);
  if ((await look()).open) fail('opening', 'opened before he picked it up');
  await page.keyboard.press('KeyE'); await frames(5);
  r = await look();
  if (r.target !== 'gear-pack' || !r.prompt.includes('Backpack')) fail('opening', `the bag next: ${r.target} ${r.prompt}`);
  await page.keyboard.press('KeyE'); await frames(5);
  r = await look();
  if (r.gear || r.notice !== 'Tab to open laptop') fail('opening', `after both: ${JSON.stringify(r.gear)} notice "${r.notice}"`);
  await screenshot(page, 'opening-hint');
  // Opened: she's mid-sentence, full screen, red, arms crossed, then the corner and the status page.
  await page.keyboard.press('Tab');
  await frames(30);
  r = await look();
  if (r.notice) fail('opening', `the hint still up: ${r.notice}`);
  const hello = [];
  for (const [cond, name] of [['true', 'hello'], ["g.laptop.anna.now === 'blush'", 'red'], ["g.laptop.anna.now === 'pout'", 'crossed'], ["!document.querySelector('#laptop').classList.contains('full')", 'corner']]) {
    hello.push(...await until(cond));
    await screenshot(page, `opening-${name}`);
  }
  hello.push(...await until('s.hello === undefined'));
  await frames(400);
  r = await look();
  said = await page.evaluate('window.__said.splice(0)');
  if (JSON.stringify(said) !== JSON.stringify(HELLO)) fail('opening', `her speech: ${JSON.stringify(said)}`);
  for (const p of ['full:talk', 'full:shout', 'full:blush', 'full:pout', 'corner:talk']) if (!hello.includes(p)) fail('opening', `never ${p}: ${[...new Set(hello)]}`);
  if (r.full || !r.desk.includes('data-k="hp"')) fail('opening', `not the status page after: full ${r.full}`);
  await page.keyboard.press('Tab');
  await frames(5);
  await page.close();
}
