// The Map page's tools, sitting at the laptop (M10-14, U-104): a marker, a straight line (pressed and dragged), words
// (typed where he clicks, Enter to keep) and a rubber (the mark nearest the click); the wheel zooms round the cursor
// and the right button drags the map. Standing, the map looks at him at its usual scale. The marks are the run's
// (sim: the 'mark' command), so they're saved with it.
import type { Game } from '../game';
import { drawMap, MAPV, type MapView } from './lapmap';

const TOOLS: [string, string, string][] = [['pin', '标记', 'Marker'], ['line', '直线', 'Line'], ['text', '文字', 'Text'], ['erase', '擦除', 'Erase']];

export class MapTools {
  readonly canvas = document.createElement('canvas');
  /** where he's typing words, over the map */
  private input = document.createElement('input');
  tool = 'pin';
  /** sitting, where it's looking; null standing (on him) */
  view: MapView | null = null;
  private drag: { b: number; x: number; z: number; px: number; py: number } | null = null;
  private typing: { x: number; z: number } | null = null;

  constructor(private game: Game) {
    this.canvas.width = MAPV.w; this.canvas.height = MAPV.h;
    this.input.className = 'lt-type'; this.input.maxLength = 80; this.input.style.display = 'none';
    const c = this.canvas;
    c.addEventListener('mousedown', e => {
      if (!this.view) return;
      e.preventDefault();
      const q = this.at(e);
      this.drag = { b: e.button, ...q, px: e.clientX, py: e.clientY };
      if (e.button === 0 && this.tool === 'text') this.type(q);
    });
    addEventListener('mousemove', e => {
      const d = this.drag, v = this.view;
      if (!d || !v || d.b !== 2) return;
      // (Right button: the map dragged under the cursor.)
      const r = c.getBoundingClientRect(), k = MAPV.w / r.width;
      v.cx -= (e.clientX - d.px) * k * v.m; v.cz -= (e.clientY - d.py) * k * v.m;
      d.px = e.clientX; d.py = e.clientY;
      this.draw();
    });
    addEventListener('mouseup', e => {
      const d = this.drag;
      this.drag = null;
      if (!d || !this.view || d.b !== 0 || e.button !== 0) return;
      const q = this.at(e);
      if (this.tool === 'pin') this.mark({ x: d.x, z: d.z });
      else if (this.tool === 'line' && Math.hypot(q.x - d.x, q.z - d.z) > 3 * this.view.m) this.mark({ x: d.x, z: d.z, x2: q.x, z2: q.z });
      else if (this.tool === 'erase') this.erase(d);
    });
    c.addEventListener('wheel', e => {
      const v = this.view;
      if (!v) return;
      e.preventDefault();
      // (Zoomed round the point under the cursor.)
      const q = this.at(e), m = Math.min(MAPV.far, Math.max(MAPV.near, v.m * (e.deltaY > 0 ? 1.25 : 0.8)));
      v.cx = q.x - (q.x - v.cx) * (m / v.m); v.cz = q.z - (q.z - v.cz) * (m / v.m); v.m = m;
      this.draw();
    }, { passive: false });
    this.input.addEventListener('keydown', e => {
      if (e.code === 'Enter') { const t = this.input.value.trim(); if (t && this.typing) this.mark({ ...this.typing, text: t }); this.untype(); }
      else if (e.code === 'Escape') { this.untype(); e.stopImmediatePropagation(); }
    });
  }

  /** The world point under the mouse. */
  private at(e: MouseEvent) {
    const r = this.canvas.getBoundingClientRect(), v = this.view ?? this.here();
    return { x: v.cx + ((e.clientX - r.left) / r.width * MAPV.w - MAPV.w / 2) * v.m, z: v.cz + ((e.clientY - r.top) / r.height * MAPV.h - MAPV.h / 2) * v.m };
  }
  private here(): MapView { const p = this.game.state.player.pos; return { cx: p.x, cz: p.z, m: MAPV.m }; }

  private mark(add: { x: number; z: number; x2?: number; z2?: number; text?: string }) {
    this.game.input.cmds.push({ c: 'mark', add });
  }

  /** The mark nearest the point, within a few pixels, rubbed out. */
  private erase(q: { x: number; z: number }) {
    const v = this.view!, ms = this.game.state.marks ?? [];
    const dist = (k: (typeof ms)[number]) => {
      if (k.x2 === undefined || k.z2 === undefined) return Math.hypot(k.x - q.x, k.z - q.z);
      const dx = k.x2 - k.x, dz = k.z2 - k.z, t = Math.max(0, Math.min(1, ((q.x - k.x) * dx + (q.z - k.z) * dz) / (dx * dx + dz * dz || 1)));
      return Math.hypot(k.x + dx * t - q.x, k.z + dz * t - q.z);
    };
    let best = -1, bd = 10 * v.m;
    ms.forEach((k, i) => { const d = dist(k); if (d < bd) { bd = d; best = i; } });
    if (best >= 0) this.game.input.cmds.push({ c: 'mark', del: best });
  }

  /** Words to type where he clicked. */
  private type(q: { x: number; z: number }) {
    const v = this.view!;
    this.typing = q;
    const s = this.input.style;
    s.display = 'block'; s.left = `${(q.x - v.cx) / v.m + MAPV.w / 2}px`; s.top = `${(q.z - v.cz) / v.m + MAPV.h / 2 - 8}px`;
    this.input.value = '';
    setTimeout(() => this.input.focus());
  }
  private untype() { this.typing = null; this.input.style.display = 'none'; this.input.blur(); }

  /** The tools' row, sitting. */
  tools() {
    return `<div class="lt-tools">${TOOLS.map(([id, zh, en]) => `<button data-tool="${id}"${id === this.tool ? ' class="on"' : ''}>${zh} <span>${en}</span></button>`).join('')}</div>`;
  }

  /** Into the page's map slot (again, after the page is rebuilt). */
  place(slot: Element) {
    if (this.canvas.parentElement !== slot) { slot.appendChild(this.canvas); slot.appendChild(this.input); if (this.typing) this.input.focus(); }
  }

  /** Sat down (looking where it looked standing) or up (on him again, words dropped). */
  seat(sit: boolean) { this.view = sit ? this.here() : null; this.drag = null; this.untype(); }

  draw() { drawMap(this.canvas, this.game, this.view ?? this.here()); }
}
