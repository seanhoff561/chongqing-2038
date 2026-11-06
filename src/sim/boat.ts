// The river police's patrol boat (M6-20, M7-08, DESIGN section 10): boat 3 at their pier, its tank dry, its battery
// gone, its ignition locked. E on it does the next thing it needs that he has: pours in a jerrycan's 20 L of diesel,
// wires in a car battery (one with charge enough to turn the engine over), hotwires its controller with the CAN
// interface; with all that, or the key, he takes the helm and casts off. At the helm W and S open the throttle ahead
// and astern, A and D put the rudder over, E starts and stops the engine, jump steps off (the kill cord stops it). With
// the engine off he paddles, slowly and quietly. The river's current carries the boat on downstream either way. The
// engine is loud: machines on the banks hear it, and so does the river's sonar (sim/river.ts).
import { B, DT, type InputFrame, type SimState } from './types';
import type { World, Inter } from '../world/world';
import { onInteract, START_SOUND, extraInters } from './interact';
import { has, takeStack, addItem, consume } from './inventory';
import { heightAt } from '../world/heightfield';
import { raycast } from '../world/geom';
import { free } from './physics';
import { teleport } from './player';
import { stepDone } from './escape';
import { PIER } from '../world/yuzhong/pier';

/** Litres a jerrycan pours in; the battery charge that turns the engine over (percent) and what a start draws; top
 *  speed ahead and astern, paddling (m/s); how fast it picks up (m/s²) and turns (rad/s); the current (m/s); the deck
 *  over the water and the helm aft of the middle (m); litres a second at full throttle; how far the engine's heard
 *  (m); the water it draws (m); the seconds pouring, wiring, hotwiring; how near Xiaoyu is to come down to it (m). */
export const BOAT = {
  fuel: 20, crank: 25, start: 2, top: 7, astern: 2, paddle: 0.6, accel: 1.2, turn: 0.45, current: 1.8, deck: 0.8, helm: 2.2,
  burn: 20 / 1500, noise: 60, draft: 0.7, pour: 5, wire: 4, hotwire: 8, call: 30,
};
const [LEN] = PIER.hull;

export const ahead = (yaw: number) => ({ x: -Math.sin(yaw), z: -Math.cos(yaw) });
const msg = (s: SimState, text: string) => s.events.push({ t: 'msg', text });

/** The car battery he carries with the most charge. */
const bestCell = (s: SimState) => s.inv.pack.items.filter(i => i.id === 'carbattery').sort((a, b) => (b.charge ?? 100) - (a.charge ?? 100))[0];

/** What E on the boat does next: pour in diesel, wire in a battery, hotwire it, take the helm; or what stops him
 *  (never shown: U-104). */
export function nextStep(s: SimState): 'fuel' | 'battery' | 'hotwire' | 'helm' | string {
  const b = s.boat, fuel = b?.fuel ?? 0, batt = b?.batt, cell = bestCell(s);
  if (fuel < BOAT.fuel && has(s.inv.pack, 'jerrycan')) return 'fuel';
  if (fuel <= 0) return 'the patrol boat: its tank is dry';
  if (batt === undefined || batt < BOAT.crank) return cell && (cell.charge ?? 100) > (batt ?? -1) ? 'battery' : "the patrol boat: no battery that'll turn it over";
  if (!b?.ign && !has(s.inv.pack, 'boatkey')) return has(s.inv.pack, 'canif') ? 'hotwire' : 'the patrol boat: its ignition needs its key';
  return 'helm';
}

/** The boat in the run's state, begun where it's moored (the world's, hidden from then: this one moves). */
function boatOf(s: SimState, it: Inter) {
  if (!s.boat) {
    s.boat = { x: it.x, y: it.y - 1.8, z: it.z, yaw: (it.data?.yaw as number | undefined) ?? 0, v: 0, moored: true, fuel: 0 };
    s.wstate.gone[it.id] = true;
  }
  return s.boat;
}
extraInters.push((s: SimState): Inter[] => (s.boat && s.player.mode !== 'boat' ? [{ id: 'boat', kind: 'boat', x: s.boat.x, y: s.boat.y + 1.8, z: s.boat.z, r: 1.5, zh: '水警巡逻艇', en: 'River-police patrol boat' }] : []));

START_SOUND.boat = () => 'latch';
const STEP_SECS: Record<string, number> = { fuel: BOAT.pour, battery: BOAT.wire, hotwire: BOAT.hotwire };
function work(s: SimState, _w: World, it: Inter) {
  const b = boatOf(s, it), k = nextStep(s), pack = s.inv.pack;
  if (k === 'fuel') { consume(pack, 'jerrycan'); b.fuel += BOAT.fuel; stepDone(s, 'boat', 'fuel'); msg(s, `diesel in: ${Math.round(b.fuel)} L`); }
  else if (k === 'battery') {
    const c = bestCell(s)!;
    takeStack(pack, c.uid);
    if (b.batt !== undefined) addItem(s, pack, 'carbattery', 1, { charge: b.batt });
    b.batt = c.charge ?? 100;
    stepDone(s, 'boat', 'battery');
    msg(s, 'battery wired in');
  } else if (k === 'hotwire') { b.ign = 'can'; stepDone(s, 'boat', 'ignition'); msg(s, 'ignition bypassed'); }
  else if (k === 'helm') {
    if (!b.ign) { b.ign = 'key'; stepDone(s, 'boat', 'ignition'); }
    board(s);
  }
}
onInteract('boat', { can: s => (['fuel', 'battery', 'hotwire', 'helm'].includes(nextStep(s)) ? null : nextStep(s)), dur: s => STEP_SECS[nextStep(s)] ?? 0, now: work, done: work });

/** He takes the helm: cast off. */
function board(s: SimState) {
  const b = s.boat!, p = s.player;
  b.moored = false;
  stepDone(s, 'boat', 'launch');
  p.mode = 'boat'; p.posture = 'stand'; p.act = null; p.hands[0].grip = p.hands[1].grip = null;
  atHelm(s, 0, 0);
}

/** Him at the helm, moving with it. */
function atHelm(s: SimState, vx: number, vz: number) {
  const b = s.boat!, p = s.player, f = ahead(b.yaw);
  p.pos.x = b.x - f.x * BOAT.helm; p.pos.z = b.z - f.z * BOAT.helm; p.pos.y = b.y + BOAT.deck;
  p.vel.x = vx; p.vel.y = 0; p.vel.z = vz; p.onGround = true; p.fallFrom = p.pos.y;
}

/** The river's current: on toward the open reach past Chaotianmen (the river ending's zone), none where there's none. */
const flows = new WeakMap<World, { x: number; z: number } | null>();
function current(w: World, x: number, z: number) {
  if (!flows.has(w)) { const e = w.zones.find(q => q.kind === 'ending:boat')?.box; flows.set(w, e ? { x: (e.x0 + e.x1) / 2, z: (e.z0 + e.z1) / 2 } : null); }
  const to = flows.get(w);
  if (!to) return { x: 0, z: 0 };
  const d = Math.hypot(to.x - x, to.z - z) || 1;
  return { x: ((to.x - x) / d) * BOAT.current, z: ((to.z - z) / d) * BOAT.current };
}

/** Whether the hull floats clear at (x, z): open water deep enough under its middle, bow and stern, nothing solid in
 *  the way. */
export function afloat(w: World, y: number, yaw: number, x: number, z: number) {
  const f = ahead(yaw);
  for (const k of [0, 0.45, -0.45]) {
    const px = x + f.x * LEN * k, pz = z + f.z * LEN * k;
    if (!w.water.some(q => px >= q.x0 && px <= q.x1 && pz >= q.z0 && pz <= q.z1 && Math.abs(q.y1 - y) < 0.5)) return false;
    if (w.ground && (heightAt(w.ground, px, pz) ?? -Infinity) > y - BOAT.draft) return false;
    if (!free(w.index, px, y + 0.1, pz, 0.9, 1.2)) return false;
  }
  return true;
}

/** The engine: started (charge enough, diesel, its ignition) or stopped. */
function engine(s: SimState) {
  const b = s.boat!;
  if (b.on) { b.on = false; s.events.push({ t: 'sfx', id: 'engine-stop' }); return; }
  if (b.fuel <= 0 || (b.batt ?? 0) < BOAT.crank || !b.ign) { s.events.push({ t: 'sfx', id: 'engine-click' }, { t: 'blocked', why: "the engine won't turn over" }); return; }
  b.batt = Math.max(0, b.batt! - BOAT.start);
  b.on = true;
  s.events.push({ t: 'sfx', id: 'engine-start' });
}

/** Off the boat: over its side or bow onto a footing a few metres off it above the water (the pier's deck, the
 *  steps, the bank), else into the river. */
function stepOff(s: SimState, w: World) {
  const b = s.boat!, p = s.player;
  for (const r of [2, 3, 4, 5, 6]) for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2, x = b.x + Math.sin(a) * r, z = b.z + Math.cos(a) * r, top = b.y + 3, h = raycast(w.index, x, top, z, 0, -1, 0, 3);
    if (!h || top - h.t < b.y + 0.2 || !free(w.index, x, top - h.t + 0.35, z, 1.6)) continue;
    teleport(p, x, top - h.t + 0.35, z);
    return;
  }
  const f = ahead(b.yaw);
  teleport(p, b.x - f.z * 2.5, b.y - 0.6, b.z + f.x * 2.5);
}

/** Every tick, once cast off: the helm's input (he's at it), the engine, the current; the boat moved where it floats,
 *  him with it; Xiaoyu down to it if it waits by her steps (she said she'd come). */
export function stepBoat(s: SimState, w: World, input: InputFrame) {
  const b = s.boat, p = s.player;
  if (!b || b.moored) return;
  let aboard = p.mode === 'boat';
  if (aboard && (input.pressed & B.JUMP)) { stepOff(s, w); aboard = false; }
  if (!aboard && b.on) { b.on = false; s.events.push({ t: 'sfx', id: 'engine-stop' }); }
  if (aboard && (input.pressed & B.INTERACT)) engine(s);
  const want = !aboard ? 0 : b.on ? (input.my >= 0 ? input.my * BOAT.top : input.my * BOAT.astern) : input.my * BOAT.paddle;
  b.v += Math.max(-BOAT.accel * DT, Math.min(BOAT.accel * DT, want - b.v));
  if (aboard) b.yaw -= input.mx * BOAT.turn * (b.on ? 0.3 + 0.7 * Math.min(1, Math.abs(b.v) / 3) : 0.5) * (b.v < -0.1 ? -1 : 1) * DT;
  if (b.on) {
    b.fuel -= BOAT.burn * (0.2 + (0.8 * Math.abs(b.v)) / BOAT.top) * DT;
    if (b.fuel <= 0) { b.fuel = 0; b.on = false; s.events.push({ t: 'sfx', id: 'engine-stop' }); }
    if (s.tick % 30 === 0) s.events.push({ t: 'noise', x: b.x, y: b.y + 1, z: b.z, r: BOAT.noise, kind: 'engine' }, { t: 'sfx', id: 'engine' });
  }
  const f = ahead(b.yaw), c = current(w, b.x, b.z), dx = (f.x * b.v + c.x) * DT, dz = (f.z * b.v + c.z) * DT;
  // (Run up on something: it slides along it if it can, else stops.)
  const [mx, mz] = afloat(w, b.y, b.yaw, b.x + dx, b.z + dz) ? [dx, dz] : afloat(w, b.y, b.yaw, b.x + dx, b.z) ? [dx, 0] : afloat(w, b.y, b.yaw, b.x, b.z + dz) ? [0, dz] : [0, 0];
  if (mx !== dx || mz !== dz) b.v *= 0.5;
  b.x += mx; b.z += mz;
  if (aboard) atHelm(s, mx / DT, mz / DT);
  const x = s.sister;
  if (aboard && x?.with && !x.aboard && Math.abs(b.v) < 1 && Math.hypot(x.x - b.x, x.z - b.z) < BOAT.call) { x.aboard = true; msg(s, 'Xiaoyu climbs in'); }
}
