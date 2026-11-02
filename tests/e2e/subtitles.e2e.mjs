// M8-04: the subtitles' language switched in the pause menu's settings: a line of Anna's in English alone, then
// Chinese alone; the size slider makes them bigger.
export default async function ({ open, fail }) {
  const page = await open('?scenario=gym&seed=1', 'subtitles');
  await page.evaluate('window.__cq.runFrames(5)');
  const line = async lang => {
    await page.keyboard.press('Escape');
    await page.select('#pause select[data-sub="lang"]', lang);
    await page.keyboard.press('Escape');
    return page.evaluate(`(() => { const g = window.__cq.game; g.state.remarks = undefined; g.state.body.lightBleed = -1; window.__cq.runFrames(2); g.state.body.lightBleed = 0; window.__cq.runFrames(3); window.__cq.runFrames(30);
      return document.querySelector('#hud .subs').textContent; })()`);
  };
  const en = await line('en'), zh = await line('zh');
  if (!/bleeding/.test(en) || /[一-鿿]{3}/.test(en.replace('安娜', ''))) fail('subtitles', `English alone wasn't: ${en}`);
  if (!/流血/.test(zh) || /bleeding/.test(zh)) fail('subtitles', `Chinese alone wasn't: ${zh}`);
  await page.keyboard.press('Escape');
  await page.evaluate(`(() => { const i = document.querySelector('#pause input[data-set="subsize"]'); i.value = '1.5'; i.dispatchEvent(new Event('input')); })()`);
  await page.keyboard.press('Escape');
  const size = await page.evaluate(`(() => { window.__cq.runFrames(2); return parseFloat(getComputedStyle(document.querySelector('#hud .subs')).fontSize); })()`);
  if (!(size > 24)) fail('subtitles', `size didn't change: ${size}`);
  await page.close();
}
