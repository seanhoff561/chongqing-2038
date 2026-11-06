// A fingerprint of a built city, to the last bit of every number: its first n solids (those it was built with: planks
// laid in play come after), its plots, its features and its teleports, in build order. Self-contained (no imports, no
// closures), so the browser check runs its source in a page (tests/e2e/samecity.e2e.mjs) and gets the same hash as
// the test in Node (tests/sim/samecity.seeds.slow.test.ts).
export function worldHash(w, n) {
  const f = new Float64Array(1), u = new Uint32Array(f.buffer);
  let h = 0x811c9dc5;
  const word = v => { h = Math.imul(h ^ v, 0x01000193) >>> 0; };
  const num = v => { f[0] = v ?? NaN; word(u[0]); word(u[1]); };
  const str = s => { s = s ?? ''; word(s.length); for (let i = 0; i < s.length; i++) word(s.charCodeAt(i)); };
  const m = Math.min(n, w.solids.length);
  word(m);
  for (let i = 0; i < m; i++) { const s = w.solids[i]; num(s.x0); num(s.y0); num(s.z0); num(s.x1); num(s.y1); num(s.z1); num(s.mat); num(s.ramp); num(s.low); num(s.rot?.c); num(s.rot?.s); num(s.rot?.px); num(s.rot?.pz); }
  word(w.plots.length);
  for (const p of w.plots) { for (const [x, z] of p.corners) { num(x); num(z); } num(p.base); num(p.wall); num(p.top); num(p.found); str(p.kind); str(p.prefix); }
  word(w.features.length);
  for (const q of w.features) { str(q.kind); num(q.x); num(q.y); num(q.z); }
  word(w.teleports.length);
  for (const t of w.teleports) { str(t.name); num(t.x); num(t.y); num(t.z); num(t.yaw); }
  return h.toString(16).padStart(8, '0');
}
