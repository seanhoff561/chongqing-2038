// The Raffles drone hub (M6-18, DESIGN section 9): the machines have The Crystal, the sky conservatory 250 m up across
// Raffles City's middle towers, for their drones. West, over T2 and T3S, the conservatory gone wild; over the gap to T4S
// its glass floor, the panes on pressure sensors (the beams between them not); east, over T4S and T5, the hub: the drone
// hall open to the glass vault, a gantry under the drones' hatch in the roof and its steel stair down, the loading bay
// at the freight lift's head, the switch room (the spares cabinet: the second spare HV fuse) and the control room (its
// heart). Four ways in: T2's fire stair, 250 m of it, from its door at the foot of the tower; T5's freight lift, still
// running on the hub's power, its car watched by a camera; the window-cleaning gondola up T3S's face to its roof
// terrace and the service door there; and from the terrace up the steel stair onto The Crystal's roof, along it in the
// wind to the drones' hatch and down onto the gantry. Out on the tops the wind gusts (sim/crystal.ts).
import { raycast, solid, turn, type Solid, type SolidIndex } from '../geom';
import { MAT } from '../mats';
import { stepsFor } from '../steps';
import { heightAt, type Heightfield } from '../heightfield';
import { built } from './handbuilt';
import { door, put, scrawl, mark, type Hand } from './handunder';
import { RAFFLES, glassFloor, spanOf, type Fitting, type Frame, type Raffles, type TowerHand } from './raffles';
import type { P2 } from './shapes';
import { atan2 } from '../trig';

export const HUB = {
  /** the switchback stairs: a flight's run, a landing, the stair's half-width, about a storey (m) */
  run: 3.6, landing: 1.6, half: 2.6, storey: 4.4,
  /** the lift's ride and the gondola's (s), how far each is heard (m) */
  lift: 20, liftNoise: 40, gondola: 30, gondolaNoise: 25,
  /** the drones' hatch across The Crystal (s), the gantry under it (m below the roof) */
  hatch: 12.4, gantry: 3.5,
  /** the glass floor: its panes' size, how far either side of a beam's line is on the beam (m) */
  pane: 3, beam: 0.25,
  /** gusts out on the tops: one every `every` s, `last` s long, the wind heard rising `warn` s before; how hard each
   *  pushes him (m/s², across it toward the Yangtze), on his feet, crouched, lying, off his feet */
  gust: { every: 14, last: 2.2, warn: 1.5, push: { stand: 38, crouch: 18, crawl: 0, air: 12 } },
};

/** A frame to lay a stair out in: a along it, c across. */
interface Lay { box(a0: number, a1: number, c0: number, c1: number, y0: number, y1: number, mat: number): Solid; pt(a: number, c: number): P2; up(forward: boolean): 1 | 2 | 3 | 4 }

/** A switchback stair from y0 up to y1, its foot landing at a0: flights up along a on its c < 0 side and back on its
 *  c > 0 side, a landing at each end, rails along its sides (`rails`: the c > 0 side, or both). Its solids, its steps,
 *  and the points it's walked up by. */
function switchback(L: Lay, a0: number, y0: number, y1: number, kept: Solid[], decor: Solid[], rails = 0) {
  const { run, landing, half } = HUB, n = Math.max(1, Math.round((y1 - y0) / HUB.storey)), fh = (y1 - y0) / n, A = a0 + landing, B = A + run, E = B + landing;
  const way: { x: number; y: number; z: number }[] = [], at = (a: number, c: number, y: number) => { const [x, z] = L.pt(a, c); way.push({ x, y, z }); };
  const ramp = (c0: number, c1: number, low: number, high: number, fwd: boolean) => { const q = L.box(A, B, c0, c1, low - 0.1, high, MAT.hidden); q.ramp = L.up(fwd); q.low = low; kept.push(q); stepsFor(q, decor, MAT.concrete); };
  at(a0 + landing / 2, -half / 2, y0);
  for (let k = 0; k < n; k++) {
    const y = y0 + k * fh, m = y + fh / 2, e = y + fh;
    ramp(-half + 0.1, -0.1, y, m, true);
    kept.push(L.box(B, E, -half, half, m - 0.25, m, MAT.concrete), L.box(a0, A, -half, half, e - 0.25, e, MAT.concrete));
    ramp(0.1, half - 0.1, m, e, false);
    at(A + 0.2, -half / 2, y); at(B + landing / 2, -half / 2, m); at(B + landing / 2, half / 2, m); at(A - landing / 2, half / 2, e); at(a0 + landing / 2, -half / 2, e);
    // (A rail along its outer side (1), or both (2).)
    for (const [c0, c1] of ([[half, half + 0.05], [-half - 0.05, -half]] as const).slice(0, rails)) kept.push(L.box(a0, E, c0, c1, y, e + 1, MAT.metal));
  }
  return way;
}

/** A tower's ground floor seen from one of its faces: a in from the face, c across it; and its bowed top's. */
function faceLay(h: TowerHand, fx: number, fz: number): Lay & { d: number; nx: number; nz: number; at: (a: number, c: number, y: number) => P2; rect: (a0: number, a1: number, c0: number, c1: number) => [number, number, number, number]; through: 't' | 's' } {
  const o = h.t.obb, d = fx ? o.hw : o.hd, X = (a: number, c: number) => fx * (d - a) - fz * c, Z = (a: number, c: number) => fz * (d - a) + fx * c;
  const [mx, mz] = h.b.H.pt(fx, fz), [cx, cz] = h.b.H.pt(0, 0);
  return {
    d, nx: mx - cx, nz: mz - cz, through: fx ? 't' : 's',
    box: (a0, a1, c0, c1, y0, y1, mat) => h.b.H.box(X(a0, c0), X(a1, c1), Z(a0, c0), Z(a1, c1), y0, y1, mat),
    pt: (a, c) => h.b.H.pt(X(a, c), Z(a, c)),
    rect: (a0, a1, c0, c1) => [Math.min(X(a0, c0), X(a1, c1)), Math.max(X(a0, c0), X(a1, c1)), Math.min(Z(a0, c0), Z(a1, c1)), Math.max(Z(a0, c0), Z(a1, c1))],
    up: fwd => (fx ? ((fx > 0) === fwd ? 2 : 1) : (fz > 0) === fwd ? 4 : 3),
    // (Local, at a height: bowed out with the tower.)
    at: (a, c, y) => { const [ex, ez] = h.bow(y); return [ex + X(a, c), ez + Z(a, c)]; },
  };
}

/** The hub: laid out as each tower's built (fit) and once The Crystal's shell stands (inside). `idx` and `g` are the
 *  city as it stands, to find a face of each tower with open ground before it for its way in. */
export function droneHub(idx: SolidIndex, g: Heightfield): Fitting {
  let lift: P2 = [0, 0], liftBase = 0, gondola = { side: 1, t: 0 };
  const C = (F: Frame) => {
    const t4 = spanOf(F, 'T4S'), t5 = spanOf(F, 'T5'), tH = (t4.t1 + t5.t0) / 2;
    return { t4, t5, tH, yG: F.y + RAFFLES.tall - HUB.gantry, g: glassFloor({ frame: F }) };
  };
  /** The face of a tower with the most open ground before it, at its foot (of those `ok` allows). */
  const pick = (h: TowerHand, ok: (nx: number, nz: number) => boolean = () => true) => {
    let best = faceLay(h, 1, 0), most = -1;
    for (const [fx, fz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const L = faceLay(h, fx, fz), [mx, mz] = L.pt(0, 0);
      if (!ok(L.nx, L.nz)) continue;
      let clear = 0;
      for (let k = 1; k <= 12; k++) {
        const x = mx + L.nx * k, z = mz + L.nz * k;
        if (Math.abs((heightAt(g, x, z) ?? -99) - h.base) > 1.2 || [1.0, 1.9].some(dy => raycast(idx, x - L.nx, h.base + dy, z - L.nz, L.nx, 0, L.nz, 1))) break;
        clear = k;
      }
      if (clear > most) { most = clear; best = L; }
    }
    return best;
  };
  /** Into the tower from a face: its door, a corridor in to `to` (a). */
  const entry = (h: TowerHand, L: ReturnType<typeof faceLay>, to: number, id: string, label: [string, string]) => {
    const [x0, x1, z0, z1] = L.rect(0.6, to, -1, 1);
    h.b.H.space(x0, x1, z0, z1, h.base, h.base + 2.6);
    const [dx, dz] = L.at(0.3, 0, h.base);
    door(h.b.H, id, dx, dz, L.through, 'shut', { label });
    const [ox, oz] = L.pt(-1.5, 0);
    h.b.H.features.push({ kind: `out:hub:${id}`, x: ox, y: h.base, z: oz, group: 0 });
  };
  return {
    fit(h, r) {
      const F = r.frame, S = RAFFLES.half, top = h.top;
      if (h.t.name === 'T2') {
        // The fire stair: its door, the corridor in, the shaft in the middle from the foot to the head room, its door
        // into The Crystal; the shaft through The Crystal's floor.
        const L = pick(h), a0 = L.d - HUB.landing - HUB.run / 2, E = a0 + 2 * HUB.landing + HUB.run;
        entry(h, L, a0, 'stair', ['消防楼梯', 'Fire stair']);
        const sh = L.rect(a0, E, -HUB.half, HUB.half);
        h.b.H.space(sh[0], sh[1], sh[2], sh[3], h.base, top + 3);
        const hr = L.rect(a0 - 0.4, E + 0.4, -HUB.half - 0.4, HUB.half + 0.4);
        h.b.shell(hr[0], hr[1], hr[2], hr[3], top, top + 3.3, MAT.concrete, 0x9a9890);
        const way = switchback(L, a0, h.base, top, h.b.H.kept, h.b.H.decor), T = h.b.on(top), [dx, dz] = L.at(a0 - 0.2, 0, h.base);
        door(T, 'stairhead', dx, dz, L.through, 'shut', { label: ['空中花园', 'The Crystal'] });
        way.forEach((q, n) => h.b.H.features.push({ kind: 'hub:stair', ...q, group: n }));
        const [ix, iz] = L.pt(a0 - 1.6, 0);
        h.b.H.features.push({ kind: 'in:hub:stair', x: ix, y: top, z: iz, group: 0 });
        r.cuts.push(cut(F, [L.pt(a0 - 0.4, -3), L.pt(a0 - 0.4, 3), L.pt(E + 0.4, -3), L.pt(E + 0.4, 3)], F.y - RAFFLES.belly - 0.1, F.y + 0.05));
      } else if (h.t.name === 'T5') {
        // The freight lift: its door, the corridor in, its car in the middle (its camera in the corner over the door).
        const L = pick(h), d = L.d;
        entry(h, L, d - 1.8, 'lift', ['货梯', 'Freight lift']);
        const car = L.rect(d - 1.8, d + 1.8, -1.8, 1.8);
        h.b.H.space(car[0], car[1], car[2], car[3], h.base, h.base + 2.8);
        const [x, z] = L.pt(d + 0.9, 0), [cx, cz] = L.pt(d + 1.6, 1.6);
        lift = h.b.H.pt(0, 0); liftBase = h.base;
        h.b.H.inter.push({ id: 'hub-lift', kind: 'hublift', x, y: h.base + 1.3, z, r: 0.7, zh: '货梯', en: 'Freight lift', data: { to: { x: lift[0], y: F.y + 0.05, z: lift[1] } } });
        r.cameras.push({ kind: 'camera', x: cx, y: h.base + 2.5, z: cz, yaw: atan2(L.nx, L.nz) });
        h.b.H.decor.push(L.box(d + 1.5, d + 1.8, -1.8, 1.8, h.base + 2.75, h.base + 2.8, MAT.lamp));
      } else if (h.t.name === 'T3S') {
        // The gondola: the window-cleaning cradle at the foot of the face toward one side of The Crystal, its rails
        // up the face, its machine on the roof terrace; there the service door into The Crystal and the stair up
        // onto its roof (a steel stair), and the drones' hatch further along that roof.
        const L = pick(h, (nx, nz) => Math.abs(nx * -F.uz + nz * F.ux) > 0.7), side = Math.sign(L.nx * -F.uz + L.nz * F.ux), sp = spanOf(F, 'T3S');
        gondola = { side, t: sp.t };
        const foot = L.pt(-1.0, 0), [tx, tz] = L.at(3.5, 0, top), tw = h.b.H.pt(tx, tz), edge = h.b.H.pt(...L.at(0.7, 0, top)), gy = heightAt(g, foot[0], foot[1]) ?? h.base;
        h.b.H.inter.push({ id: 'hub-gondola', kind: 'gondola', x: foot[0], y: gy + 1.2, z: foot[1], r: 0.9, zh: '擦窗吊篮', en: 'Window-cleaning cradle', data: { to: { x: tw[0], y: top + 0.05, z: tw[1] } } },
          { id: 'hub-gondola-top', kind: 'gondola', x: edge[0], y: top + 1.0, z: edge[1], r: 0.9, zh: '擦窗吊篮', en: 'Window-cleaning cradle', data: { to: { x: foot[0], y: gy + 0.05, z: foot[1] } } });
        h.b.H.decor.push(L.box(-1.8, -0.4, -1.6, 1.6, gy, gy + 1.1, MAT.metal));
        for (let y = h.base; y < top; y += RAFFLES.seg) for (const c of [-1.3, 1.3]) { const [a0, b0] = L.at(-0.15, c - 0.06, y + 5), [a1, b1] = L.at(-0.05, c + 0.06, y + 5); h.b.H.decor.push(h.b.H.box(a0, a1, b0, b1, y, Math.min(top, y + RAFFLES.seg), MAT.metal)); }
        const [m0, n0] = L.at(1.5, 2.5, top), [m1, n1] = L.at(4.5, 5.5, top), [r0, s0] = L.at(-1.2, -0.2, top), [r1, s1] = L.at(3, 0.2, top);
        h.b.H.kept.push(h.b.H.box(m0, m1, n0, n1, top, top + 2.4, MAT.metal));
        h.b.H.decor.push(h.b.H.box(r0, r1, s0, s1, top + 2.1, top + 2.4, MAT.metal));
        h.b.H.features.push({ kind: 'hub:terrace', x: tw[0], y: top, z: tw[1], group: 0 });
        // The steel stair up the glass from the terrace onto The Crystal's roof, west of the service door, its rail on
        // its outer side.
        const sC = side * (S + 0.3 + HUB.half), a0 = sp.t - 2.2 - 2 * HUB.landing - HUB.run, kept: Solid[] = [], decor: Solid[] = [];
        const up: Lay = { box: (a, a1, c0, c1, y0, y1, mat) => solid(F.ox + a, y0, F.oz + sC + side * c0, F.ox + a1, y1, F.oz + sC + side * c1, mat), pt: (a, cc) => F.pt(a, sC + side * cc), up: fwd => (fwd ? 1 : 2) };
        // (Its way: from the terrace round its rail to its foot at its west end, and up.)
        const near = (a: number, cc: number) => { const [x, z] = up.pt(a, cc); return { x, y: F.y, z }; };
        [near(sp.t, HUB.half + 1.5), near(a0 - 1.5, HUB.half + 1.5), near(a0 - 1.5, -HUB.half / 2)].concat(switchback(up, a0, F.y, F.y + RAFFLES.tall + 0.4, kept, decor, 1)).forEach((q, n) => h.b.H.features.push({ kind: 'hub:roofstair', ...q, group: n }));
        r.solids.push(...turn(kept, F.yaw, F.ox, F.oz)); r.decor.push(...turn(decor, F.yaw, F.ox, F.oz));
        h.b.H.features.push({ kind: 'hub:roof', ...pt3(F, a0 + HUB.landing / 2, side * (S - 2), F.y + RAFFLES.tall + 0.4), group: 0 });
        r.cuts.push({ x0: sp.t - 0.6, x1: sp.t + 0.6, y0: F.y, y1: F.y + 2.1, z0: side * S - 0.4, z1: side * S + 0.4 });
        // (The drones' hatch, over the gantry: cut through the roof now its shell's still to stand.)
        const c = C(F);
        r.cuts.push({ x0: c.tH - 6, x1: c.tH - 4, y0: F.y + RAFFLES.tall - 0.1, y1: F.y + RAFFLES.tall + 0.6, z0: HUB.hatch - 1, z1: HUB.hatch + 1 });
      }
      if (h.t.crystal) parapets(h, r, gondola.side && h.t.name === 'T3S' ? h.b.H.inter.find(i => i.id === 'hub-gondola-top') : undefined);
    },
    inside(r) {
      const F = r.frame, S = RAFFLES.half, Y = F.y, c = C(F), ox = F.ox, oz = F.oz;
      const box = (t0: number, t1: number, s0: number, s1: number, y0: number, y1: number, mat: number) => solid(ox + t0, y0, oz + s0, ox + t1, y1, oz + s1, mat);
      const b = built('hub', Y, box, F.pt), H = b.H, lay: Lay = { box, pt: F.pt, up: fwd => (fwd ? 1 : 2) };
      conservatory(H, F, c.g[0], gondola.t);
      // The hub's rooms: walls 5 m high under the vault, its hall open to it.
      const hw = c.g[1] + 1.5, t5a = c.t5.t0, t5b = c.t5.t1 - 2, e = F.t1 - 0.4;
      b.shell(hw, e, -S + 0.15, S - 0.15, Y, Y + 5, MAT.concrete, 0xb8bcc0);
      H.space(hw + 0.6, t5a - 0.3, -S + 0.45, S - 0.45, Y, Y + 5.1); // drone hall
      H.space(t5a + 0.3, t5b - 0.3, -S + 0.45, S - 0.45, Y, Y + 5.1); // loading bay
      H.space(t5b + 0.3, e - 0.4, -S + 0.45, -0.3, Y, Y + 5.1); // switch room
      H.space(t5b + 0.3, e - 0.4, 0.3, S - 0.45, Y, Y + 5.1); // control room
      door(H, 'west', hw + 0.3, 0, 't', 'shut', { label: ['无人机中心', 'Drone hub'] });
      for (const s of [-6, 6]) door(H, `bay${s > 0 ? 'n' : 's'}`, t5a, s, 't', 'shut');
      door(H, 'switch', t5b, -8, 't', 'locked', { label: ['配电室', 'Switch room'] });
      door(H, 'control', t5b, 8, 't', 'shut', { label: ['控制室', 'Control'] });
      door(H, 'between', e - 8, 0, 's', 'shut');
      // The drone hall: rows of charging racks, drones on them; the parts bins.
      for (let t = hw + 4; t < c.tH - 9; t += 6) for (const s of [-12, -6, 0, 6]) H.props.push({ kind: 'dronedock', x: F.pt(t, s)[0], y: Y, z: F.pt(t, s)[1], yaw: F.yaw });
      put(H, 'crate', hw + 3, -S + 1.1, [0, 1], 1.2, 0.9, 0.8, { id: 'bin1', zh: '零件箱', en: 'Parts bin', type: 'crate', tier: 4 });
      put(H, 'crate', c.tH - 12, -S + 1.1, [0, 1], 1.2, 0.9, 0.8, { id: 'bin2', zh: '零件箱', en: 'Parts bin', type: 'crate', tier: 4 });
      put(H, 'rack', t5a - 1, -S + 1.0, [-1, 0], 1.6, 2.0, 0.6, { id: 'bin3', zh: '电池架', en: 'Battery rack', type: 'shelf', tier: 4 });
      scrawl(H, hw + 0.62, -6, [1, 0], '充电架 1-24 · 禁止人员  CHARGING RACKS 1-24 · NO PERSONNEL');
      // The gantry under the drones' hatch and its stair down to the hall.
      const a0 = c.tH - HUB.landing - HUB.run / 2, kept = H.kept, sC = HUB.hatch;
      const gl: Lay = { box: (a, a1, c0, c1, y0, y1, mat) => box(a, a1, sC + c0, sC + c1, y0, y1, mat), pt: (a, cc) => F.pt(a, sC + cc), up: lay.up };
      const way = switchback(gl, a0, Y, c.yG, kept, H.decor, 2);
      kept.push(box(c.tH - 7, a0 + HUB.landing, sC - HUB.half, sC + HUB.half, c.yG - 0.3, c.yG, MAT.metal));
      kept.push(box(c.tH - 7.05, c.tH - 7, sC - HUB.half, sC + HUB.half, c.yG, c.yG + 1, MAT.metal), box(c.tH - 7, a0, sC - HUB.half - 0.05, sC - HUB.half, c.yG, c.yG + 1, MAT.metal));
      const [lx, lz] = F.pt(c.tH - 5, sC + 1.05);
      r.climbables.push({ kind: 'ladder', x: lx, z: lz, y0: c.yG, y1: Y + RAFFLES.tall + 0.4, nx: F.uz, nz: -F.ux });
      way.reverse().forEach((q, n) => H.features.push({ kind: 'hub:gantry', ...q, group: n }));
      H.features.push({ kind: 'in:hub:hatch', ...pt3(F, c.tH - 5, sC, c.yG), group: 0 }, { kind: 'hub:hatch', ...pt3(F, c.tH - 5, sC - 2.2, Y + RAFFLES.tall + 0.4), group: 0 });
      // The loading bay: the freight lift's car at its head, its gate open.
      const lt = (lift[0] - ox) * F.ux + (lift[1] - oz) * F.uz, ls = (lift[0] - ox) * -F.uz + (lift[1] - oz) * F.ux;
      for (const [t0, t1, s0, s1] of [[lt - 1.8, lt + 1.8, ls + 1.4, ls + 1.8], [lt - 1.8, lt + 1.8, ls - 1.8, ls - 1.4], [lt + 1.4, lt + 1.8, ls - 1.8, ls + 1.8]]) kept.push(box(t0, t1, s0, s1, Y, Y + 2.8, MAT.metal));
      kept.push(box(lt - 1.8, lt + 1.8, ls - 1.8, ls + 1.8, Y + 2.8, Y + 3.1, MAT.metal));
      H.inter.push({ id: 'hub-lift-top', kind: 'hublift', ...pt3(F, lt + 0.9, ls, Y + 1.3), r: 0.7, zh: '货梯', en: 'Freight lift', data: { to: { x: lift[0], y: liftBase + 0.05, z: lift[1] } } });
      H.features.push({ kind: 'in:hub:lift', ...pt3(F, lt, ls, Y), group: 0 });
      // The switch room: the hub's 10 kV switchgear, the spares cabinet (the second spare HV fuse).
      for (let t = t5b + 2; t < e - 3; t += 3) kept.push(box(t, t + 2.2, -S + 0.5, -S + 1.5, Y, Y + 2.3, MAT.metal));
      put(H, 'cabinet', e - 2, -3, [0, 1], 1.0, 1.9, 0.5, { id: 'spares', zh: '备件柜', en: 'Spares cabinet', type: 'cabinet', tier: 4, items: [['hvfuse', 1]] });
      scrawl(H, e - 0.42, -8, [-1, 0], '10kV 进线 · 备用熔断器在柜内  10 kV FEED · SPARE FUSE IN THE CABINET');
      // The control room: the desk and its screens, a locker; the heart.
      put(H, 'desk', e - 3, 8, [-1, 0], 1.6, 0.76, 0.8);
      put(H, 'locker', t5b + 1.5, S - 1.2, [0, -1], 0.6, 1.9, 0.5, { id: 'locker', zh: '储物柜', en: 'Locker', type: 'locker', tier: 4 });
      scrawl(H, e - 0.42, 12, [-1, 0], '朝天门空域 · 第3中队  CHAOTIANMEN AIRSPACE · FLIGHT 3');
      mark(H, 'heart:hub', e - 5, 8);
      // The service door off the terrace.
      door(H, 'service', gondola.t, gondola.side * S, 's', 'jammed', { label: ['维修门', 'Service'] });
      H.features.push({ kind: 'in:hub:door', ...pt3(F, gondola.t, gondola.side * (S - 1.5), Y), group: 0 });
      r.solids.push(...turn(b.solids(), F.yaw, ox, oz));
      r.decor.push(...turn(H.decor, F.yaw, ox, oz));
      r.props.push(...H.props); r.inter.push(...H.inter); r.features.push(...H.features);
      r.teleports.push({ name: 'The Crystal', ...pt3(F, F.t0 + 8, 0, Y + 1.5), yaw: atan2(-F.ux, -F.uz) + Math.PI });
    },
  };
}

/** The conservatory gone wild over T2 and T3S: beds along both walls and islands down the middle, trees out of them,
 *  and its words. */
function conservatory(H: Hand, F: Frame, g0: number, door: number) {
  const S = RAFFLES.half, trees = ['figtree', 'palm', 'camphor', 'bamboo'];
  for (let t = F.t0 + 16, k = 0; t < g0 - 8; t += 9, k++) {
    // (Clear of the service door off the terrace.)
    if (t < door + 2 && t + 6 > door - 2) continue;
    for (const s of [-S + 1.9, S - 1.9]) {
      H.kept.push(H.box(t, t + 6, s - 1.5, s + 1.5, F.y, F.y + 0.7, MAT.concrete));
      H.decor.push(H.box(t + 0.1, t + 5.9, s - 1.4, s + 1.4, F.y + 0.7, F.y + 0.75, MAT.moss));
      const [x, z] = F.pt(t + 3, s);
      H.props.push({ kind: trees[k % trees.length], x, y: F.y + 0.7, z, yaw: k });
    }
  }
  scrawl(H, F.t0 + 0.2, 0, [1, 0], '空中花园 · 暂停开放  THE CRYSTAL · CLOSED UNTIL FURTHER NOTICE');
}

/** A parapet round a Crystal tower's roof where it's out in the open, past The Crystal's walls (not by the gondola). */
function parapets(h: TowerHand, r: Raffles, by?: { x: number; z: number }) {
  const F = r.frame, o = h.t.obb, nx = -F.uz, nz = F.ux;
  for (const [fx, fz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const L = faceLay(h, fx, fz), w = fx ? o.hd : o.hw;
    let run: number | null = null;
    for (let c = -w; c <= w + 0.01; c += 2) {
      const [x, z] = h.b.H.pt(...L.at(0.15, Math.min(w, c + 1), h.top)), out = c < w - 0.01 && Math.abs((x - F.ox) * nx + (z - F.oz) * nz) > RAFFLES.half + 0.5 && !(by && Math.hypot(x - by.x, z - by.z) < 1.3);
      if (out && run === null) run = c;
      if (!out && run !== null) {
        const [a0, b0] = L.at(0, run, h.top), [a1, b1] = L.at(0.3, c, h.top);
        h.b.H.kept.push(h.b.H.box(a0, a1, b0, b1, h.top, h.top + 1.1, MAT.concrete));
        run = null;
      }
    }
  }
}

/** A point of The Crystal's frame on the map, at a height. */
const pt3 = (F: Frame, t: number, s: number, y: number) => { const [x, z] = F.pt(t, s); return { x, y, z }; };
/** The Crystal-frame box round points on the map (a way through its shell). */
function cut(F: Frame, pts: P2[], y0: number, y1: number) {
  const ts = pts.map(([x, z]) => (x - F.ox) * F.ux + (z - F.oz) * F.uz), ss = pts.map(([x, z]) => (x - F.ox) * -F.uz + (z - F.oz) * F.ux);
  return { x0: Math.min(...ts), x1: Math.max(...ts), y0, y1, z0: Math.min(...ss), z1: Math.max(...ss) };
}
