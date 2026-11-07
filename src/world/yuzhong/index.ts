// Yuzhong at 1:1 (M3-41b, D-016): the real ground, streets, stairs, bridges and buildings of the eastern
// peninsula from the geo data. Each lot is built by the city's lot code in its own unturned frame, then turned
// into place.
import { solid, rampSolid, turn, buildIndex, overlaps, grow, raycast, carve, type Solid } from '../geom';
import { HUNG, PROP_BOX, PROP_HIDE } from '../../data/props';
import { makeWorld, type World, type Teleport, type Prop, type Inter, type Climbable, type HideSpot, type Site, type Plot } from '../world';
import { MAT } from '../mats';
import { makeRng, hashString } from '../../sim/rng';
import { buildLot, PARAPET, type Fabric, type Lot } from '../city/buildings';
import { stepsFor } from '../steps';
import { findMarks } from './marks';
import { greenery, climbOf } from './green';
import { layout, doorPaths } from './layout';
import { ruins } from './ruins';
import { fill } from './fill';
import { GEO } from '../geo';
import { heightAt, rayGround, type Heightfield } from '../heightfield';
import { buildGround, streets, onGround, WATER_Y, type Street } from './ground';
import { planLots, levelLots, markEnterable, oldQuarter, type Plan } from './lots';
import { corners, rasterPoly, obbOverlap, minRect, points, type Obb } from './shapes';
import { alleys } from '../city/climb';
import { buildTunnels, tunnelFrame, JUNCTION, METRO } from './tunnels';
import { buildUnder } from './under';
import { buildSite } from './site';
import { siteWays } from './siteways';
import { placeFinds } from './finds';
import { exitZones } from './exits';
import { podiumMask, buildFactory } from './factory';
import { verticalCity, takeDown } from './vertical';
import { crossings, layLinks, windowBridges } from './crossings';
import { underLot } from './undercity';
import { pickGates, placeGates, network, isolated } from './network';
import { buildLine2, stationEntrances, BEAM } from './line2';
import { dressStreets } from './dressing';
import { sewers } from './sewers';
import { breaches } from './breach';
import { monument, MONUMENT } from './monument';
import { SECURE, fitSecure, approaches } from './secure';
import { signage } from './signage';
import { liFlat } from './liflat';
import { riverfront, riverRoad, docks } from './riverfront';
import { riverPolice } from './pier';
import { cableLine, cableCeil, cableRopes } from './cableway';
import { cutsUnder, inWayUnder, cutDown, type Ceil } from './cutdown';
import { raffleCuts, raffleCeil, raffles } from './raffles';
import { droneHub } from './hub';
import { bridgeSpans, bridgeCeil, spanFor, deck, buildBridge } from './bridges';
import { checkpoint } from './checkpoint';
import { streetRoute } from './streetroute';
import { buildNav, walksOf } from './nav';
import { walkedBeats, columnSpurs, placeCameras, placeGarages } from './patrols';
import { placeSensors } from './sensors';
import { chooseAlley, buildHome, VENT } from './home';
import { links, cut } from './links';
import { hongyadong } from './hongyadong';
import { footprint, sweep, drop, unmark, clipStreets, clipBeat, type Gone, type Owned } from './clear';
import { sin, cos, tan, atan2 } from '../trig';

const empty = (): Fabric => ({ solids: [], decor: [], props: [], lots: [], inter: [], climbables: [], hides: [], features: [], sites: [], far: [] });

export function buildYuzhong(): World {
  const g = buildGround(), sts = streets();
  // The set pieces cut and level the ground first; lots keep clear of them.
  const tun = buildTunnels(g), site = buildSite(g), line = buildLine2(g);
  const land = landMask(g), metro = stationEntrances(g, sts.filter(onGround), land), block = new Uint8Array(g.y.length), mark = (poly: [number, number][], m = block) => rasterPoly(poly, 0, 0, g.cell, g.w, g.h, (i0, i1, j) => m.fill(1, j * g.w + i0, j * g.w + i1 + 1));
  // The underground network off the Grand Tunnel (M3-58), its ways in kept clear of lots.
  const { W: tw } = tunnelFrame(), gtAt = (uu: number, vv: number) => { const [x, z] = tw(uu, vv); return { x, y: tun.frame.floor, z }; };
  const under = buildUnder(g, { floor: tun.frame.floor, junction: tun.at.junction, ways: [tun.at.entrance, tun.at.exit], walk: [gtAt(195, 0), gtAt(JUNCTION.u, 0), gtAt(JUNCTION.u, 8)],
    // (M3-43: the metro's stub, and from it along the Grand Tunnel to the underground's junction; the friends' chamber is
    // sealed off, U-047.)
    metro: tun.at.metro, toJunction: [gtAt(METRO.u, 8), gtAt(METRO.u, 0), gtAt(130, 0), gtAt(90, 0), gtAt(JUNCTION.u, 0)] });
  for (const o of tun.keep.concat(metro.keep, under.keep)) mark(corners({ ...o, hw: o.hw + KEEP, hd: o.hd + KEEP }));
  for (const b of line.beams) for (let k = 0; k + 1 < b.pts.length; k++) {
    const [[ax, az], [bx, bz]] = [b.pts[k], b.pts[k + 1]];
    mark(corners({ cx: (ax + bx) / 2, cz: (az + bz) / 2, hw: Math.hypot(bx - ax, bz - az) / 2 + 1, hd: BEAM.w / 2 + 3, yaw: atan2(bz - az, bx - ax) }));
  }
  if (site) { const m = new Uint8Array(g.y.length); mark(site.poly, m); dilate(g, m, KEEP); for (let k = 0; k < m.length; k++) block[k] |= m[k]; }
  // The factory covers Raffles City's podium round its towers (M3-57b).
  const pod = podiumMask(g, block), unblocked = block.slice();
  for (let k = 0; k < pod.length; k++) block[k] |= pod[k];
  const plans = planLots(g, sts, land, block);
  levelLots(g, plans);
  markEnterable(g, plans);
  const fac = buildFactory(g, pod, sts);
  // What its halls leave of the podium is open ground like any other, to fill.
  if (fac) for (let k = 0; k < pod.length; k++) block[k] = unblocked[k] | fac.under[k];
  const out = empty(), plots: Plot[] = [];
  // Shibati's stair (M3-18): the stepped street nearest the landmark, its top and its foot. The district's key points
  // (M3-21): the hideout's grate, Jiaochangkou, the top of the stair, the riverfront; three layers of routes join them.
  const SB = GEO.landmarks.shibati, near = (s: Street) => Math.min(...s.pts.map(([x, z]) => Math.hypot(x - SB.x, z - SB.z)));
  const stair = sts.filter(s => s.steps && onGround(s)).sort((a, b) => near(a) - near(b))[0], sh = stair.pts.map(([x, z]) => hAt(g, x, z));
  const [top, foot] = [stair.pts[sh.indexOf(Math.max(...sh))], stair.pts[sh.indexOf(Math.min(...sh))]], JK = GEO.landmarks.jiaochangkou;
  // The friends' hideout (U-047, U-048): under the real alley nearest the middle of the district's other key points,
  // 60 m from any way down and clear of everything dug; its alley left as it is, the hideout's parts the city's.
  const riverAt = riverRoad(g, sts, { x: foot[0], z: foot[1] });
  const heart = { x: (JK.x + top[0] + riverAt.x) / 3, y: 0, z: (JK.z + top[1] + riverAt.z) / 3 };
  const downs = [tun.at.entrance, tun.at.exit, ...metro.at, ...under.features.filter(f => f.kind.startsWith('way:'))].map(q => ({ x: q.x, y: 0, z: q.z }));
  const spot = chooseAlley(g, plans, heart, { points: downs, boxes: tun.zones.concat(under.zones).map(z => z.box) });
  if (!spot) throw new Error('no alley for the hideout');
  // (Its one vent, M6-21: up through the floor of the underground's junction room, in its corner off the ways through.)
  const J = tun.at.junction, home = buildHome(g, plans, spot, { x: J.x + 2.8, y: J.y, z: J.z + 2.0 }), V = home.at.vent;
  cut(under.solids, { x0: V.x - VENT.half, y0: V.y - 1, z0: V.z - VENT.half, x1: V.x + VENT.half, y1: V.y + 0.01, z1: V.z + VENT.half });
  out.solids.push(...home.solids); out.props.push(...home.props); out.inter.push(...home.inter); out.climbables.push(...home.climbables); out.sites.push(...home.sites); out.features.push(...home.features);
  const keys = [{ name: 'hideout gate', at: home.at.grate }, { name: 'jiaochangkou', at: { x: JK.x, y: hAt(g, JK.x, JK.z), z: JK.z } },
    { name: 'shibati top', at: { x: top[0], y: hAt(g, top[0], top[1]), z: top[1] } }, { name: 'riverfront', at: riverAt }], joins: [number, number][] = [[0, 1], [0, 3], [1, 2], [2, 3]];
  // A few caches only a grappling hook reaches (M3-37, U-037): chosen first, so nothing gives them a hold.
  const gatePairs = pickGates(plans, makeRng(hashString('gates')));
  // (Round the caches nothing changes: what keeps them out of reach was judged at these heights.)
  oldQuarter(plans, new Set(plans.filter(p => gatePairs.some(([c]) => Math.hypot(p.obb.cx - c.obb.cx, p.obb.cz - c.obb.cz) < 60)).concat(gatePairs.flat())));
  // Bridged, stacked and built over (M3-57): it may set roofs to meet, so before the lots are built.
  const vert = verticalCity(plans, g, sts);
  // The connections across the streets and between close buildings (M3-37a): roofs may still be set to meet.
  const cross = crossings(plans, g, sts, vert.used!);
  // Each tower's skyline (U-036): the highest roof within 25 m of it.
  for (const p of plans) if (p.kind === 'tower' && !p.far) {
    p.sky = p.base;
    for (const q of plans) if (q !== p && !q.far && q.wall > p.sky && Math.hypot(q.obb.cx - p.obb.cx, q.obb.cz - p.obb.cz) < p.obb.hw + p.obb.hd + q.obb.hw + q.obb.hd + 25 && obbOverlap(p.obb, q.obb, 12.5)) p.sky = q.wall;
  }
  // The high-security sites' buildings, what they were fixed (M6-11: yuzhong/secure.ts); the cableway's, the city's
  // own building nearest its landmark.
  const CW = GEO.landmarks.cablewayNorth, off = (o: Obb) => { const c = cos(o.yaw), s = sin(o.yaw), x = CW.x - o.cx, z = CW.z - o.cz; return Math.hypot(Math.max(0, Math.abs(c * x + s * z) - o.hw), Math.max(0, Math.abs(c * z - s * x) - o.hd)); };
  SECURE.find(S => S.id === 'cableway')!.plan = plans.filter(p => !p.osm && !p.far).reduce((a, b) => (off(b.obb) < off(a.obb) ? b : a)).seed;
  for (const S of SECURE) { const p = plans.find(q => q.seed === S.plan); if (p) { p.siteType = S.type; p.inside = S.inside; } }
  // The cableway's line over the city and the river to Shangxin Street (M6-16): what the city made in its way stands
  // lower, under its cabins: found now, cut once the city stands and is joined up, its dice all thrown as they were.
  const cwPlan = plans.find(q => q.inside === SECURE.find(S => S.id === 'cableway')!.inside), cable = cwPlan ? cableLine(plans, cwPlan) : null;
  // And under the bridges' decks (M6-07).
  // And where Hongyadong stands (M6-03, U-108): razed to nothing, built over once the city stands.
  const spans = bridgeSpans(g), bc = bridgeCeil(spans), cc = cable ? cableCeil(cable) : null, hy = hongyadong(g, plans);
  const ceil: Ceil = pts => (pts.some(([x, z]) => hy.inside(x, z, 0.5)) ? -Infinity : Math.min(cc ? cc(pts) : Infinity, bc(pts)));
  const cuts = cutsUnder(plans, ceil, bc);
  for (const [p, c] of hy.cuts) cuts.set(p, c);
  // And at Chaotianmen (M6-04, U-108): what stood on the square and the towers' stand-ins, to their footings, nothing
  // of the city's strung or set out there; the square and Raffles City are built once the city stands.
  const rafCuts = raffleCuts(plans);
  for (const [p, c] of rafCuts) cuts.set(p, c);
  const below: Ceil = pts => Math.min(ceil(pts), raffleCeil(pts)), inWay = inWayUnder(below, cuts);
  plans.forEach((p, n) => plots.push(buildPlan(p, n, out, g)));
  rowAlleys(plans, out, g, home.pair[0]);
  // Holes knocked through from one building into the next where their floors meet (M3-76).
  breaches(out);
  // The connections between them, each end on its wall (M3-81); planks out of windows across to a window or a roof.
  const built = buildIndex(out.solids);
  layLinks(vert, built, inWay);
  layLinks(cross, built, inWay);
  windowBridges(out.features.filter(f => f.kind.startsWith('win:')), built, cross, inWay);
  const razed = (p: Plan) => hy.cuts.has(p) || rafCuts.has(p);
  cutDown(below, cuts, plans, plots, out, razed);
  // (What the vertical city built on what was razed for the new places goes with it; whatever of it and of the
  // crossings stood where Hongyadong does, too.)
  takeDown(vert, razed);
  for (const v of [vert, cross]) {
    for (const k of ['solids', 'decor', 'far'] as const) v[k] = v[k].filter(q => !footprint(q).some(([x, z]) => hy.inside(x, z, 0.5)));
    v.climbables = v.climbables.filter(q => !hy.inside(q.x, q.z, 0.5)); v.features = v.features.filter(q => !hy.inside(q.x, q.z, 8));
  }
  const K = ['solids', 'decor', 'props', 'inter', 'climbables', 'features', 'hides', 'sites'] as const, n0 = K.map(k => out[k].length);
  place(hy.f, hy.o, 'hongyadong', out);
  const mine = new Set<object>(K.flatMap((k, i) => (out[k] as object[]).slice(n0[i])));
  // The sewer maze under the basements (M3-73a).
  const sew = sewers(out.features.filter(f => f.kind === 'sewer'), plots, g, under.route, tun.zones.concat(home.zones).map(z => z.box), under.solids, under.zones.map(z => z.box));
  // The cable tunnel to the telecom exchange and the hospital's basement link (M6-21), off Jiaochangkou's station hall:
  // each to the foot of its site's basement shaft (the hospital's along the sewer under its street, taken in).
  const shaftFoot = (id: string) => {
    const plan = SECURE.find(S => S.id === id)!.plan, m = out.inter.find(i => i.id.startsWith(`${plan}-`) && i.kind === 'grate' && i.data?.manhole)!;
    const lad = sew.climbables.find(c => c.kind === 'ladder' && Math.hypot(c.x - m.x, c.z - m.z) < 1.5)!;
    return { x: m.x, y: lad.y0, z: m.z };
  };
  const jk = under.at.jkWest, tel = shaftFoot('telecom'), hosp = shaftFoot('hospital'), climb = (y: number) => (y - jk.y) / tan(0.61), side = { x: jk.x - 4, y: jk.y, z: jk.z }, { hospSewer: hz, telFlight: tz } = LINK_AT;
  const linked = links({
    'link:telecom': [jk, side, { ...side, z: tz }, { x: side.x, y: tel.y, z: tz + climb(tel.y) }, { x: side.x, y: tel.y, z: tel.z }, tel],
    'link:hospital': [jk, side, { ...side, z: hz + 1.2 + climb(hosp.y) }, { x: side.x, y: hosp.y, z: hz + 1.2 }, { x: side.x, y: hosp.y, z: hz }, { x: hosp.x, y: hosp.y, z: hz }, hosp],
  }, [under.solids, sew.solids], tun.zones.concat(home.zones, under.zones, sew.zones).map(z => z.box));
  // (Hongyadong's plots, the tiers' footprints, after the sewers: they keep under the city as it was.)
  plots.push(...hy.plots);
  // The caches, and the route network over everything that joins the roofs (M3-37).
  const gates = placeGates(gatePairs.filter(q => isolated(q, plans)), out), L0 = GEO.landmarks, lm = (k: string) => ({ x: L0[k].x, y: 0, z: L0[k].z });
  const net = network(plots.filter(p => !p.razed), out.features.concat(vert.features, cross.features, under.features, sew.features), out.sites, sts, g,
    [['jiaochangkou', 'shibati', 'jiefangbei', 'cablewayNorth', 'xiaoshizi', 'chaotianmen'].map(lm), ['jiefangbei', 'xinhuaIntl', 'hongyadong', 'chaotianmen'].map(lm)],
    { ...home.at.grate }, cross, gates, buildIndex(out.solids), keys, joins);
  // The underground city's buildings (M3-73), as they stand (after the routes: the surface's network doesn't run
  // through the cavern under it).
  under.lots.forEach((s, k) => { const { l, f } = underLot(s, k); place(f, { cx: (l.x0 + l.x1) / 2, cz: (l.z0 + l.z1) / 2, hw: (l.x1 - l.x0) / 2, hd: (l.z1 - l.z0) / 2, yaw: 0 }, `under${k}`, out); });
  // The streets as drawn, and paths from the doors set back from them to them (U-033).
  const drawn = drawnStreets(sts.filter(onGround), plots), doorWays = doorPaths(g, plots, drawn);
  const decor: Solid[] = [];
  // Streets are drawn along their lines (render/streets.ts); stairs get their steps here, bridges their decks; the two
  // big bridges their trusses, pylons and piers (M6-07).
  for (const s of sts) if (onGround(s) && s.steps) surface(s, g, decor); else if (s.bridge && s.layer > 0) deck(s, g, out.solids, MAIN_ROADS.has(s.kind), spanFor(spans, s));
  const trusses = spans.map(b => buildBridge(b, g, plots));
  // The Dongshuimen's checkpoint on its road deck (M6-19); its sensors join the city's last.
  const check = checkpoint(spans[0]);
  for (const q of [...trusses, check]) { out.solids.push(...q.solids); decor.push(...q.decor); out.climbables.push(...q.climbables); }
  for (const q of trusses) out.far.push(...q.far);
  out.inter.push(...check.inter); out.features.push(...check.features);
  const [W, H] = GEO.size;
  const L = GEO.landmarks, at = (k: string, yaw = 0): Teleport => ({ name: k, x: L[k].x, y: hAt(g, L[k].x, L[k].z) + 1.5, z: L[k].z, yaw });
  const hide = { name: "Friends' hideout (vent grate)", x: home.at.spawn.x, y: home.at.spawn.y + 0.05, z: home.at.spawn.z, yaw: -Math.PI / 2 - home.yaw };
  // (Looking down the stepped street from its mouth.)
  const dw = under.features.find(f => f.kind === 'way:descent'), descentYaw = dw ? atan2(-dw.nx!, -dw.nz!) : 0;
  // Shibati's stair from its top looking down and from its foot looking up (M3-18); the beam of Line 2 a third of the
  // way along its longest run, looking along it.
  const look = (a: [number, number], b: [number, number]) => atan2(a[0] - b[0], a[1] - b[1]);
  const run = line.beams.reduce((a, b) => (b.pts.length > a.pts.length ? b : a)), bi = Math.floor(run.pts.length / 3), bn = run.pts[Math.min(run.pts.length - 1, bi + 1)];
  const teleports = ['jiefangbei', 'shibati', 'jiaochangkou', 'hongyadong', 'xiaoshizi', 'chaotianmen', 'cablewayNorth'].map(k => at(k)).concat([
    { name: 'Shibati top', x: top[0], y: hAt(g, top[0], top[1]) + 1.5, z: top[1], yaw: look(top, foot) },
    { name: 'Shibati bottom', x: foot[0], y: hAt(g, foot[0], foot[1]) + 1.5, z: foot[1], yaw: look(foot, top) },
    { name: 'Line 2 beam', x: run.pts[bi][0], y: run.top[bi] + 0.3, z: run.pts[bi][1], yaw: look(run.pts[bi], bn) },
    hide,
    // The Grand Tunnel's junctions: the friends' stub and the metro's (M3-18).
    { name: 'Tunnel junction (north passage)', x: tun.at.junction.x, y: tun.at.junction.y + 0.3, z: tun.at.junction.z, yaw: 0 },
    { name: 'Tunnel junction (metro)', x: tun.at.metro.x, y: tun.at.metro.y + 0.3, z: tun.at.metro.z, yaw: 0 },
    { name: 'Grand Tunnel entrance', x: tun.at.entrance.x, y: tun.at.entrance.y + 0.05, z: tun.at.entrance.z, yaw: Math.PI / 2 - tun.frame.yaw },
    { name: 'Grand Tunnel exit', x: tun.at.exit.x, y: tun.at.exit.y + 0.05, z: tun.at.exit.z, yaw: 0 },
    { name: 'Line 2 stalled train', x: line.train.x, y: line.train.top + 0.45, z: line.train.z, yaw: Math.PI / 2 - line.train.yaw },
    // The vertical city's pieces (M3-57): on a skybridge, in a lane under a block, at a roof street's ramp, on a
    // roof under a megastructure.
    ...([['skybridge', 'Skybridge', 0, 0], ['overLane', 'Block over a lane', 0, -4.4], ['roofStreet', 'Roof street', -2, 0.3], ['mega', 'Megastructure', 0, -4.2]] as const).flatMap(([k, name, out, up]) =>
      vert.features.filter((f, i, all) => f.kind === k && !all.some((q, j) => j < i && q.group === f.group)).slice(0, 3).map((f, n) => ({ name: `${name} ${n + 1}`, x: f.x + f.nx! * out, y: f.y + up + 1.5, z: f.z + f.nz! * out, yaw: atan2(f.nx!, f.nz!) }))),
    // Down below (M3-58).
    { name: 'Underground city deck', x: under.at.deck.x, y: under.at.deck.y + 1.5, z: under.at.deck.z, yaw: 0 },
    { name: 'Underground city concourse', x: under.at.concourse.x, y: under.at.concourse.y + 1.5, z: under.at.concourse.z, yaw: 0 },
    { name: 'Jiaochangkou metro', x: under.at.jiaochangkou.x, y: under.at.jiaochangkou.y + 1.5, z: under.at.jiaochangkou.z, yaw: -Math.PI / 2 },
    { name: 'Underground Xiaoshizi', x: under.at.xiaoshizi.x, y: under.at.xiaoshizi.y + 1.5, z: under.at.xiaoshizi.z, yaw: 0 },
    // The metro and the old tunnels (M3-68): a platform, the running tunnel, a shelter, a stepped street's mouth.
    ...([['station', 'Metro station Jiefangbei', -Math.PI / 2], ['metro', 'Metro tunnel', -Math.PI / 2], ['shelter', 'Air-raid shelter', 0], ['descent', 'Stepped street down', 0]] as const)
      .filter(([k]) => under.at[k]).map(([k, name, yaw]) => ({ name, x: under.at[k].x, y: under.at[k].y + 1.5, z: under.at[k].z, yaw: k === 'descent' ? descentYaw : yaw })),
    ...under.features.filter(f => f.kind === 'way:culvert' || f.kind === 'way:drain').map((f, n) => ({ name: `${f.kind === 'way:drain' ? 'Drain' : 'Culvert'} mouth ${n + 1}`, x: f.x, y: f.y + 1.5, z: f.z, yaw: 0 })),
    ...(fac?.gates ?? []).map((q, n) => ({ name: `Factory gate ${n + 1}`, x: q.x + q.nx * 16, y: q.y + 1.5, z: q.z + q.nz * 16, yaw: atan2(q.nx, q.nz) })),
  ], metro.at.map(m => ({ name: `Metro ${m.name}`, x: m.x, y: hAt(g, m.x, m.z) + 1.5, z: m.z, yaw: 0 })),
  site ? [
    { name: 'Construction site', x: site.frame.x, y: site.base + 0.05, z: site.frame.z, yaw: 0 },
    { name: 'Construction site crane', x: site.crane.x, y: site.crane.top + 2.55, z: site.crane.z, yaw: 0 },
  ] : []);
  // (Jiefangbei's out on the plaza, on the walking street nearest the monument clear of its kerb, looking at it:
  // M6-01. Its landmark is the monument itself.)
  const mon = plots.find(p => p.kind === 'monument'), jt = teleports.find(t => t.name === 'jiefangbei');
  if (mon && jt) {
    const mx = mon.corners.reduce((a, c) => a + c[0], 0) / mon.corners.length, mz = mon.corners.reduce((a, c) => a + c[1], 0) / mon.corners.length;
    let best: { x: number; z: number; d: number } | null = null;
    for (const st of sts) if (st.kind === 'pedestrian' || st.kind === 'footway') for (let k = 0; k + 1 < st.pts.length; k++) {
      const [ax, az] = st.pts[k], [bx, bz] = st.pts[k + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 2);
      for (let i = 0; i <= n; i++) { const x = ax + ((bx - ax) * i) / n, z = az + ((bz - az) * i) / n, d = Math.hypot(x - mx, z - mz); if (d > MONUMENT.kerb[0] + 3 && (!best || d < best.d)) best = { x, z, d }; }
    }
    const q = best ?? { x: mx + MONUMENT.kerb[0] + 3, z: mz };
    Object.assign(jt, { x: q.x, y: hAt(g, q.x, q.z) + 1.5, z: q.z, yaw: atan2(-(mx - q.x), -(mz - q.z)) });
  }
  // Hongyadong's own: its landmark's on the 30 m terrace (M6-03).
  Object.assign(teleports.find(t => t.name === 'hongyadong')!, hy.teleports[0]);
  teleports.push(...hy.teleports.slice(1));
  // The construction site's ways in round its hoarding, now its neighbours stand (M6-10).
  const ways = site ? siteWays(site, plots, g) : null;
  teleports.push(...(ways?.teleports ?? []), ...trusses.flatMap(q => q.teleports), ...check.teleports);
  const solids = out.solids.concat(line.solids, metro.solids, site?.solids ?? [], ways?.solids ?? [], fac?.solids ?? [], vert.solids, cross.solids, under.solids, sew.solids, linked.solids, tun.solids), inter = out.inter.concat(sew.inter, tun.inter, line.inter, under.inter, site?.inter ?? [], ways?.inter ?? []);
  // (The tunnels' last solid is the tunnel gate's door's, its index found once what's swept is gone.)
  const gateSolid = solids[solids.length - 1], fixed = solids.length, inters = inter.length;
  // Street dressing goes last, round everything else (its solids append, so the gate's index holds).
  const clear = [tun.at.entrance, tun.at.exit, home.at.grate, home.at.exit, ...metro.at].map(q => ({ x: q.x, z: q.z, r: 9 })).concat(site ? [{ x: site.frame.x, z: site.frame.z, r: 50 }] : [],
    plots.filter(p => p.route).map(p => ({ x: p.route![0].x, z: p.route![0].z, r: 2.5 })),
    (fac?.gates ?? []).map(q => ({ x: q.x + q.nx * 8, z: q.z + q.nz * 8, r: 13 })), under.features.map(f => ({ x: f.x, z: f.z, r: 6 })),
    (ways?.features ?? []).filter(f => f.kind === 'site:gate' || f.kind === 'site:scaffold' || f.kind === 'site:ditch').map(f => ({ x: f.x, z: f.z, r: 4 })));
  const staged = buildIndex(solids, g), dress = dressStreets(staged, g, sts, land, inter, clear);
  solids.push(...dress.solids);
  // Then the green and the ruins on the marked open ground, round all that.
  // The parks laid out first (M3-60, U-033), the green and the ruins round them.
  const marks = findMarks(g, land, plots, block), laid = layout(grow(staged), g, marks, land);
  solids.push(...laid.solids);
  const green = greenery(grow(staged), g, marks), rubble = ruins(staged, g, marks);
  solids.push(...green.solids, ...rubble.solids);
  // And the rest of the open ground filled, round all of it. (No cables strung over the streets: ziplines are
  // the player's to rig, U-034.)
  const filled = fill(grow(staged), g, marks, plots);
  solids.push(...filled.solids);
  // The riverfront below Shibati (M3-20): the wall along the road, the steps down into the Yangtze.
  const staged2 = grow(staged), taken = new Map<string, [number, number][]>(), river = riverfront(staged2, g, sts, { x: foot[0], z: foot[1] }, taken);
  // And all round the peninsula (M6-06): the Yangtze side past Xiaoshizi and the Dongshuimen Bridge to the tip at
  // Chaotianmen, and back along the Jialing by Hongyadong and the Qiansimen Bridge; each stretch its own dice.
  for (const k of ['xiaoshizi', 'dongshuimenBridge', 'cablewayNorth', 'chaotianmen', 'hongyadong', 'qiansimenBridge']) {
    const L = GEO.landmarks[k];
    if (!L) continue;
    try {
      const more = riverfront(staged2, g, sts, L, taken, hashString(`riverfront:${k}`));
      river.solids.push(...more.solids); river.decor.push(...more.decor); river.props.push(...more.props); river.features.push(...more.features);
    } catch { /* (no riverside road near this one) */ }
  }
  // The docks on the rivers (M6-06): the OSM piers as pontoons.
  const piers = GEO.areas.filter(a => a[0] === 'pier').map(a => minRect(points(a[2], 0.1))), dock = docks(g, piers);
  river.solids.push(...dock.solids); river.decor.push(...dock.decor); river.features.push(...dock.features);
  // The river police's (M6-20): the pier nearest Chaotianmen.
  const police = riverPolice(g, piers, GEO.landmarks.chaotianmen);
  if (police) { river.solids.push(...police.solids); river.decor.push(...police.decor); river.features.push(...police.features); river.props.push(...police.props); inter.push(...police.inter); }
  solids.push(...river.solids);
  // Chaotianmen square, Raffles City's towers and The Crystal with the drone hub in it (M6-04, M6-18), and whatever the city set out where they stand
  // (above the ground: the sewers under it stay) taken away, every die thrown as it was.
  const was = g.y.slice(), raf = raffles(g, plans, plots, droneHub(staged, g));
  const above = (x: number, z: number, y: number) => raf.covers(x, z) && y > was[Math.round(z / g.cell) * g.w + Math.round(x / g.cell)] - 1.5;
  // (The plots' own ranges kept indexing what they built: U-108.)
  const owned: Owned = { plots, of: new Map<object[], keyof NonNullable<Plot['own']>>([[solids, 'solids'], [inter, 'inter'], [out.props, 'props'], [out.climbables, 'climbables'], [out.features, 'features']]) };
  const kept = <T,>(a: T[], from: number, gone: (q: T) => boolean) => drop(a, (q, i) => i >= from && gone(q), owned);
  const onIt = (q: Solid) => above((q.x0 + q.x1) / 2, (q.z0 + q.z1) / 2, q.y1), atIt = (q: { x: number; y: number; z: number }) => above(q.x, q.z, q.y + 0.5);
  kept(solids, fixed, onIt); kept(inter, inters, atIt);
  for (const a of [decor, river.decor, out.decor, laid.decor, filled.decor]) kept(a, 0, onIt);
  for (const a of [out.props, river.props, dress.props, laid.props, green.props, rubble.props, filled.props]) kept(a, 0, atIt);
  kept(out.climbables, 0, q => above(q.x, q.z, q.y1));
  for (const a of [laid.paths, doorWays]) kept(a, 0, l => l.pts.some(([x, z]) => raf.covers(x, z)));
  // (And a manhole or a trapdoor kept under it, in a basement left under the square, where its walls go down through
  // it: sealed there.)
  const rafIdx = buildIndex(raf.solids), buried = (q: { x: number; y: number; z: number }) => raf.covers(q.x, q.z) && overlaps(rafIdx, { x0: q.x - 0.05, y0: q.y - 0.05, z0: q.z - 0.05, x1: q.x + 0.05, y1: q.y + 0.05, z1: q.z + 0.05 });
  kept(out.props, 0, buried); kept(inter, 0, buried); kept(out.features, 0, f => f.kind === 'sewer' && buried(f));
  solids.push(...raf.solids); decor.push(...raf.decor); out.far.push(...raf.far); out.props.push(...raf.props); inter.push(...raf.inter); out.climbables.push(...raf.climbables);
  // Where Hongyadong stands, whatever the city's dressing set there since taken away (not its own), and the ground cut
  // down under it (U-108).
  const gone: Gone = (x, z, y) => hy.inside(x, z, 0.5) && y > hy.low(x, z) - 1.5;
  sweep({ point: gone, solid: s => footprint(s).some(([x, z]) => gone(x, z, s.y1)) }, mine, { solids: [solids, decor, river.decor, out.decor, laid.decor, filled.decor], points: [out.props, river.props, laid.props, dress.props, green.props, rubble.props, filled.props, inter, out.features, river.features, rubble.features, laid.features],
    ups: [out.climbables] }, owned);
  for (const a of [laid.paths, doorWays]) kept(a, 0, l => l.pts.some(([x, z]) => hy.built(x, z)));
  hy.grade(g);
  unmark(marks, (x, z) => raf.covers(x, z) || hy.inside(x, z), rubble.features);
  // The tunnel gate's door switches its own collision solid, the tunnels' last.
  tun.inter.find(i => i.id === 'shibati-gate')!.data!.solid = solids.indexOf(gateSolid);
  const world = makeWorld({
    name: 'yuzhong', routes: net.routes, patrols: net.patrols, gates, solids, decor: decor.concat(river.decor, out.decor, tun.decor, line.decor, site?.decor ?? [], ways?.decor ?? [], fac?.decor ?? [], vert.decor, cross.decor, under.decor, sew.decor, linked.decor, laid.decor, filled.decor),
    props: out.props.concat(river.props, tun.props, line.props, metro.props, site?.props ?? [], ways?.props ?? [], fac?.props ?? [], under.props, sew.props, laid.props, dress.props, green.props, rubble.props, filled.props), inter, climbables: out.climbables.concat(sew.climbables, tun.climbables, line.climbables, site?.climbables ?? [], ways?.climbables ?? [], vert.climbables, under.climbables),
    hides: out.hides, sites: out.sites.filter(q => q.kind !== 'gone').concat(tun.sites, under.sites), zones: tun.zones.concat(home.zones, under.zones, sew.zones, linked.zones),
    far: out.far.concat(fac?.far ?? [], vert.far), ground: g, plots, features: out.features.concat(river.features, tun.features, site?.features ?? [], ways?.features ?? [], fac?.features ?? [], vert.features, cross.features, rubble.features, under.features, sew.features, linked.features, laid.features, under.route.map((q, n) => ({ kind: 'underRoute', ...q, group: n })), under.metroRoute.map((q, n) => ({ kind: 'metroRoute', ...q, group: n })), under.descents.flatMap((d, i) => d.map((q, n) => ({ kind: 'descentRoute', ...q, group: i * 100 + n })))), marks, lawns: laid.lawns, convoys: fac?.convoys.map(pts => ({ pts, spurs: [] })), streets: drawn.concat(laid.paths, doorWays), water: [{ x0: 0, y0: WATER_Y - 40, z0: 0, x1: W, y1: WATER_Y, z1: H }, ...sew.water, ...under.water],
    teleports: teleports.concat(raf.teleports), spawn: hide,
  });
  world.features.push(...raf.features);
  // Nothing floats or sinks (M3-56): whatever stands on something above ground settles onto what's under it, or
  // comes up out of the ground onto it (the set pieces' props below ground are where they are on purpose).
  // (Props placed with collision were set on their support; the buildings' and alleys' props carry none.)
  const placed = new Set(dress.props.concat(green.props, rubble.props, filled.props));
  for (const p of out.props.concat(dress.props, green.props, rubble.props, filled.props)) {
    if (HUNG.has(p.kind) || (PROP_BOX[p.kind] && placed.has(p))) continue;
    // (Well under the ground, in a basement or the underground city, onto what's under it there.)
    const gy = heightAt(g, p.x, p.z) ?? p.y, from = (p.y < gy - 2.5 ? p.y : Math.max(p.y, gy)) + 0.5, hit = raycast(world.index, p.x, from, p.z, 0, -1, 0, 30);
    if (hit && hit.t > 0.01) p.y = from - hit.t;
  }
  // The big trees climbable up their trunks, the lampposts and camera poles up their posts, wherever they stand
  // (U-035, M3-62, U-104).
  for (const p of world.props) { const c = climbOf(p); if (c) world.climbables.push(c); }
  // Signs and screens only where they face a street with nothing in front of them; laundry only where both ends of
  // its cord meet a wall (U-031).
  const SIGNS = new Set(['neonblade', 'ledscreen', 'ledboard', 'redbanner']);
  world.props = world.props.filter(p => {
    if (p.kind === 'laundry' && p.w) {
      const ux = cos(p.yaw), uz = -sin(p.yaw), half = p.w / 2;
      return [-1, 1].every(s => { const h = raycast(world.index, p.x, p.y + 2.3, p.z, ux * s, 0, uz * s, half + 0.4); return !!h && h.t > half - 0.6; });
    }
    if (!SIGNS.has(p.kind)) return true;
    const dx = sin(p.yaw), dz = cos(p.yaw), y = p.y + 0.5;
    // Under the ground (the underground city's streets): nothing in front of it across the street.
    if (p.y < (heightAt(g, p.x, p.z) ?? -Infinity) - 4) return !raycast(world.index, p.x + dx * 1.2, y, p.z + dz * 1.2, dx, 0, dz, 4);
    for (let d = 1.5; d <= 14; d += 1) {
      const x = p.x + dx * d, z = p.z + dz * d, k = Math.round(z / g.cell) * g.w + Math.round(x / g.cell);
      if (g.street![k]) return !raycast(world.index, p.x + dx * 1.2, y, p.z + dz * 1.2, dx, 0, dz, d - 1.2);
    }
    return false;
  });
  // Dumpsters, drums, kiosks, car boots and the backs of vans are places to hide (M3-47).
  for (const p of world.props) {
    const h = PROP_HIDE[p.kind];
    if (!h) continue;
    const x = p.x + sin(p.yaw) * h.z, z = p.z + cos(p.yaw) * h.z;
    world.hides.push({ id: world.hides.length, kind: h.kind, yaw: p.yaw, inner: { x0: x - h.w / 2, y0: p.y + h.y, z0: z - h.d / 2, x1: x + h.w / 2, y1: p.y + h.y + h.h, z1: z + h.d / 2 } });
  }
  liFlat(world);
  // The cableway's ropes over the river to its south station (M6-16).
  if (cable) { const cr = cableRopes(world, cable); world.ropes = cr.ropes; world.features.push(...cr.features); }
  world.ropes = (world.ropes ?? []).concat(trusses.flatMap(q => q.lines));
  world.bridges = spans;
  // The ways out's far ends (M10-51).
  world.zones.push(...exitZones(world));
  // The machines' ways about on foot as the world stands now (M4-02); the street layer between the key points along
  // them (M3-21).
  world.nav = buildNav(clipStreets(sts, (x, z) => hy.built(x, z, 0.5)), g, world.index, walksOf(world.features).concat(hy.walks));
  world.features.push(...keys.map((k, n) => ({ kind: `key:${k.name}`, x: k.at.x, y: k.at.y, z: k.at.z, group: n })));
  // The beats as walked, off the streets and under the ground (M4-01).
  world.patrols = walkedBeats(world, net.patrols, [tun.at.junction, tun.at.metro])
    // (No walker's beat off the ground's grid, out past the city's edge where the street network runs on: M6-22.)
    .filter(p => p.kind !== 'street' || p.pts.every(q => q.x >= g.x0 && q.z >= g.z0 && q.x <= g.x0 + (g.w - 1) * g.cell && q.z <= g.z0 + (g.h - 1) * g.cell));
  // (No beat through Hongyadong: each that ran through it or by it walks round it, on firm footing: what's under each
  // point, or, where the ground's been cut away, beside it within a stride and a half, or down to what's there now.)
  const firm = (q: { x: number; y: number; z: number }) => {
    const down = (x: number, z: number, d: number) => { const h = raycast(world.index, x, q.y + 0.5, z, 0, -1, 0, d); return h ? { x, y: q.y + 0.5 - h.t, z } : null; };
    for (const r of [0, 0.5, 1, 1.5]) for (let k = 0; k < (r ? 8 : 1); k++) { const f = down(q.x + r * cos((k * Math.PI) / 4), q.z + r * sin((k * Math.PI) / 4), 2.5); if (f) return f; }
    return down(q.x, q.z, 8);
  };
  world.patrols = world.patrols.map(p => clipBeat(p, (x, z) => hy.built(x, z, 0.5), (x, z) => hy.inside(x, z, 2 * g.cell + 1), firm));
  // Hongyadong's own drone, docked on its plaza (M6-03).
  world.docks.push(hy.drone.dock); world.props.push(hy.drone.pad);
  world.patrols.push({ kind: 'drone', unit: 'drone', pts: hy.drone.pts, dwell: hy.drone.pts.map(() => 3), hours: [0, 24], dock: world.docks.length - 1 });
  for (const c of world.convoys ?? []) c.spurs = columnSpurs(world, c.pts);
  world.cameras = placeCameras(world).concat(placeSensors(world, gtAt), police?.cameras ?? [], ways?.cameras ?? []);
  if (police) world.climbables.push(...police.climbables);
  // The high-security sites fitted out: their ways in, loot and hazards (M6-11 to M6-13).
  const sec = fitSecure(world);
  world.secure = sec.sites; world.cameras.push(...sec.cameras); world.props.push(...sec.props); world.gas = sec.gas; world.hv = sec.hv;
  // Jiefangbei station's (M6-17): the third rail, and the face-recognition gates' scan line at face height across them.
  world.rail = under.rails;
  // Line 1's extension (M7-11): its flood the pumps drain, its seismic sensors.
  world.flood = under.flood; world.zones.push(...under.seismic);
  const ga = world.features.find(f => f.kind === 'metro:gates:a'), gb = world.features.find(f => f.kind === 'metro:gates:b');
  if (ga && gb) world.cameras.push({ kind: 'tripwire', x: ga.x, y: ga.y + FACE, z: ga.z, yaw: atan2(gb.x - ga.x, gb.z - ga.z), to: { x: gb.x, y: gb.y + FACE, z: gb.z } });
  world.cameras.push(...check.cameras, ...raf.cameras);
  world.teleports.push(...approaches(world, sec.sites));
  // The river-police pier's ways on (M6-20, M6-25): the gangway's head, the water by its ladder, the crane's foot.
  for (const [k, name] of [['pier:gangway', 'gangway'], ['pier:ladder', 'ladder'], ['pier:crane', 'crane']]) {
    const f = world.features.find(q => q.kind === k), d = world.features.find(q => q.kind === 'pier:deck');
    if (f && d) world.teleports.push({ name: `River-police pier: ${name}`, x: f.x, y: f.y + (k === 'pier:ladder' ? 0.3 : 0.1), z: f.z, yaw: atan2(-(d.x - f.x), -(d.z - f.z)) });
  }
  // Each parked scooter's battery, prised out with a crowbar (M5-23).
  world.props.forEach((p, i) => { if (p.kind === 'scooter') world.inter.push({ id: `scooter${i}`, kind: 'scooter', x: p.x, y: p.y + 0.45, z: p.z, r: 0.6, zh: '电动车', en: 'Scooter' }); });
  // Each camera's junction box (M5-09): where a tap clips in.
  world.cameras.forEach((c, i) => {
    if (!c.box) return;
    world.props.push({ kind: 'jbox', ...c.box });
    world.inter.push({ id: `jbox${i}`, kind: 'jbox', x: c.box.x, y: c.box.y, z: c.box.z, r: 0.5, zh: '接线盒', en: 'Junction box', data: { cam: i } });
  });
  world.garages = placeGarages(world, home.at.spawn);
  // Haozi's chalk mice (M8-15): on the tunnel wall beside the underground route, three along its first stretch, a few
  // points apart.
  const route = world.features.filter(f => f.kind === 'underRoute').sort((a, b) => a.group - b.group);
  for (let i = 1, k = 0, last = -9; i < route.length && k < 3; i++) {
    const q = route[i];
    if (i - last < 3) continue;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const h = raycast(world.index, q.x, q.y + 1.2, q.z, dx, 0, dz, 4);
      if (!h) continue;
      const x = q.x + dx * (h.t - 0.02), z = q.z + dz * (h.t - 0.02);
      world.props.push({ kind: 'chalkmouse', x, y: q.y + 0.9, z, yaw: atan2(-dx, -dz) });
      world.features.push({ kind: `mark:${++k}`, x, y: q.y + 1.2, z, group: k });
      last = i;
      break;
    }
  }
  placeFinds(world);
  // Each shelter site's bed, table and containers (M6-24): what's in its rooms to claim, by where they stand.
  const claim = new Map<string, Inter[]>(), cellOf = (x: number, z: number) => `${Math.floor(x / 8)},${Math.floor(z / 8)}`;
  for (const it of world.inter) if (it.kind === 'mattress' || it.kind === 'table' || it.kind === 'container') { const k = cellOf(it.x, it.z); (claim.get(k) ?? claim.set(k, []).get(k)!).push(it); }
  for (const s of world.sites) {
    const round: Inter[] = [];
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const it of claim.get(cellOf(s.x + i * 8, s.z + j * 8)) ?? []) if (Math.hypot(it.x - s.x, it.z - s.z) < 6 && Math.abs(it.y - s.y) < 1.6) round.push(it);
    s.bed ??= round.find(i => i.kind === 'mattress')?.id ?? null;
    s.table ??= round.find(i => i.kind === 'table')?.id ?? null;
    if (!s.containers.length) s.containers = round.filter(i => i.kind === 'container').slice(0, 6).map(i => i.id);
  }
  // No floor drawn over a hole (M4-82, U-060, U-066): a finish (a floor's tiles or boards, a roof's patch, moss, a
  // puddle) is drawn only where there's something under it to stand on: not over a stairwell, a trapdoor or a hole.
  world.decor = world.decor.flatMap(s => overSomething(world, s));
  world.links = net.links.concat(joins.flatMap(([i, j]) => { const rt = streetRoute(world.nav!, `link:${keys[i].name}-${keys[j].name}:street`, keys[i].at, keys[j].at); return rt ? [{ from: keys[i].name, to: keys[j].name, layer: 'street' as const, route: rt }] : []; }));
  return world;
}

/** A thin finish cut to where there's something to stand on under it: looked at every metre or so across it (in its
 *  own frame, turned with its building; every half metre on a small one), each spot open if nothing solid lies within
 *  0.35 m under it (a hatch's lid or
 *  a door is a way through, not a floor); what's left drawn in strips. */
function overSomething(w: World, s: Solid): Solid[] {
  const R = s.rot, e = R ?? s, dx = e.x1 - e.x0, dz = e.z1 - e.z0;
  if (s.y1 - s.y0 > 0.06 || dx * dz < 0.3) return [s];
  // (Every half metre on a small one, so a manhole under a patch of grime still shows.)
  const cell = dx * dz < 8 ? 0.5 : 1, nu = Math.max(1, Math.round(dx / cell)), nv = Math.max(1, Math.round(dz / cell)), solid = (u: number, v: number) => {
    let x = e.x0 + (dx * (u + 0.5)) / nu, z = e.z0 + (dz * (v + 0.5)) / nv;
    if (R) { const lx = x - R.px, lz = z - R.pz; x = R.px + lx * R.c - lz * R.s; z = R.pz + lx * R.s + lz * R.c; }
    const h = raycast(w.index, x, s.y1 + 0.05, z, 0, -1, 0, 0.4);
    return (h && !w.index.solids[h.id]?.part) || !!rayGround(w.ground!, x, s.y1 + 0.05, z, 0, -1, 0, 0.4);
  };
  const grid = Array.from({ length: nv }, (_, v) => Array.from({ length: nu }, (_, u) => solid(u, v)));
  if (grid.every(r => r.every(Boolean))) return [s];
  // (Each strip looked at once more across its width, so one straddling a hole's edge mostly over it goes too.)
  const held = (q: Solid) => { const f = q.rot ?? q, a = f.x1 - f.x0, b = f.z1 - f.z0; return [[0.5, 0.5], [0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]].filter(([u, v]) => {
    let x = f.x0 + a * u, z = f.z0 + b * v;
    if (q.rot) { const T = q.rot, lx = x - T.px, lz = z - T.pz; x = T.px + lx * T.c - lz * T.s; z = T.pz + lx * T.s + lz * T.c; }
    return !raycast(w.index, x, q.y1 + 0.05, z, 0, -1, 0, 0.4) && !rayGround(w.ground!, x, q.y1 + 0.05, z, 0, -1, 0, 0.4);
  }).length < 3; };
  const out: Solid[] = [], yaw = R ? atan2(R.s, R.c) : 0;
  grid.forEach((row, v) => {
    for (let u = 0; u < nu; u++) {
      if (!row[u]) continue;
      let k = u;
      while (k + 1 < nu && row[k + 1]) k++;
      const piece: Solid = { ...s, rot: undefined, x0: e.x0 + (dx * u) / nu, x1: e.x0 + (dx * (k + 1)) / nu, z0: e.z0 + (dz * v) / nv, z1: e.z0 + (dz * (v + 1)) / nv };
      delete piece.rot;
      out.push(...(R ? turn([piece], yaw, R.px, R.pz) : [piece]).filter(held));
      u = k;
    }
  });
  return out;
}

/** The streets to draw: a walkway's stretches inside a building (a passage through it) left out (U-031). */
function drawnStreets(sts: Street[], plots: Plot[]): { kind: string; w: number; steps: boolean; pts: [number, number][] }[] {
  const cells = new Map<number, Plot[]>(), key = (x: number, z: number) => Math.floor(x / 16) * 65536 + Math.floor(z / 16);
  for (const p of plots) {
    if (p.far) continue;
    const xs = p.corners.map(c => c[0]), zs = p.corners.map(c => c[1]);
    for (let x = Math.min(...xs); x <= Math.max(...xs) + 16; x += 16) for (let z = Math.min(...zs); z <= Math.max(...zs) + 16; z += 16) { const k = key(x, z), a = cells.get(k); if (a) a.push(p); else cells.set(k, [p]); }
  }
  const inside = (x: number, z: number) => (cells.get(key(x, z)) ?? []).some(p => p.corners.every((c, i) => { const d = p.corners[(i + 1) % 4]; return (d[0] - c[0]) * (z - c[1]) - (d[1] - c[1]) * (x - c[0]) >= 0; }) || p.corners.every((c, i) => { const d = p.corners[(i + 1) % 4]; return (d[0] - c[0]) * (z - c[1]) - (d[1] - c[1]) * (x - c[0]) <= 0; }));
  const out: { kind: string; w: number; steps: boolean; pts: [number, number][] }[] = [];
  for (const s of sts) {
    if (MAIN_ROADS.has(s.kind)) { out.push({ kind: s.kind, w: s.w, steps: s.steps, pts: s.pts }); continue; }
    let piece: [number, number][] = [];
    const flush = () => { if (piece.length > 1) out.push({ kind: s.kind, w: s.w, steps: s.steps, pts: piece }); piece = []; };
    // Looked at every metre: inside a building it breaks off (at the last metre out) and starts again at the first
    // metre out; its own corners kept in between.
    let was = true;
    for (let k = 0; k + 1 < s.pts.length; k++) {
      const [ax, az] = s.pts[k], [bx, bz] = s.pts[k + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az)));
      let last: [number, number] = [ax, az];
      for (let i = k === 0 ? 0 : 1; i <= n; i++) {
        const p: [number, number] = [ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n], inn = inside(...p);
        if (inn && !was) { piece.push(last); flush(); }
        else if (!inn && (was || i === n)) piece.push(p);
        was = inn; last = p;
      }
    }
    flush();
  }
  return out;
}

/** How far lots keep from the set pieces: past their aprons, which level the ground round them. */
const KEEP = 5;
/** The links' hand-placed lines (M6-21): the sewer under the hospital's street its basement link takes in, and
 *  where the cable tunnel climbs to the telecom exchange's crawlway (z). */
const LINK_AT = { hospSewer: 1820.9, telFlight: 2040 };
/** How high the metro's face gates scan (a face standing; crouched he's under it): M6-17. */
const FACE = 1.45;

/** Grow a cell mask by r metres. */
function dilate(g: Heightfield, m: Uint8Array, r: number) {
  const n = Math.ceil(r / g.cell), src = m.slice();
  for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) {
    if (!src[j * g.w + i]) continue;
    for (let dj = -n; dj <= n; dj++) for (let di = -n; di <= n; di++) {
      const a = i + di, b = j + dj;
      if (a >= 0 && b >= 0 && a < g.w && b < g.h && di * di + dj * dj <= n * n) m[b * g.w + a] = 1;
    }
  }
}

const MAIN_ROADS = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'service']);
const hAt = (g: Heightfield, x: number, z: number) => g.y[Math.max(0, Math.min(g.h - 1, Math.round(z / g.cell))) * g.w + Math.max(0, Math.min(g.w - 1, Math.round(x / g.cell)))];

/** 1 where the ground is reachable on foot from Jiefangbei above the water, 2 on the far banks, 0 water. */
function landMask(g: Heightfield): Uint8Array {
  const m = new Uint8Array(g.y.length), dry = (k: number) => g.y[k] > WATER_Y + 0.5;
  const L = GEO.landmarks.jiefangbei, start = Math.round(L.z / g.cell) * g.w + Math.round(L.x / g.cell), q = [start];
  m[start] = 1;
  while (q.length) {
    const k = q.pop()!, i = k % g.w;
    for (const n of [i > 0 ? k - 1 : -1, i < g.w - 1 ? k + 1 : -1, k - g.w, k + g.w]) if (n >= 0 && n < m.length && !m[n] && dry(n)) { m[n] = 1; q.push(n); }
  }
  for (let k = 0; k < m.length; k++) if (!m[k] && dry(k)) m[k] = 2;
  return m;
}

/** Build one lot in its own frame and turn everything it made into place. */
function buildPlan(p: Plan, n: number, out: Fabric, g: Heightfield): Plot {
  const o = p.obb, l: Lot = { id: n, x0: o.cx - o.hw, z0: o.cz - o.hd, x1: o.cx + o.hw, z1: o.cz + o.hd, base: p.base, wall: p.wall, top: p.wall, kind: p.kind, mat: p.mat, street: p.street, across: p.across, noEnter: p.noEnter, edge: p.edge, sky: p.sky, bare: p.bare, pitched: p.pitched, sheer: p.sheer, holdless: p.holdless, district: p.district, type: p.siteType, inside: p.inside,
    ground: (x, z) => { const c = cos(o.yaw), s = sin(o.yaw); return heightAt(g, o.cx + c * (x - o.cx) - s * (z - o.cz), o.cz + s * (x - o.cx) + c * (z - o.cz)) ?? p.base; } };
  const f = empty(), r = makeRng(hashString(p.seed));
  if (p.far) {
    // The far banks: one painted block each, to see across the river.
    const look = p.kind === 'tower' ? MAT.glass : MAT.facade;
    f.solids.push(solid(l.x0, l.base, l.z0, l.x1, l.wall, l.z1, look));
    f.far.push(solid(l.x0, l.base, l.z0, l.x1, l.wall + PARAPET, l.z1, look));
  } else if (!p.monument) {
    buildLot(l, r, f);
    signage(l, p, r, f);
  }
  // A foundation down to the lowest ground round it: where a neighbour's lower base dips the ground at a shared
  // wall, or the slope falls away, no gap shows under the walls.
  let low = l.base;
  rasterPoly(corners({ ...o, hw: o.hw + 4.5, hd: o.hd + 4.5 }), 0, 0, g.cell, g.w, g.h, (i0, i1, j) => { for (let k = j * g.w + i0; k <= j * g.w + i1; k++) low = Math.min(low, g.y[k]); });
  // On a slope it stands on a retaining wall of rough stone, stepped at half its height (M3-35, the references).
  const drop = l.base - low;
  f.solids.push(solid(l.x0, low - 1, l.z0, l.x1, l.base, l.z1, drop > 1.5 ? MAT.stone : MAT.concrete));
  if (drop > 3) f.decor.push(solid(l.x0 - 0.3, low + drop / 2 - 0.3, l.z0 - 0.3, l.x1 + 0.3, low + drop / 2, l.z1 + 0.3, MAT.concrete));
  // A basement (M3-73a): the foundation cut away under it, the ground's shell holed over it (2 m past it, all under
  // the building).
  const bs = l.basement;
  if (bs) {
    f.solids.push(...carve([f.solids.pop()!], { x0: bs.x0, y0: low - 2, z0: bs.z0, x1: bs.x1, y1: l.base + 0.01, z1: bs.z1 }));
    const c = cos(o.yaw), s = sin(o.yaw), cx = (bs.x0 + bs.x1) / 2, cz = (bs.z0 + bs.z1) / 2;
    rasterPoly(corners({ cx: o.cx + c * (cx - o.cx) - s * (cz - o.cz), cz: o.cz + s * (cx - o.cx) + c * (cz - o.cz), hw: (bs.x1 - bs.x0) / 2 + 2, hd: (bs.z1 - bs.z0) / 2 + 2, yaw: o.yaw }), 0, 0, g.cell, g.w, g.h,
      (i0, i1, j) => { for (let i = i0; i <= i1; i++) if (i < g.w - 1 && j < g.h - 1) g.hole[j * (g.w - 1) + i] = 1; });
  }
  const K = ['solids', 'decor', 'far', 'props', 'inter', 'climbables', 'hides', 'features', 'sites'] as const, was = K.map(k => out[k].length), pt = place(f, o, p.seed, out);
  if (p.monument) { monument(o, l.base, out); l.top = l.wall = l.base + MONUMENT.height; }
  if (l.route) l.route = l.route.map(q => { const [x, z] = pt(q.x, q.z); return { ...q, x, z }; });
  out.lots.push(l);
  return { corners: corners(o), base: p.base, wall: l.wall, top: l.top, kind: p.monument ? 'monument' : l.kind, row: p.row, found: low - 1, route: l.route, blocked: l.blocked, type: l.type, far: p.far, osm: p.osm, prefix: p.seed,
    own: Object.fromEntries(K.map((k, i) => [k, [was[i], out[k].length]])) as Plot['own'] };
}

/** Turn everything a lot's fabric made in its own frame (about the rectangle's middle) into place, ids prefixed.
 *  Returns the frame-to-map point transform. */
function place(f: Fabric, o: Obb, prefix: string, out: Fabric): (x: number, z: number) => [number, number] {
  const c = cos(o.yaw), s = sin(o.yaw);
  const pt = (x: number, z: number): [number, number] => [o.cx + c * (x - o.cx) - s * (z - o.cz), o.cz + s * (x - o.cx) + c * (z - o.cz)];
  out.solids.push(...turn(f.solids, o.yaw, o.cx, o.cz));
  out.decor.push(...turn(f.decor, o.yaw, o.cx, o.cz));
  out.far.push(...turn(f.far, o.yaw, o.cx, o.cz));
  // (A door's, window's, grate's or hatch's prop names its interactable, prefixed as the interactables are.)
  out.props.push(...f.props.map((q): Prop => { const [x, z] = pt(q.x, q.z); return { ...q, x, z, yaw: q.yaw - o.yaw, ...(q.kind === 'door' || q.kind === 'pane' || ((q.kind === 'grate' || q.kind === 'hatch') && q.text) ? { text: `${prefix}-${q.text}` } : {}) }; }));
  out.inter.push(...f.inter.map((q): Inter => { const [x, z] = pt(q.x, q.z); return { ...q, id: `${prefix}-${q.id}`, x, z }; }));
  out.climbables.push(...f.climbables.map((q): Climbable => { const [x, z] = pt(q.x, q.z); return { ...q, x, z, nx: c * q.nx - s * q.nz, nz: s * q.nx + c * q.nz }; }));
  // A hiding place keeps its size, moved and turned with the rest (M3-47).
  out.hides.push(...f.hides.map((h, n): HideSpot => {
    const b = h.inner, [x, z] = pt((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2), hw = (b.x1 - b.x0) / 2, hd = (b.z1 - b.z0) / 2;
    return { ...h, id: out.hides.length + n, inner: { ...b, x0: x - hw, z0: z - hd, x1: x + hw, z1: z + hd }, yaw: (h.yaw ?? 0) - o.yaw };
  }));
  out.sites.push(...f.sites.map((q): Site => { const [x, z] = pt(q.x, q.z); return { ...q, id: `${prefix}-${q.id}`, x, z, bed: q.bed && `${prefix}-${q.bed}`, table: q.table && `${prefix}-${q.table}`, containers: q.containers.map(id => `${prefix}-${id}`) }; }));
  out.features.push(...f.features.map(q => { const [x, z] = pt(q.x, q.z); return { ...q, x, z, group: out.features.length + q.group, ...(q.nx !== undefined ? { nx: c * q.nx - s * q.nz!, nz: s * q.nx + c * q.nz! } : {}) }; }));
  return pt;
}

/** The alleys between neighbours in each row of infill (U-005): hide spots, scaffold bars, fences and litter,
 *  laid out in the first one's frame. */
function rowAlleys(plans: Plan[], out: Fabric, g: Heightfield, skip: number) {
  // Along each row the alleys take turns, the first one first: something to hide in, bars to swing from, a fence
  // to get over, a hide again, a squeeze to crawl (M3-71).
  const turn = new Map<string, number>();
  for (let n = 0; n + 1 < plans.length; n++) {
    const a = plans[n], b = plans[n + 1];
    // Neighbours square to each other (to a few degrees, round a bend): b laid out in a's frame.
    if (!a.row || a.row !== b.row || a.far || Math.abs(sin(a.obb.yaw - b.obb.yaw)) > 0.06) continue;
    const o = a.obb, c = cos(o.yaw), s = sin(o.yaw), dx = b.obb.cx - o.cx, dz = b.obb.cz - o.cz;
    const bx = o.cx + c * dx + s * dz, bz = o.cz - s * dx + c * dz;
    const lot = (cx: number, cz: number, hw: number, hd: number, base: number, wall: number): Lot => ({ id: -1, x0: cx - hw, z0: cz - hd, x1: cx + hw, z1: cz + hd, base, wall, top: wall, kind: 'res', mat: 0, street: [false, true, false, false], across: [0, 0, 0, 0] });
    const f = empty();
    // Its floor: the ground between them (a lane may keep it higher than either, a slope lower).
    const y = heightAt(g, (o.cx + b.obb.cx) / 2, (o.cz + b.obb.cz) / 2) ?? Math.min(a.base, b.base);
    // Seeded by where it is, so what's in it doesn't change when lots elsewhere come or go.
    // (The hideout's alley gets scaffold bars overhead: nothing over its grate, U-047.)
    const k = turn.get(a.row) ?? 0;
    turn.set(a.row, k + 1);
    alleys([lot(o.cx, o.cz, o.hw, o.hd, y, a.wall), lot(bx, bz, b.obb.hw, b.obb.hd, y, b.wall)], makeRng(hashString(`alley${Math.round(o.cx)},${Math.round(o.cz)}`)), f, n === skip ? 0.5 : [0.1, 0.5, 0.9, 0.3, 0.8][k % 5], Math.abs(sin(a.obb.yaw - b.obb.yaw)) < 0.01);
    place(f, o, `${a.seed}a`, out);
  }
}

/** A street's surface over the levelled ground: a thin ramp per segment in asphalt or paving; stair streets
 *  get their steps. */
function surface(s: Street, g: Heightfield, decor: Solid[]) {
  const mat = s.steps || s.kind === 'footway' || s.kind === 'pedestrian' || s.kind === 'path' ? MAT.stone : MAT.asphalt;
  for (let k = 0; k + 1 < s.pts.length; k++) {
    const [ax, az] = s.pts[k], [bx, bz] = s.pts[k + 1], len = Math.hypot(bx - ax, bz - az);
    if (len < 0.5) continue;
    const ya = hAt(g, ax, az), yb = hAt(g, bx, bz), cx = (ax + bx) / 2, cz = (az + bz) / 2, yaw = atan2(bz - az, bx - ax);
    const lo = Math.min(ya, yb), hi = Math.max(ya, yb), x0 = cx - len / 2 - 0.3, x1 = cx + len / 2 + 0.3, z0 = cz - s.w / 2, z1 = cz + s.w / 2;
    const r = hi - lo < 0.05 ? solid(x0, lo - 0.25, z0, x1, lo + 0.04, z1, mat) : rampSolid(x0, lo - 0.25, z0, x1, z1, lo + 0.04, hi + 0.04, ya < yb ? 1 : 2, mat);
    if (s.steps && hi - lo > 0.6) { const steps: Solid[] = []; stepsFor(r, steps, MAT.stone); decor.push(...turn(steps, yaw, cx, cz)); }
    else decor.push(...turn([r], yaw, cx, cz));
  }
}

