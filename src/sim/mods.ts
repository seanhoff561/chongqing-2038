// The pistol's attachments (U-058): an attachment dropped onto the pistol in the backpack is fitted (one to a place,
// the one there before coming off into the pack); right-click on the pistol takes them all off, where they fit.
import { onCmd } from './commands';
import { addItem, takeStack } from './inventory';
import { MODS } from '../data/units';
import { item } from '../data/items';

onCmd((s, c) => {
  const pack = s.inv.pack;
  if (c.c === 'fit') {
    const a = pack.items.find(x => x.uid === c.uid), gun = pack.items.find(x => x.uid === c.onto);
    if (!a || !gun || gun.id !== 'pistol' || !MODS[a.id]) return;
    const old = (gun.mods ?? []).find(m => MODS[m].slot === MODS[a.id].slot);
    if (old && addItem(s, pack, old) > 0) { s.events.push({ t: 'msg', text: 'no room' }); return; }
    gun.mods = [...(gun.mods ?? []).filter(m => m !== old), a.id];
    if (--a.n <= 0) takeStack(pack, a.uid);
    s.events.push({ t: 'msg', text: `${item(a.id).en.toLowerCase()} fitted` }, { t: 'sfx', id: 'click' });
  } else if (c.c === 'strip') {
    const gun = pack.items.find(x => x.uid === c.uid);
    if (!gun?.mods?.length) return;
    gun.mods = gun.mods.filter(m => addItem(s, pack, m) > 0);
    s.events.push({ t: 'msg', text: gun.mods.length ? 'no room' : 'attachments off' }, { t: 'sfx', id: 'click' });
  }
});
