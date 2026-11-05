// Maps kept in the browser (M10-32): saved by name in localStorage, the last one edited remembered; exported as a
// .json file to download and imported from one, checked piece by piece as it's read.
import type { MapDoc, Piece } from '../world/sets/usermap';
import { PIECES } from '../world/sets/pieces';

const KEY = 'cq2038.maps', LAST = 'cq2038.maps.last';

function all(): Record<string, MapDoc> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; }
}
export const savedMaps = () => Object.keys(all()).sort();
export const loadMap = (name: string): MapDoc | null => all()[name] ?? null;
export const lastMap = (): MapDoc | null => loadMap(localStorage.getItem(LAST) ?? '');
export function saveMap(doc: MapDoc) {
  const maps = all();
  maps[doc.name] = doc;
  localStorage.setItem(KEY, JSON.stringify(maps));
  localStorage.setItem(LAST, doc.name);
}

/** The map as a file to download, named after it. */
export function exportMap(doc: MapDoc) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 1)], { type: 'application/json' }));
  a.download = `${doc.name.replace(/[^\w一-鿿 -]+/g, '_') || 'map'}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

/** A map read from a file's text: only pieces the editor knows, with numbers where numbers go; null if it isn't one. */
export function parseMap(text: string): MapDoc | null {
  let o: { name?: unknown; pieces?: unknown };
  try { o = JSON.parse(text); } catch { return null; }
  if (!o || !Array.isArray(o.pieces)) return null;
  const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : null);
  const pieces: Piece[] = [];
  for (const p of o.pieces as Record<string, unknown>[]) {
    const k = String(p?.kind), xs = ['x', 'y', 'z', 'yaw', 'w', 'h', 'd'].map(f => num(p[f]));
    if (!PIECES[k] || xs.some(v => v === null)) continue;
    const [x, y, z, yaw, w, h, d] = xs as number[];
    const q: Piece = { kind: k, x, y, z, yaw, w, h, d };
    if (typeof p.mat === 'string') q.mat = p.mat;
    if (typeof p.text === 'string') q.text = p.text;
    if (typeof p.loot === 'string') q.loot = p.loot;
    if (Array.isArray(p.items)) q.items = (p.items as unknown[]).filter((it): it is [string, number] => Array.isArray(it) && typeof it[0] === 'string' && typeof it[1] === 'number');
    pieces.push(q);
  }
  if (!pieces.some(p => p.kind === 'spawn')) pieces.unshift({ kind: 'spawn', x: 0, y: 0, z: 0, yaw: 0, w: 0.6, h: 1.8, d: 0.6 });
  return { v: 1, name: typeof o.name === 'string' && o.name ? o.name : 'imported map', pieces };
}
