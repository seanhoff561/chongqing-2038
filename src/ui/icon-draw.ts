// Drawing tools for the item pictures (M4-70): shapes in cell units, shaded for volume (lit from the top left, or
// across a cylinder's axis), with a thin dark edge.
export type C = CanvasRenderingContext2D;
/** 'd' lit top left, 'x' a cylinder upright (lit across), 'y' one lying (lit from above), 'f' flat. */
type Light = 'd' | 'x' | 'y' | 'f';
const EDGE = 'rgba(0,0,0,0.6)';

/** A colour lightened (k > 0) or darkened (k < 0). */
export function tone(col: string, k: number): string {
  if (col[0] !== '#') return col;
  const n = parseInt(col.slice(1), 16), t = k > 0 ? 255 : 0, a = Math.abs(k);
  const ch = (v: number) => Math.round(v + (t - v) * a);
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

function paint(c: C, x: number, y: number, w: number, h: number, col: string, light: Light): string | CanvasGradient {
  if (light === 'f' || col[0] !== '#') return col;
  const g = light === 'x' ? c.createLinearGradient(x, 0, x + w, 0) : light === 'y' ? c.createLinearGradient(0, y, 0, y + h) : c.createLinearGradient(x, y, x + w, y + h);
  if (light === 'd') { g.addColorStop(0, tone(col, 0.22)); g.addColorStop(1, tone(col, -0.3)); }
  else { g.addColorStop(0, tone(col, -0.35)); g.addColorStop(0.32, tone(col, 0.3)); g.addColorStop(1, tone(col, -0.5)); }
  return g;
}

function edge(c: C, w = 0.025) { c.strokeStyle = EDGE; c.lineWidth = w; c.stroke(); }

export function box(c: C, x: number, y: number, w: number, h: number, col: string, r = 0.04, light: Light = 'd') {
  c.beginPath(); c.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
  c.fillStyle = paint(c, x, y, w, h, col, light); c.fill(); edge(c);
}

export function disc(c: C, x: number, y: number, r: number, col: string, flat = false) {
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
  if (flat || col[0] !== '#') c.fillStyle = col;
  else { const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r); g.addColorStop(0, tone(col, 0.35)); g.addColorStop(1, tone(col, -0.35)); c.fillStyle = g; }
  c.fill(); edge(c);
}

export function ell(c: C, x: number, y: number, rx: number, ry: number, col: string, rot = 0) {
  c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  c.fillStyle = paint(c, x - rx, y - ry, rx * 2, ry * 2, col, 'd'); c.fill(); edge(c);
}

export function poly(c: C, pts: number[], col: string, light: Light = 'd') {
  c.beginPath(); c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < pts.length; i += 2) { x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]); y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]); }
  c.fillStyle = paint(c, x0, y0, x1 - x0, y1 - y0, col, light); c.fill(); edge(c);
}

/** A polyline (a curve through quadratic midpoints if `smooth`), outlined dark if `outline`. */
export function line(c: C, pts: number[], col: string, w = 0.06, outline = true, smooth = false) {
  const path = () => {
    c.beginPath(); c.moveTo(pts[0], pts[1]);
    if (!smooth || pts.length < 6) { for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); return; }
    for (let i = 2; i < pts.length - 2; i += 2) c.quadraticCurveTo(pts[i], pts[i + 1], (pts[i] + pts[i + 2]) / 2, (pts[i + 1] + pts[i + 3]) / 2);
    c.lineTo(pts[pts.length - 2], pts[pts.length - 1]);
  };
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (outline) { path(); c.strokeStyle = EDGE; c.lineWidth = w + 0.04; c.stroke(); }
  path(); c.strokeStyle = col; c.lineWidth = w; c.stroke();
  if (outline && w >= 0.06 && col[0] === '#') { c.save(); c.translate(-w * 0.18, -w * 0.18); path(); c.strokeStyle = tone(col, 0.3); c.lineWidth = w * 0.3; c.stroke(); c.restore(); }
}

export function ring(c: C, x: number, y: number, r: number, col: string, w = 0.06, a0 = 0, a1 = Math.PI * 2) {
  c.lineCap = 'round';
  c.beginPath(); c.arc(x, y, r, a0, a1); c.strokeStyle = EDGE; c.lineWidth = w + 0.04; c.stroke();
  c.beginPath(); c.arc(x, y, r, a0, a1); c.strokeStyle = col; c.lineWidth = w; c.stroke();
}

/** Fine marks (seams, cell grids, creases): thin lines, no outline. */
export function marks(c: C, segs: number[], col = 'rgba(0,0,0,0.45)', w = 0.02) {
  c.beginPath();
  for (let i = 0; i < segs.length; i += 4) { c.moveTo(segs[i], segs[i + 1]); c.lineTo(segs[i + 2], segs[i + 3]); }
  c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.stroke();
}

/** A shine streak down a shape, for glass, plastic and polished metal. */
export function shine(c: C, x: number, y: number, w: number, h: number) {
  c.fillStyle = 'rgba(255,255,255,0.28)'; c.beginPath(); c.roundRect(x, y, w, h, w / 2); c.fill();
}
