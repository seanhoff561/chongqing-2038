// U-021, M10-07 (U-104): a hiding spot in reach shows its prompt like everything else he can use, and the prompt is
// just the thing, no key; the sleep menu opened by holding Sleep Rough (Z) stays open through a key repeat.
export default async function ({ open, fail }) {
  const page = await open('?scenario=gym', 'hideprompt');
  const text = await page.evaluate(`(() => { const g = window.__cq.game; Object.assign(g.state.player.pos, { x: -7.7, y: 0.05, z: 25.6 }); g.input.yaw = 0; g.input.pitch = -0.3; window.__cq.runFrames(10); return document.querySelector('#hud .prompt, .prompt').textContent; })()`);
  if (!/^\S+\s+(Box|Crate)$/.test(text.trim())) fail('hideprompt', `the gym's box isn't just named: "${text}"`);
  // Hold E on open floor until the rough-sleep menu opens, then a key repeat of E must not close it.
  await page.evaluate(`(() => { const g = window.__cq.game; Object.assign(g.state.player.pos, { x: 0, y: 0.05, z: 0 }); g.input.pitch = -1.2; window.__cq.runFrames(10); })()`);
  await page.keyboard.down('KeyZ');
  for (let i = 0; i < 12; i++) await page.evaluate('window.__cq.runFrames(10)');
  await page.evaluate(`dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', repeat: true }))`);
  const stillOpen = await page.evaluate(`getComputedStyle(document.getElementById('sleep')).display !== 'none'`);
  if (!stillOpen) fail('hideprompt', 'a held Z closed the sleep menu');
  await page.keyboard.up('KeyZ');
  await page.close();
}
