// Surface textures for the things seen close (M4-99, U-073), drawn once at load on small canvases (nothing to
// download): his sleeve's cloth, worn gunmetal, a grip's stippling, wood grain, scuffed plastic, a box's cardboard, a
// tin's printed label, and the machines'
// painted plates (seams, rivets, scuffs, grime low down). Each is mostly mid-light so it shades a material's own
// colour rather than replacing it.
import * as THREE from 'three';

type Kind = 'fabric' | 'metal' | 'stipple' | 'wood' | 'plastic' | 'panel' | 'cardboard' | 'label';
const cache = new Map<Kind, THREE.CanvasTexture>();

/** A seeded random 0 to 1. */
function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; }; }

export function surface(kind: Kind): THREE.CanvasTexture {
  const hit = cache.get(kind);
  if (hit) return hit;
  const N = kind === 'panel' ? 256 : 128, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d')!, r = rng(kind.length * 977 + N);
  const fill = (v: number) => { g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, 0, N, N); };
  const speck = (n: number, lo: number, hi: number, size = 1) => { for (let i = 0; i < n; i++) { const v = lo + r() * (hi - lo); g.fillStyle = `rgba(${v},${v},${v},${0.25 + r() * 0.35})`; g.fillRect(r() * N, r() * N, size, size); } };
  /** Rows of made-up printed characters (from x, y, a row wide, so many rows). */
  const text = (x: number, y: number, w: number, rows: number, ink: string) => {
    g.fillStyle = ink;
    for (let j = 0; j < rows; j++) for (let u = 0; u < w * (j ? 0.6 + r() * 0.4 : 1); u += 6 + (j ? 0 : 3)) g.fillRect(x + u, y + j * 9, j ? 4 : 7, j ? 4 : 6);
  };
  if (kind === 'fabric') {
    // A twill weave: fine diagonal threads, a little fuzz, worn paler in patches.
    fill(205);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x += 2) { const v = (x + y) % 4 < 2 ? 185 : 225; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 2, 1); }
    speck(900, 150, 255);
    for (let i = 0; i < 5; i++) { const gr = g.createRadialGradient(r() * N, r() * N, 2, r() * N, r() * N, 20 + r() * 25); gr.addColorStop(0, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, N, N); }
    g.fillStyle = 'rgba(80,80,80,0.5)'; g.fillRect(0, N * 0.48, N, 1.5);
  } else if (kind === 'metal') {
    // Brushed steel along one way, scratched across, darker in from the edges (handled grime).
    fill(200);
    for (let y = 0; y < N; y++) { const v = 185 + r() * 35; g.fillStyle = `rgba(${v},${v},${v},0.6)`; g.fillRect(0, y, N, 1); }
    g.strokeStyle = 'rgba(245,245,245,0.5)'; g.lineWidth = 0.6;
    for (let i = 0; i < 26; i++) { const x = r() * N, y = r() * N, a = r() * Math.PI, l = 6 + r() * 26; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    const e = g.createRadialGradient(N / 2, N / 2, N * 0.3, N / 2, N / 2, N * 0.72); e.addColorStop(0, 'rgba(0,0,0,0)'); e.addColorStop(1, 'rgba(40,36,30,0.35)'); g.fillStyle = e; g.fillRect(0, 0, N, N);
  } else if (kind === 'stipple') {
    // A polymer grip's stippling: tight raised dots.
    fill(170);
    for (let y = 2; y < N; y += 4) for (let x = (y % 8 ? 0 : 2); x < N; x += 4) { g.fillStyle = 'rgba(235,235,235,0.7)'; g.fillRect(x, y, 2, 2); g.fillStyle = 'rgba(60,60,60,0.5)'; g.fillRect(x + 1, y + 2, 2, 1); }
  } else if (kind === 'wood') {
    // Grain: long wavering lines, a knot now and then.
    fill(200);
    for (let i = 0; i < 40; i++) { const y0 = r() * N, v = 140 + r() * 60; g.strokeStyle = `rgba(${v},${v * 0.92},${v * 0.8},0.6)`; g.lineWidth = 0.6 + r() * 1.6; g.beginPath(); for (let x = 0; x <= N; x += 8) g.lineTo(x, y0 + Math.sin(x * 0.05 + i) * 3); g.stroke(); }
    const kx = r() * N, ky = r() * N; for (let k = 6; k > 0; k--) { g.strokeStyle = 'rgba(110,90,70,0.5)'; g.beginPath(); g.ellipse(kx, ky, k * 2.5, k, 0, 0, Math.PI * 2); g.stroke(); }
  } else if (kind === 'cardboard') {
    // Corrugated board: its flutes showing faintly, a strip of tape across, a printed block of text and a stamp.
    fill(212);
    for (let x = 0; x < N; x += 3) { g.fillStyle = 'rgba(170,160,140,0.25)'; g.fillRect(x, 0, 1, N); }
    speck(400, 150, 240);
    g.fillStyle = 'rgba(240,236,225,0.45)'; g.fillRect(0, N * 0.45, N, N * 0.1);
    text(N * 0.12, N * 0.62, N * 0.5, 4, 'rgba(50,45,40,0.6)');
    g.strokeStyle = 'rgba(140,40,30,0.5)'; g.lineWidth = 2; g.strokeRect(N * 0.68, N * 0.12, N * 0.2, N * 0.14);
  } else if (kind === 'label') {
    // A tin's or a pot's printed label: bands at its ends, an emblem and rows of characters round it.
    fill(238);
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, 0, N, N * 0.12); g.fillRect(0, N * 0.88, N, N * 0.12);
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(N * 0.25, N * 0.5, N * 0.14, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 2; g.stroke();
    text(N * 0.48, N * 0.3, N * 0.45, 5, 'rgba(20,20,20,0.7)');
    speck(150, 190, 255);
  } else if (kind === 'plastic') {
    fill(215); speck(500, 170, 255); speck(40, 120, 160, 2);
    g.strokeStyle = 'rgba(150,150,150,0.4)'; for (let i = 0; i < 10; i++) { const x = r() * N, y = r() * N; g.beginPath(); g.moveTo(x, y); g.lineTo(x + r() * 20 - 10, y + r() * 20 - 10); g.stroke(); }
  } else {
    // The machines' plates: a seam across a face, rivets along it, scuffs, grime gathered low down.
    fill(252);
    speck(1400, 228, 255);
    g.fillStyle = 'rgba(140,140,145,0.55)'; g.fillRect(0, N * 0.34, N, 2); g.fillRect(N * 0.62, 0, 2, N * 0.34);
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(0, N * 0.34 + 2, N, 1);
    for (let x = 8; x < N; x += 22) { g.fillStyle = 'rgba(110,110,115,0.8)'; g.beginPath(); g.arc(x, N * 0.34 + 7, 1.6, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = 'rgba(90,85,80,0.35)'; g.lineWidth = 1;
    for (let i = 0; i < 18; i++) { const x = r() * N, y = r() * N, l = 4 + r() * 18; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (r() - 0.5) * 4); g.stroke(); }
    const d = g.createLinearGradient(0, N * 0.6, 0, N); d.addColorStop(0, 'rgba(70,62,52,0)'); d.addColorStop(1, 'rgba(70,62,52,0.18)'); g.fillStyle = d; g.fillRect(0, 0, N, N);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  cache.set(kind, t);
  return t;
}
