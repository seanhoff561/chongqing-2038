// The maps (M10-32, M10-33): kept in the desktop game's maps folder (Documents/Chongqing 2038/maps, a .json file each,
// named after the map) or, in the browser, by name in localStorage; exported as a .json file to download and imported
// from one, checked piece by piece as it's read. The tutorial is built in (src/data/tutorial.json): listed first,
// played and copied, never deleted or overwritten.
import type { MapDoc, Piece } from '../world/sets/usermap';
import { PIECES } from '../world/sets/pieces';
import tutorial from '../data/tutorial.json';

/** The built-in tutorial (a copy each time: the editor changes what it's given). */
export const TUTORIAL = tutorial.name;
export const tutorialMap = (): MapDoc => parseMap(JSON.stringify(tutorial))!;

const KEY = 'cq2038.maps';
const folder = () => window.desktop?.maps;
/** A map's file in the folder: its name, with only letters, digits, spaces, dots, dashes and underscores. */
const file = (name: string) => `${name.replace(/[^\p{L}\p{N}_ .-]+/gu, '_').trim() || 'map'}.json`;
function all(): Record<string, MapDoc> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; }
}

/** The saved maps' names, sorted (in the folder, its files' names). */
export async function listMaps(): Promise<string[]> {
  const f = folder();
  return (f ? (await f.list()).map(n => n.slice(0, -5)) : Object.keys(all())).sort((a, b) => a.localeCompare(b));
}
export async function readMap(name: string): Promise<MapDoc | null> {
  const f = folder();
  if (!f) return all()[name] ?? null;
  const t = await f.read(file(name)), m = t ? parseMap(t) : null;
  return m && { ...m, name };
}
export async function writeMap(doc: MapDoc) {
  const f = folder();
  if (f) return f.write(file(doc.name), JSON.stringify(doc, null, 1));
  const maps = all();
  maps[doc.name] = doc;
  localStorage.setItem(KEY, JSON.stringify(maps));
}
export async function removeMap(name: string) {
  const f = folder();
  if (f) return f.remove(file(name));
  const maps = all();
  delete maps[name];
  localStorage.setItem(KEY, JSON.stringify(maps));
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
