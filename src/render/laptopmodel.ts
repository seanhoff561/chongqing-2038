// Anna's laptop as a thing (M10-57, U-105): a worn space-grey aluminium machine. The lid: a rounded shell, a black
// glass bezel with a webcam and its light, a thicker chin, the hinge barrel. The deck: a rounded slab, a recessed well of
// separate keys (a full row of function keys, a wide space bar, arrows), a glass trackpad, scuffed and scratched.
// The screen is a plane the size of the page (ui/laptop.ts lays the page over it).
import * as THREE from 'three';

/** The bezel round the screen (m): its sides, top and chin; the lid's corner radius and thickness; the deck's depth
 *  and thickness. */
export const B = { side: 0.009, top: 0.013, chin: 0.02, r: 0.01, lid: 0.0055, deck: 0.235, slab: 0.011 };

/** A rounded rectangle centred on (x, y). */
function rounded(w: number, h: number, r: number, x = 0, y = 0) {
  const s = new THREE.Shape(), x0 = x - w / 2, y0 = y - h / 2;
  s.moveTo(x0 + r, y0); s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  s.lineTo(x0 + w, y0 + h - r); s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
  s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  return s;
}

/** Brushed, scuffed aluminium: fine streaks, rubbed patches, a few scratches (a colour and roughness map). */
function scuffs() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = '#9da3a8'; x.fillRect(0, 0, 256, 256);
  let seed = 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '40,44,48'},${0.04 + r() * 0.05})`; x.fillRect(r() * 256, r() * 256, 10 + r() * 60, 1); }
  for (let i = 0; i < 14; i++) { const g = x.createRadialGradient(0, 0, 0, 0, 0, 20 + r() * 30); g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.save(); x.translate(r() * 256, r() * 256); x.fillStyle = g; x.fillRect(-50, -50, 100, 100); x.restore(); }
  x.lineWidth = 0.7;
  for (let i = 0; i < 26; i++) { x.strokeStyle = `rgba(230,235,240,${0.15 + r() * 0.3})`; x.beginPath(); const a = r() * 256, b = r() * 256; x.moveTo(a, b); x.lineTo(a + (r() - 0.5) * 60, b + (r() - 0.5) * 30); x.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function buildLaptop(w: number, h: number) {
  const tex = scuffs();
  // (No environment for metal to reflect: a low metalness, so the light on it reads as worn grey aluminium.)
  const alu = new THREE.MeshStandardMaterial({ color: 0x8a9097, map: tex, roughnessMap: tex, roughness: 0.5, metalness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.12, metalness: 0.2 });
  const keyMat = new THREE.MeshStandardMaterial({ color: 0x141618, roughness: 0.75, metalness: 0.05 });
  const well = new THREE.MeshStandardMaterial({ color: 0x0b0c0d, roughness: 0.9 });
  const pad = new THREE.MeshStandardMaterial({ color: 0x737a82, map: tex, roughness: 0.28, metalness: 0.25 });
  const LW = w + 2 * B.side, LH = h + B.top + B.chin, cy = (B.top - B.chin) / 2;
  const ext = (s: THREE.Shape, d: number, bevel = 0.0012) => new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
  const fitUV = (g: THREE.BufferGeometry, k: number) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * k, uv.getY(i) * k); return g; };

  // The lid: the shell behind, the glass bezel in front, the webcam and its light, the hinge.
  const lid = new THREE.Group();
  const shell = new THREE.Mesh(fitUV(ext(rounded(LW, LH, B.r, 0, cy), B.lid), 3), alu);
  shell.position.z = -B.lid - 0.002; // (its bevel stops just behind the bezel)
  const bezel = new THREE.Mesh(new THREE.ShapeGeometry(rounded(LW - 0.003, LH - 0.003, B.r - 0.0015, 0, cy), 6), glass);
  bezel.position.z = -0.0004;
  const cam = new THREE.Mesh(new THREE.CircleGeometry(0.0016, 16), new THREE.MeshStandardMaterial({ color: 0x0d1418, roughness: 0.05, metalness: 0.5 }));
  cam.position.set(0, h / 2 + B.top / 2, 0);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.0007, 12), new THREE.MeshBasicMaterial({ color: 0x1b2f3a }));
  lens.position.set(0, h / 2 + B.top / 2, 0.0001);
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, LW - 0.06, 16), alu);
  hinge.rotation.z = Math.PI / 2; hinge.position.set(0, -h / 2 - B.chin + 0.002, -0.004);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0x08131a }));
  lid.add(shell, bezel, cam, lens, hinge, screen);

  // The deck, from the hinge toward him: the slab, the keyboard's well and keys, the trackpad.
  const deck = new THREE.Group();
  const slab = new THREE.Mesh(fitUV(ext(rounded(LW, B.deck, B.r, 0, B.deck / 2), B.slab), 3), alu);
  slab.rotation.x = Math.PI / 2; // (its top face, bevel and all, at 1.2 mm)
  const KW = 0.0168, KP = 0.0192, rows = 6, cols = 14, top = 0.022;
  const wellW = cols * KP + 0.006, wellD = rows * KP - 0.004 + 0.006;
  const wellM = new THREE.Mesh(new THREE.ShapeGeometry(rounded(wellW, wellD, 0.003)), well);
  wellM.rotation.x = -Math.PI / 2; wellM.position.set(0, 0.0013, top + wellD / 2 - 0.003);
  // (Each key a rounded cap: one instanced mesh. The top row half height; the bottom row a wide space bar.)
  const cap = new THREE.BoxGeometry(1, 0.0022, 1);
  const spots: [number, number, number, number][] = [];
  for (let r = 0; r < rows; r++) {
    const z = top + (r === 0 ? KP * 0.3 : r * KP) - (r === 0 ? 0 : KP * 0.2), d = r === 0 ? KW * 0.55 : KW;
    if (r === rows - 1) {
      const xs = [-6.5, -5.5, -4.5, -3.5], ws = [1, 1, 1, 1.3];
      xs.forEach((c, i) => spots.push([c * KP + (ws[i] - 1) * KP / 2, z, KW * ws[i] + (ws[i] - 1) * 0.002, d]));
      spots.push([-0.5 * KP, z, KP * 5 - 0.0025, d]);
      for (const c of [2.5, 3.5]) spots.push([c * KP, z, KW, d]);
      for (const [c, s] of [[4.5, 0], [5.5, -1], [5.5, 1], [6.5, 0]] as [number, number][]) spots.push([c * KP, z + s * KP * 0.25, KW, s ? KW * 0.45 : KW * 0.45]);
    } else for (let c = 0; c < cols; c++) spots.push([(c - (cols - 1) / 2) * KP, z, KW, d]);
  }
  const keys = new THREE.InstancedMesh(cap, keyMat, spots.length), m = new THREE.Matrix4();
  spots.forEach(([x, z, sw, sd], i) => keys.setMatrixAt(i, m.compose(new THREE.Vector3(x, 0.0024, z), new THREE.Quaternion(), new THREE.Vector3(sw, 1, sd))));
  const trackpad = new THREE.Mesh(new THREE.ShapeGeometry(rounded(0.115, 0.07, 0.006)), pad);
  trackpad.rotation.x = -Math.PI / 2; trackpad.position.set(0, 0.0014, top + wellD + 0.012 + 0.035);
  deck.add(slab, wellM, keys, trackpad);
  deck.position.set(0, -h / 2 - B.chin + 0.002, 0);
  return { lid, deck, screen };
}
