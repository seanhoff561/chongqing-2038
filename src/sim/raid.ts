// The raid (M4-24, U-013, DESIGN section 9). A hideout given away (M4-23) is raided that night, at a seeded time
// between 01:00 and 04:00. If he's there (asleep, he wakes to it) he hears them breaking in and has 10 s: when they
// come in, everywhere within 18 m of the way they come is swept, and if he's still there he dies, unless an EMP trap
// he rigged in the hideout downs them as they come (30 s). Out by then, by a second way he opened beforehand (the
// start hideout's rubble fall cleared with a crowbar, the old vent with its rungs past it), he lives, and they're
// after him from there: the nearest garage's humanoids, come in by the way in. Away, it's raided without him. Either
// way, if he lives, they burn it (M4-25): the stash and everything of his there gone, the bed no use; a new hideout
// is for making somewhere else.
import type { SimState, Shelter } from './types';
import type { World } from '../world/world';
import { RAID } from '../data/units';
import { SCALE } from './clock';
import { makeRng, rand, hashString } from './rng';
import { SHELTER_R, stashIds } from './shelter';
import { sleepHooks } from './sleep';
import { die } from './body';
import { nearestNav } from './nav';
import { isOff, unitPose } from './units';
import { onInteract } from './interact';
import { has } from './inventory';
import { doorSolid } from './doors';

type V3 = { x: number; y: number; z: number };

/** When they come for a hideout given away now: tonight between 01:00 and 04:00, or tomorrow night's if tonight's is
 *  past (or too near). Seeded by the run and the bed, a fresh hour each night. */
export function raidTime(s: SimState, id: string): number {
  const at = (d: number) => d * 86400 + (RAID.from + (RAID.to - RAID.from) * rand(makeRng(hashString(`raid:${s.seed}:${id}:${d}`)))) * 3600;
  const day = Math.floor(s.time / 86400);
  return at(day) > s.time + 600 ? at(day) : at(day + 1);
}

/** Where they come in: by the machines' ways to a point on the bed's level near it (a door, a stair), else down a
 *  shaft's ladder into it (the start hideout's grate), else at the bed. */
export function entryOf(w: World, h: Shelter): V3 {
  const n = w.nav ? nearestNav(w.nav, h, 40) : -1;
  if (n >= 0 && Math.abs(w.nav!.pts[n].y - h.y) < 3) return { ...w.nav!.pts[n] };
  const lad = w.climbables.find(c => c.kind === 'ladder' && Math.hypot(c.x - h.x, c.z - h.z) < SHELTER_R && Math.abs(c.y0 - h.y) < 1.5);
  if (lad) return { x: lad.x + lad.nx * 0.6, y: lad.y0, z: lad.z + lad.nz * 0.6 };
  return { x: h.x, y: h.y, z: h.z };
}

/** The nearest garage's humanoids, come in at `at` and after him. */
function squad(s: SimState, w: World, at: V3) {
  if (!w.garages.length) return [];
  let g = 0;
  w.garages.forEach((q, i) => { if (Math.hypot(q.x - at.x, q.z - at.z) < Math.hypot(w.garages[g].x - at.x, w.garages[g].z - at.z)) g = i; });
  const out = s.units.filter(u => u.reserve?.garage === g && !u.reserve.drop && !isOff(s, u));
  out.forEach((u, k) => {
    const home = unitPose(w, u, s.time), pos = { x: at.x + (k - 0.5) * 0.8, y: at.y, z: at.z };
    u.trip = { kind: 'hunt', path: [pos], i: 0, pos, yaw: 0, scan: 0, back: false, left: { x: home.x, y: home.y, z: home.z }, leftAt: s.time };
    Object.assign(u, { sent: s.time, state: 'engaged', aware: 1.5, seen: { ...s.player.pos }, saw: s.time });
  });
  return out;
}

/** Burnt out (M4-25): the stash and what he kept or left there gone, the bed burnt, the hideout his no longer. */
function burn(s: SimState, w: World, h: Shelter, seen = false) {
  const near = (q: V3) => Math.hypot(q.x - h.x, q.y - h.y, q.z - h.z) <= SHELTER_R;
  for (const id of stashIds(s, w, h)) { delete s.containers[id]; s.wstate.gone[id] = true; }
  for (const t of w.inter) if (t.kind === 'table' && near(t) && s.wstate.benches?.[t.id]) delete s.wstate.benches[t.id];
  s.placed = s.placed.filter(q => !near(q));
  s.dropped = s.dropped.filter(q => !near(q));
  s.wstate.gone[h.id] = true;
  s.shelters = s.shelters.filter(x => x !== h);
  (s.lost ??= []).push({ x: h.x, y: h.y, z: h.z, seen });
}

/** Every tick. */
export function stepRaid(s: SimState, w: World) {
  const p = s.player.pos;
  // Back at one they burnt out, he sees it.
  for (const l of s.lost ?? []) if (!l.seen && Math.hypot(p.x - l.x, p.y - l.y, p.z - l.z) < 6) { l.seen = true; s.events.push({ t: 'msg', text: 'burnt out: the stash, the bed, all of it' }); }
  for (const h of [...s.shelters]) {
    if (h.raid === undefined || h.raided || s.time < h.raid) continue;
    h.raided = true;
    // Away, it's raided without him.
    if (Math.hypot(p.x - h.x, p.y - h.y, p.z - h.z) > SHELTER_R) { burn(s, w, h); continue; }
    const e = entryOf(w, h);
    s.raid = { id: h.id, at: s.time + RAID.warn * SCALE, ...e };
    s.events.push({ t: 'msg', text: 'metal shrieking at the way in: they have found the hideout' }, { t: 'sfx', id: 'breach' }, { t: 'noise', ...e, r: 40, kind: 'breach' });
  }
  const r = s.raid;
  if (!r || s.time < r.at) return;
  s.raid = undefined;
  const h = s.shelters.find(x => x.id === r.id), them = squad(s, w, r);
  if (h?.trap) {
    for (const u of them) u.off = s.time + RAID.emp * SCALE;
    s.events.push({ t: 'msg', text: 'the EMP trap goes off in their faces: the hideout is lost, get out' }, { t: 'sfx', id: 'emp' });
  } else if (Math.hypot(p.x - r.x, p.y - r.y, p.z - r.z) <= RAID.sweep) { die(s, 'raid'); return; }
  else s.events.push({ t: 'msg', text: 'behind you they are burning the hideout' });
  if (h) burn(s, w, h, true);
}

// Asleep in a hideout they're coming for, he wakes to them breaking in.
sleepHooks.fates.push(s => {
  const p = s.player.pos, h = s.shelters.find(x => x.raid !== undefined && !x.raided && Math.hypot(p.x - x.x, p.y - x.y, p.z - x.z) <= SHELTER_R);
  return h ? { at: h.raid!, cause: 'raid', why: 'a crash wakes you', wake: true } : null;
});

// (An EMP device rigged in a hideout as a trap on the way in goes off as they come: emp.ts rigs it.)

// A rubble fall (the start hideout's passage stub east): cleared with a crowbar, slowly and loudly, a way on past it.
onInteract('rubble', {
  label: (s, it) => (s.wstate.open[it.id] ? ['塌方已清开', 'Rubble, cleared'] : ['用撬棍清开塌方', 'Clear the rubble with the crowbar']),
  can: (s, it) => (s.wstate.open[it.id] ? 'cleared already' : has(s.inv.pack, 'crowbar') ? null : 'it needs a crowbar'),
  dur: () => RAID.clear,
  done: (s, w, it) => {
    s.wstate.open[it.id] = true;
    if (doorSolid(it) >= 0) w.index.off[doorSolid(it)] = 1;
    s.events.push({ t: 'msg', text: 'the rubble cleared: the old passage runs on' }, { t: 'noise', x: it.x, y: it.y, z: it.z, r: RAID.noise, kind: 'crowbar' });
  },
});
