// M4-70: every item in the backpack shows its picture, drawn to its footprint and turned with it.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=hideout&seed=1', 'pictures');
  // (The run's start fills his pack: emptied first, so there's room for them all and for the crowbar turned.)
  await page.evaluate(`(() => { const inv = window.__cq.game.state.inv; inv.pack.items.length = 0; inv.hotbar.fill(null); inv.held = 0; })()`);
  await page.evaluate(`for (const id of ['crowbar','firstaid','pistol','water','bread','noodles','luncheon','bandage','mag9','knife','binoculars','tape','lockpick','energy','badge','sausage','grenade','board','painkillers','headlamp','tourniquet','chocolate','zongzi','cammod']) window.__cq.give(id)`);
  await page.keyboard.press('AltLeft');
  await page.evaluate('window.__cq.runFrames(2)');
  const all = await page.evaluate(`[...document.querySelectorAll('#inv .inv-item')].map(e => e.style.backgroundImage.startsWith('url("data:image/png'))`);
  if (all.length < 15) fail('pictures', `only ${all.length} items in the pack`);
  if (all.some(x => !x)) fail('pictures', `${all.filter(x => !x).length} items without a picture`);
  // The crowbar turned: its picture turns with it (wider than high), and the picture isn't blank.
  const turned = await page.evaluate(`(async () => {
    const s = window.__cq.game.state, st = s.inv.pack.items.find(i => i.id === 'crowbar');
    window.__cq.game.input.cmds.push({ c: 'move', from: 'pack', to: 'pack', uid: st.uid, x: 0, y: s.inv.pack.h - 1, rot: !st.rot });
    window.__cq.runFrames(2);
    window.__cq.game.inv.update();
    const now = s.inv.pack.items.find(i => i.id === 'crowbar');
    const el = [...document.querySelectorAll('#inv .inv-item')].find(e => e.textContent.startsWith('撬棍'));
    const img = new Image(); img.src = el.style.backgroundImage.slice(5, -2); await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const px = g.getImageData(0, 0, img.width, img.height).data; let ink = 0;
    for (let i = 3; i < px.length; i += 4) if (px[i] > 128) ink++;
    return { rot: now.rot, w: img.width, h: img.height, ink: ink / (img.width * img.height) };
  })()`);
  if (!turned.rot || !(turned.w > turned.h * 2)) fail('pictures', `turned crowbar picture ${JSON.stringify(turned)}`);
  if (!(turned.ink > 0.05)) fail('pictures', `crowbar picture nearly blank: ${turned.ink}`);
  await screenshot(page, 'pictures');
  await page.close();
}
