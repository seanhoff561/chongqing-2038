// Item pictures for the backpack grid (M4-70): drawn once per item and turn, at twice the cell size, and kept.
import { item } from '../data/items';
import { ART } from './icon-art';

const PX = 88;
const cache = new Map<string, string>();

/** A data URL of the item's picture, its footprint's shape (turned a quarter if `rot`). */
export function icon(id: string, rot: boolean): string {
  const k = rot ? `${id}/r` : id;
  let url = cache.get(k);
  if (url) return url;
  const d = item(id), cv = document.createElement('canvas');
  cv.width = (rot ? d.h : d.w) * PX;
  cv.height = (rot ? d.w : d.h) * PX;
  const c = cv.getContext('2d')!;
  if (rot) { c.translate(cv.width, 0); c.rotate(Math.PI / 2); }
  c.scale(PX, PX);
  ART[id](c);
  url = cv.toDataURL();
  cache.set(k, url);
  return url;
}
