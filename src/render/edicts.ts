// The LED screens' edicts (M6-02, U-053): between the city's last campaigns, the machine's announcement of the moment
// on every big screen, the same words the street speakers say (data/announce.ts, by his district's alert and the
// hour): its ring mark, the line in big characters, the English under it. Redrawn only when what it shows changes.
import * as THREE from 'three';
import type { SimState } from '../sim/types';
import { ANNOUNCE, paKind } from '../data/announce';
import { districtOf } from '../sim/district';
import { hourOf } from '../sim/clock';
import { screenDraw } from './materials';

/** Seconds a campaign shows, then an edict. */
export const EDICT = { ads: 6, line: 10 };

/** The line the screens show at real time t (seconds), or null while the campaigns run. */
export function edictAt(s: SimState, t: number) {
  const C = EDICT.ads + EDICT.line, k = Math.floor(t / C);
  if (t - k * C < EDICT.ads) return null;
  const p = s.player.pos, lines = ANNOUNCE[paKind(s.hive.districts[districtOf(p.x, p.z)]?.state ?? 'unaware', hourOf(s.time))];
  return lines[k % lines.length];
}

/** An edict on a screen's canvas. */
export function drawEdict(g: CanvasRenderingContext2D, w: number, h: number, line: { zh: string; en: string }) {
  g.fillStyle = '#02060a'; g.fillRect(0, 0, w, h);
  // The ring cut by a line, its mark.
  g.strokeStyle = '#9fe8ff'; g.lineWidth = 6; g.beginPath(); g.arc(w * 0.12, h * 0.14, h * 0.07, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(w * 0.12 - h * 0.1, h * 0.14); g.lineTo(w * 0.12 + h * 0.1, h * 0.14); g.stroke();
  g.fillStyle = '#9fe8ff'; g.font = `bold ${Math.floor(h * 0.06)}px sans-serif`; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText('司命 · 公告', w * 0.24, h * 0.14);
  // The line, wrapped a few characters a row.
  const chars = [...line.zh], per = Math.max(6, Math.ceil(chars.length / 4)), rows: string[] = [];
  for (let i = 0; i < chars.length; i += per) rows.push(chars.slice(i, i + per).join(''));
  const size = Math.min(Math.floor((w * 0.9) / per), Math.floor((h * 0.52) / rows.length));
  g.fillStyle = '#e8fbff'; g.font = `bold ${size}px sans-serif`; g.textAlign = 'center';
  rows.forEach((r, i) => g.fillText(r, w / 2, h * 0.3 + size * (i + 0.5)));
  g.fillStyle = '#7fa8b8'; g.font = `${Math.floor(h * 0.035)}px sans-serif`;
  g.fillText(line.en.length > 70 ? line.en.slice(0, 67) + '...' : line.en, w / 2, h * 0.9);
  g.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
}

/** The edict panel laid over every building's LED screen (render/props-lib.ts), drawn only while an edict shows. */
export const SCREEN_EDICT = new THREE.MeshBasicMaterial({ toneMapped: false, fog: true });
SCREEN_EDICT.visible = false;
/** Its canvas, made when it's first drawn. */
let panel: HTMLCanvasElement | null = null;

let shown: string | null = '';
/** Every frame: the screens on what they should show now. */
export function updateScreens(s: SimState, t: number) {
  const line = edictAt(s, t), key = line ? line.zh : null;
  if (key === shown) return;
  shown = key;
  screenDraw(line ? (g, w, h) => drawEdict(g, w, h, line) : null);
  SCREEN_EDICT.visible = !!line;
  if (!line) return;
  if (!panel) {
    panel = document.createElement('canvas'); panel.width = 1024; panel.height = 576;
    SCREEN_EDICT.map = new THREE.CanvasTexture(panel); SCREEN_EDICT.map.colorSpace = THREE.SRGBColorSpace; SCREEN_EDICT.needsUpdate = true;
  }
  drawEdict(panel.getContext('2d')!, panel.width, panel.height, line); SCREEN_EDICT.map!.needsUpdate = true;
}
