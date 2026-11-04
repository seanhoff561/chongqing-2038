// M4-22c (U-048), M10-01 (U-104): the city boots within its budget, painting a loading screen first; waking at the save
// after death, or a new run from the menu, happens in place: no reload, the same world, the view kept, in a moment.
const BOOT = 120000, NEW = 2000;
export default async function ({ open, fail }) {
  const page = await open('?scenario=run&seed=1', 'inplace');
  const boot = await page.evaluate('window.__cq.boot');
  if (!(boot.view > 0 && boot.view < BOOT)) fail('inplace', `boot ${JSON.stringify(boot)} over its ${BOOT} ms budget`);
  if (await page.$('#loading')) fail('inplace', 'the loading screen still up');
  // Dead (to a humanoid's rifle), then a key: he wakes at the save (written as the run started).
  const after = async (how) => {
    const r = await page.evaluate(`(async () => {
      window.__mark = 1;
      const g = window.__cq.game, w = g.world, units = g.view.world.children.length;
      ${how}
      const t = performance.now();
      ${how.includes('kill') ? "window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));" : "document.querySelector('#settings [data-a=menu]').click(); document.querySelector('#boot .new').click();"}
      const ms = performance.now() - t;
      g.runFrames(2);
      const p = g.state.player.pos, sp = g.world.spawn;
      return { ms, mark: window.__mark, same: g.world === w, kept: g.view.world.children.length === units, dead: !!g.state.dead, tick: g.state.tick,
        home: Math.hypot(p.x - sp.x, p.z - sp.z), death: !!document.querySelector('#death .d-title'), ui: g.input.uiOpen, deaths: g.state.deaths ?? 0 };
    })()`);
    return r;
  };
  // (A fresh run, saved as it starts: the page is shared with the other checks.)
  await page.evaluate("(() => { const g = window.__cq.game; g.load('run', 1); g.runFrames(2); window.__cq.save(); })()");
  for (const [label, how] of [['after death', "window.__cq.kill('rifle'); g.runFrames(1); if (!document.querySelector('#death')) return { nodeath: true };"], ['from the menu', 'g.settings.show();']]) {
    const r = await after(how);
    if (r.nodeath) { fail('inplace', 'no death screen'); continue; }
    if (r.mark !== 1) fail('inplace', `${label}: the page reloaded`);
    if (!r.same || !r.kept) fail('inplace', `${label}: the world was built again (same ${r.same}, view kept ${r.kept})`);
    if (r.dead || r.home > 2 || r.tick > 5 || r.deaths !== (label === 'after death' ? 1 : 0)) fail('inplace', `${label}: not as saved (${JSON.stringify(r)})`);
    if (r.ms > NEW) fail('inplace', `${label}: took ${Math.round(r.ms)} ms`);
    console.log(`inplace ${label}: ${Math.round(r.ms)} ms; boot ${JSON.stringify(boot)}`);
  }
  // (The shared page back as the other checks expect it.)
  await page.evaluate("(() => { const g = window.__cq.game; g.settings.hide(); g.load('run', 1); g.runFrames(2); })()");
  await page.close();
}
