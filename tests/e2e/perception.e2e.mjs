// M4-30: the dev perception overlay. With ?dev=1 the panel's 'perception' box draws the nearest machines' sight as fans
// coloured by their alert, lists them with their awareness, and shows the district's alert; toggled on and off.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?dev=1&scenario=units&seed=1', 'perception');
  await page.evaluate(`window.__cq.runFrames(30)`);
  const box = await page.$('#dev .sight');
  if (!box) { fail('perception', 'no perception box in the dev panel'); return; }
  await box.click();
  await new Promise(r => setTimeout(r, 700));
  await page.evaluate(`window.__cq.runFrames(2)`);
  const r = await page.evaluate(`(() => { const el = document.getElementById('perception'); return { shown: el && getComputedStyle(el).display !== 'none', rows: el ? el.innerHTML.split('<br>').length - 1 : 0 }; })()`);
  if (!r.shown || r.rows < 3) fail('perception', `overlay ${JSON.stringify(r)}`);
  await screenshot(page, 'perception');
  await box.click();
  const off = await page.evaluate(`getComputedStyle(document.getElementById('perception')).display === 'none'`);
  if (!off) fail('perception', 'it did not toggle off');
  await page.close();
}
