// M4-27: the world shows the alert, no HUD. On the lineup at night: everyone unaware, then the district Engaged and the
// machines on him: their lights from white to red, the edict board's glyphs red, the shop's LED ticker running the
// alert in red. Red pixels counted in each.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=units&seed=1', 'alert');
  const set = (engaged, at = '{ x: 1, y: 0, z: 15.5 }', pitch = 0.06) => page.evaluate(`(() => {
    const g = window.__cq.game, s = g.state;
    s.time = Math.floor(s.time / 86400) * 86400 + 22 * 3600;
    Object.assign(s.player.pos, ${at}); g.input.yaw = 0; g.input.pitch = ${pitch};
    for (const u of s.units) Object.assign(u, { state: ${engaged} ? 'engaged' : 'unaware', aware: ${engaged} ? 1.5 : 0 });
    s.hive.districts = ${engaged} ? { yuzhong: { state: 'engaged', since: s.time, contact: s.time, until: 0 } } : {};
    g.runFrames(1);
    for (const u of s.units) Object.assign(u, { state: ${engaged} ? 'engaged' : 'unaware' });
    g.runFrames(0);
    const gl = g.view.renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, d = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, d);
    let red = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 120 && d[i] > 1.6 * d[i + 1] && d[i] > 1.6 * d[i + 2]) red++;
    return { red, hud: !!document.querySelector('#alert, .alert-hud') };
  })()`);
  const calm = await set(false);
  await screenshot(page, 'alert-unaware');
  const hot = await set(true);
  await screenshot(page, 'alert-engaged');
  if (hot.hud || calm.hud) fail('alert', 'an alert on the HUD');
  if (!(hot.red > calm.red * 2 + 200)) fail('alert', `red pixels ${calm.red} unaware, ${hot.red} engaged`);
  // Up close to the shop's LED ticker: amber, then the alert in red.
  const near = '{ x: 12.5, y: 0, z: -3.2 }', a = await set(false, near, 0.32);
  await screenshot(page, 'alert-ticker-calm');
  const b = await set(true, near, 0.32);
  await screenshot(page, 'alert-ticker');
  if (!(b.red > a.red + 300)) fail('alert', `the ticker: red pixels ${a.red} calm, ${b.red} on alert`);
  console.log(`alert: red pixels ${calm.red} -> ${hot.red}; ticker ${a.red} -> ${b.red}`);
  await page.close();
}
