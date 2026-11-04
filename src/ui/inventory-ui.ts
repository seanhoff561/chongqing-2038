// The backpack (Tab) and an open container side by side. Drag to move (out of the grids drops it), R rotates while dragging,
// shift-click moves it straight across, 'take all' empties the container into the backpack, 1-5 over an item binds it to
// the hotbar. Moves go to the sim as commands.
import { binds } from '../input/input';
import { hideoutList } from '../sim/shelter';
import { foodCheck } from '../sim/food';
import type { Game } from '../game';
import type { Grid, Stack } from '../sim/inventory';
import { dims, weight } from '../sim/inventory';
import { item } from '../data/items';
import { MODS, TAG } from '../data/units';
import { icon } from './icons';

/** What he can eat, drink or use from the backpack. */
const USABLE = new Set(['food', 'drink', 'med']);

const CELL = 44;

export class InventoryUI {
  readonly el: HTMLDivElement;
  open = false;
  private sig = '';
  private drag: { uid: number; from: string; rot: boolean; ox: number; oy: number; ghost: HTMLDivElement } | null = null;
  private hover: { uid: number; from: string } | null = null;
  private tip: HTMLDivElement;

  constructor(private game: Game) {
    this.el = document.createElement('div');
    this.el.id = 'inv';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);
    this.tip = document.createElement('div');
    this.tip.className = 'inv-tip';
    document.body.appendChild(this.tip);
    addEventListener('mousemove', e => this.move(e));
    addEventListener('mouseup', e => this.drop(e));
    // Interact closes it too, as it opens a container's (U-067, U-104); before the game takes the press.
    addEventListener('keydown', e => { if (this.open && binds.interact.includes(e.code) && !e.repeat) { this.toggle(false); e.preventDefault(); e.stopImmediatePropagation(); } }, true);
    addEventListener('keydown', e => {
      if (!this.open) return;
      if (e.code === 'KeyR' && this.drag) { this.drag.rot = !this.drag.rot; this.styleGhost(); }
      const m = /^Digit([1-5])$/.exec(e.code);
      if (m && this.hover && this.hover.from === 'pack') game.input.cmds.push({ c: 'bind', slot: Number(m[1]) - 1, uid: this.hover.uid });
    });
  }

  toggle(on = !this.open) {
    this.open = on;
    this.el.style.display = on ? 'flex' : 'none';
    this.tip.style.display = 'none';
    this.game.input.uiOpen = on;
    if (on) document.exitPointerLock?.();
    this.sig = '';
    this.update();
  }

  update() {
    if (!this.open) return;
    const s = this.game.state;
    const cont = s.openContainer ? s.containers[s.openContainer] : null;
    const sig = JSON.stringify([s.inv.pack, s.inv.hotbar, s.openContainer, cont, s.shelters.length, Math.round(s.player.pos.x / 10), Math.round(s.player.pos.z / 10)]);
    if (sig === this.sig) return;
    this.sig = sig;
    this.el.innerHTML = '';
    this.el.appendChild(this.panel('背包 BACKPACK', 'pack', s.inv.pack, `${weight(s.inv.pack).toFixed(1)} kg`));
    if (cont && s.openContainer) this.el.appendChild(this.panel(this.game.containerName(s.openContainer), s.openContainer, cont, ''));
    // His hideouts (U-018), nearest first: until Anna's journal lists them (M5-02).
    const hs = hideoutList(s, this.game.world);
    if (hs.length) {
      const d = document.createElement('div');
      d.className = 'inv-hideouts';
      d.innerHTML = `<b>藏身处 Hideouts</b>` + hs.map(h => `<div>${h.place[0]} ${h.place[1]} · ${h.zh} ${h.en} · ${Math.round(h.dist)} m</div>`).join('');
      this.el.appendChild(d);
    }
  }

  private panel(title: string, ref: string, g: Grid, note: string): HTMLDivElement {
    const p = document.createElement('div');
    p.className = 'inv-panel';
    p.innerHTML = `<div class="inv-title">${title}<span>${note}</span></div>`;
    if (ref !== 'pack' && g.items.length) {
      const all = document.createElement('button');
      all.className = 'inv-takeall';
      all.textContent = '全拿 Take all';
      all.onclick = () => { this.game.input.cmds.push({ c: 'takeall' }); this.sig = ''; };
      p.querySelector('.inv-title span')!.appendChild(all);
    }
    // His jacket off and gone over by hand, for a tracker stuck on it (U-099).
    if (ref === 'pack') {
      const b = document.createElement('button');
      b.className = 'inv-takeall inv-search';
      b.textContent = '搜外套 Search jacket';
      b.title = `Take your jacket off and go over it for a tracking tag (${TAG.search} s, standing)`;
      b.onclick = () => { this.game.input.cmds.push({ c: 'act', name: 'search' }); this.toggle(false); };
      p.querySelector('.inv-title span')!.appendChild(b);
    }
    const area = document.createElement('div');
    area.className = 'inv-grid';
    area.dataset.ref = ref;
    area.style.width = `${g.w * CELL}px`;
    area.style.height = `${g.h * CELL}px`;
    area.style.backgroundSize = `${CELL}px ${CELL}px`;
    for (const st of g.items) {
      const [w, h] = dims(st);
      const d = item(st.id);
      const div = document.createElement('div');
      div.className = `inv-item cat-${d.cat}`;
      div.dataset.uid = String(st.uid);
      div.style.cssText = `left:${st.x * CELL + 1}px;top:${st.y * CELL + 1}px;width:${w * CELL - 3}px;height:${h * CELL - 3}px;background-image:url(${icon(st.id, st.rot)})`;
      const slot = this.game.state.inv.hotbar.indexOf(st.uid);
      // The picture, its name small in the corner (the English and the rest on hover).
      div.innerHTML = `<b>${d.zh}</b>${st.n > 1 ? `<u>${st.n}</u>` : ''}${slot >= 0 && ref === 'pack' ? `<s>${slot + 1}</s>` : ''}`;
      div.onmousedown = e => {
        e.preventDefault();
        // Shift-click: straight across to the other side (M4-71).
        if (e.shiftKey) { if (this.game.state.openContainer) { this.game.input.cmds.push({ c: 'quick', from: ref, uid: st.uid }); this.sig = ''; } return; }
        const r = div.getBoundingClientRect();
        const ghost = div.cloneNode(true) as HTMLDivElement;
        ghost.classList.add('ghost');
        document.body.appendChild(ghost);
        this.drag = { uid: st.uid, from: ref, rot: st.rot, ox: Math.floor((e.clientX - r.left) / CELL), oy: Math.floor((e.clientY - r.top) / CELL), ghost };
        div.style.opacity = '0.3';
        this.styleGhost();
        this.move(e);
      };
      // Right-click on the pistol takes its attachments off (U-058); on food, drink or medicine, or a double-click, he
      // eats, drinks or uses it there and then (U-067).
      const use = () => { if (ref === 'pack' && USABLE.has(item(st.id).cat)) { this.game.input.cmds.push({ c: 'use', uid: st.uid }); this.sig = ''; } };
      div.oncontextmenu = e => { e.preventDefault(); if (ref === 'pack' && st.mods?.length) { this.game.input.cmds.push({ c: 'strip', uid: st.uid }); this.sig = ''; } else use(); };
      div.ondblclick = use;
      div.onmouseenter = () => { this.hover = { uid: st.uid, from: ref }; this.showTip(st, div); };
      div.onmouseleave = () => { this.hover = null; this.tip.style.display = 'none'; };
      area.appendChild(div);
    }
    p.appendChild(area);
    if (ref === 'pack') {
      const hb = document.createElement('div');
      hb.className = 'inv-hotbar';
      hb.innerHTML = this.game.state.inv.hotbar.map((u, i) => {
        const st = this.game.state.inv.pack.items.find(x => x.uid === u);
        return `<span>${i + 1} ${st ? item(st.id).zh : '·'}</span>`;
      }).join('');
      p.appendChild(hb);
    }
    return p;
  }

  private showTip(st: Stack, anchor: HTMLElement) {
    const d = item(st.id), r = anchor.getBoundingClientRect();
    const mods = st.mods?.length ? `<br>${st.mods.map(m => item(m).en).join(', ')} fitted (right-click: take off)` : st.id === 'pistol' ? '<br>Drop an attachment on it to fit it' : '';
    // Its shelf life, once Anna's read the date (M5-05).
    const fc = foodCheck(this.game.state, st), food = fc ? `<br><i>安娜：${fc[0]} · ${fc[1]}</i>` : '';
    // A found document is read here (M10-37): its title, then all it says.
    const doc = d.cat === 'doc';
    this.tip.className = doc ? 'inv-tip inv-doc' : 'inv-tip';
    this.tip.innerHTML = doc ? `<b>${d.zh}</b> ${d.en}<div>${d.desc.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</div>`
      : `<b>${d.zh}</b> ${d.en}<br>${(d.kg * st.n).toFixed(2)} kg · ${d.desc}${mods}${food}`;
    this.tip.style.cssText = `display:block;left:${r.right + 6}px;top:${r.top}px`;
    // (Kept on the screen: a long one beside the item, not off its foot or its edge.)
    const t = this.tip.getBoundingClientRect();
    if (t.bottom > innerHeight - 4) this.tip.style.top = `${Math.max(4, innerHeight - 4 - t.height)}px`;
    if (t.right > innerWidth - 4) this.tip.style.left = `${Math.max(4, r.left - 6 - t.width)}px`;
  }

  private styleGhost() {
    if (!this.drag) return;
    const st = this.findStack(this.drag.uid);
    if (!st) return;
    const [w, h] = dims({ id: st.id, rot: this.drag.rot });
    this.drag.ghost.style.width = `${w * CELL - 3}px`;
    this.drag.ghost.style.height = `${h * CELL - 3}px`;
    this.drag.ghost.style.backgroundImage = `url(${icon(st.id, this.drag.rot)})`;
    if (this.drag.rot !== st.rot) { const t = this.drag.ox; this.drag.ox = this.drag.oy; this.drag.oy = t; }
  }

  private findStack(uid: number): Stack | undefined {
    const s = this.game.state;
    return s.inv.pack.items.find(x => x.uid === uid) ?? (s.openContainer ? s.containers[s.openContainer]?.items.find(x => x.uid === uid) : undefined);
  }

  private move(e: MouseEvent) {
    if (!this.drag) return;
    this.drag.ghost.style.left = `${e.clientX - this.drag.ox * CELL - CELL / 2}px`;
    this.drag.ghost.style.top = `${e.clientY - this.drag.oy * CELL - CELL / 2}px`;
  }

  private drop(e: MouseEvent) {
    if (!this.drag) return;
    const d = this.drag;
    this.drag = null;
    d.ghost.remove();
    const area = (document.elementsFromPoint(e.clientX, e.clientY).find(el => (el as HTMLElement).dataset?.ref) as HTMLElement | undefined);
    // Dropped onto the pistol, an attachment's fitted (U-058).
    const onto = document.elementsFromPoint(e.clientX, e.clientY).map(el => (el as HTMLElement).dataset?.uid).find(u => u && Number(u) !== d.uid);
    const gun = onto ? this.game.state.inv.pack.items.find(x => x.uid === Number(onto)) : undefined, dragged = this.findStack(d.uid);
    if (gun?.id === 'pistol' && dragged && MODS[dragged.id] && d.from === 'pack') { this.game.input.cmds.push({ c: 'fit', uid: d.uid, onto: gun.uid }); this.sig = ''; return; }
    if (area) {
      const r = area.getBoundingClientRect();
      const x = Math.floor((e.clientX - r.left) / CELL) - d.ox, y = Math.floor((e.clientY - r.top) / CELL) - d.oy;
      this.game.input.cmds.push({ c: 'move', from: d.from, to: area.dataset.ref!, uid: d.uid, x, y, rot: d.rot });
    } else if (d.from === 'pack') {
      // Let go outside the grids: dropped at his feet (M3-72).
      this.game.input.cmds.push({ c: 'drop', uid: d.uid });
    }
    this.sig = '';
  }
}
