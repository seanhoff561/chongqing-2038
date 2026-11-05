// U-021, M10-07 (U-104): a hiding spot in reach shows its prompt like everything else he can use, and the prompt is
// just the thing, no key; the sleep menu opened by holding Sleep Rough (Z) stays open through a key repeat.
export default async function ({ open, fail }) {
  const page = await open('?scenario=hideout', 'hideprompt');
  // A 0.6 m crate to hide in, set down on the street above the hideout.
  const text = await page.evaluate(`(() => { const g = window.__cq.game; g.world.hides.push({ id: g.world.hides.length, kind: 'crate', inner: { x0: 80, y0: 9, z0: 22, x1: 80.6, y1: 9.6, z1: 22.6 } });
    Object.assign(g.state.player.pos, { x: 80.3, y: 9.05, z: 23.6 }); g.input.yaw = 0; g.input.pitch = -0.3; window.__cq.runFrames(10); return document.querySelector('#hud .prompt, .prompt').textContent; })()`);
  if (!/^\S+\s+(Box|Crate)$/.test(text.trim())) fail('hideprompt', `the crate isn't just named: "${text}"`);
  // Hold E on open floor until the rough-sleep menu opens, then a key repeat of E must not close it.
  await page.evaluate(`(() => { const g = window.__cq.game; Object.assign(g.state.player.pos, { x: 80, y: 9.05, z: 28 }); g.input.pitch = -1.2; window.__cq.runFrames(10); })()`);
  await page.keyboard.down('KeyZ');
  for (let i = 0; i < 12; i++) await page.evaluate('window.__cq.runFrames(10)');
  await page.evaluate(`dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', repeat: true }))`);
  const stillOpen = await page.evaluate(`getComputedStyle(document.getElementById('sleep')).display !== 'none'`);
  if (!stillOpen) fail('hideprompt', 'a held Z closed the sleep menu');
  await page.keyboard.up('KeyZ');
  await page.close();
}
