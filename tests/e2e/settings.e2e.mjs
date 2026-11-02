// M8-12, M8-13: Esc pauses with the controls listed, resume, settings and Quit to menu; the settings (sensitivity,
// invert Y, field of view, a volume, the subtitles, a key) changed, then a reload: all of them as they were set.
export default async function ({ open, fail }) {
  const page = await open('?scenario=gym&seed=2', 'settings');
  await page.evaluate(`localStorage.removeItem('cq2038.settings')`);
  await page.evaluate('window.__cq.runFrames(3)');
  await page.keyboard.press('Escape');
  const menu = await page.evaluate(`[...document.querySelectorAll('#pause button[data-a]')].map(b => b.dataset.a)`);
  if (!['resume', 'menu'].every(a => menu.includes(a))) fail('settings', `pause menu: ${menu.join(',')}`);
  await page.evaluate(`(() => {
    const set = (k, v) => { const i = document.querySelector('#pause input[data-set="' + k + '"]'); i.value = String(v); i.dispatchEvent(new Event('input')); };
    set('sens', 0.004); set('fov', 90); set('voice', 0.3); set('subsize', 1.4);
    const inv = document.querySelector('#pause input[data-invert]'); inv.checked = true; inv.dispatchEvent(new Event('change'));
    const sel = document.querySelector('#pause select[data-sub="lang"]'); sel.value = 'en'; sel.dispatchEvent(new Event('change'));
  })()`);
  await page.click('#pause button[data-bind="jump"]');
  await page.keyboard.press('KeyJ');
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction('window.__cq && window.__cq.ready', { timeout: 240000 });
  const r = await page.evaluate(`(() => { const g = window.__cq.game; return { sens: g.input.sensitivity, fov: g.view.fp.baseFov, voice: g.audio.volumes.voice, sub: g.hud.subSize, inv: g.input.invertY, lang: g.hud.subLang, jump: JSON.parse(localStorage.getItem('cq2038.settings')).keys.jump }; })()`);
  if (Math.abs(r.sens - 0.004) > 1e-9 || r.fov !== 90 || Math.abs(r.voice - 0.3) > 1e-9 || Math.abs(r.sub - 1.4) > 1e-9 || !r.inv || r.lang !== 'en' || !r.jump.includes('KeyJ')) fail('settings', `after reload: ${JSON.stringify(r)}`);
  await page.evaluate(`localStorage.removeItem('cq2038.settings')`);
  // Quit to menu: the main menu.
  await page.keyboard.press('Escape');
  await page.click('#pause button[data-a="menu"]');
  const boot = await page.evaluate(`[...document.querySelectorAll('#boot button')].map(b => b.textContent).join('|')`);
  if (!boot.includes('New Run')) fail('settings', `Quit to menu: ${boot}`);
  await page.close();
}
