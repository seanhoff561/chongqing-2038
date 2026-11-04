// The hacked drone (M5-11, DESIGN section 12): a salvaged drone and its controller, flown from Anna's Drone page while
// he stands where he is. Eight minutes on a full battery; it can't go through walls nor below a metre off the ground;
// what it flies over fills in on her map (the buildings' types: the aerial map). The machines can see it: one that does
// grows suspicious and looks; an armed one that keeps it in sight three seconds shoots it down.
import type { SimState, InputFrame } from './types';
import type { World } from '../world/world';
import { B, DT, emptyInput } from './types';
import { onCmd } from './commands';
import { raycast } from '../world/geom';
import { UNITS, SENSES } from '../data/units';
import { unitPose, isOff } from './units';
import { daylight } from './clock';
import { cellKey, MAP } from './automap';
import { takeStack } from './inventory';

/** Real seconds a full battery flies; speed (m/s, flat out); climb (m/s); how far round it the map fills in (m); how
 *  long an armed machine has to keep it in sight to shoot it down (s). */
export const FLIGHT = { battery: 480, speed: 8, fast: 14, climb: 4, see: 40, shot: 3 };

const drone = (s: SimState) => s.inv.pack.items.find(i => i.id === 'drone');

onCmd((s, c) => {
  if (c.c !== 'act' || s.dead) return;
  if (c.name === 'land' && s.flight) { land(s, "Anna: the drone's back"); return; }
  if (c.name !== 'launch' || s.flight) return;
  const d = drone(s);
  if (!d || !s.inv.pack.items.some(i => i.id === 'dronectl')) { return; }
  if ((d.charge ?? 100) <= 0) { s.events.push({ t: 'msg', text: "the drone's battery is flat" }); return; }
  const p = s.player.pos;
  s.flight = { x: p.x, y: p.y + 2, z: p.z, yaw: s.player.yaw, pitch: 0, seen: 0 };
  if (s.laptop) s.laptop.open = false;
});

function land(s: SimState, text: string) {
  s.flight = undefined;
  s.events.push({ t: 'msg', text });
}

/** While he flies, his body stands still: none of his input reaches it. */
export const stillWhileFlying = (s: SimState, input: InputFrame): InputFrame => (s.flight ? { ...emptyInput(), yaw: s.player.yaw, pitch: s.player.pitch, slot: -1, cmds: input.cmds } : input);

export function stepFlight(s: SimState, w: World, input: InputFrame) {
  const f = s.flight, d = drone(s);
  if (!f) return;
  if (!d) { land(s, 'the drone is gone'); return; }
  // Its battery.
  d.charge = Math.max(0, (d.charge ?? 100) - (100 * DT) / FLIGHT.battery);
  if (d.charge <= 0) { takeStack(s.inv.pack, d.uid); land(s, 'Anna: the drone ran flat and came down. It\'s lost'); return; }
  // Flown: forward and across by the look, up and down by jump and crouch; stopped short of walls and the ground.
  f.yaw = input.yaw; f.pitch = input.pitch;
  const v = ((input.buttons & B.SPRINT) ? FLIGHT.fast : FLIGHT.speed) * DT, fx = -Math.sin(f.yaw), fz = -Math.cos(f.yaw);
  const step = { x: (fx * input.my + -fz * input.mx) * v, y: (((input.buttons & B.JUMP) ? 1 : 0) - ((input.buttons & B.CROUCH) ? 1 : 0)) * FLIGHT.climb * DT, z: (fz * input.my + fx * input.mx) * v };
  const L = Math.hypot(step.x, step.y, step.z);
  if (L > 0 && !raycast(w.index, f.x, f.y, f.z, step.x / L, step.y / L, step.z / L, L + 0.4)) { f.x += step.x; f.y += step.y; f.z += step.z; }
  const down = raycast(w.index, f.x, f.y, f.z, 0, -1, 0, 1);
  if (down) f.y += 1 - down.t;
  // What it flies over, on her map.
  if (s.tick % 15 === 0) {
    const ex = (s.explored ??= {});
    for (let dx = -FLIGHT.see; dx <= FLIGHT.see; dx += MAP.cell) for (let dz = -FLIGHT.see; dz <= FLIGHT.see; dz += MAP.cell) if (dx * dx + dz * dz <= FLIGHT.see * FLIGHT.see) ex[cellKey(f.x + dx, f.z + dz, 1)] = 1;
  }
  // The machines that can see it, ten times a second.
  if (s.tick % 6) return;
  let armed = false;
  for (const u of s.units) {
    if (isOff(s, u) || (u.reserve && !u.trip) || !sees(s, w, u)) continue;
    u.aware = Math.max(u.aware ?? 0, 0.5); u.seen = { x: f.x, y: f.y, z: f.z };
    if (UNITS[u.kind].weapon) armed = true;
  }
  f.seen = armed ? f.seen + 0.1 : 0;
  if (f.seen >= FLIGHT.shot) { takeStack(s.inv.pack, d.uid); s.events.push({ t: 'noise', x: f.x, y: f.y, z: f.z, r: 60, kind: 'gunfire' }); land(s, 'Anna: they shot the drone down'); }
}

/** Whether a machine has the drone in its cone, in range and in sight. */
function sees(s: SimState, w: World, u: SimState['units'][number]): boolean {
  const f = s.flight!, q = unitPose(w, u, s.time);
  if (!q.active || q.docked || u.kind === 'tripwire' || u.kind === 'pir' || u.kind === 'acoustic') return false;
  const S = SENSES[u.kind], range = daylight(s.time) > 0.5 ? S.day : S.night, ey = q.y + Math.max(0, S.eye);
  const dx = f.x - q.x, dy = f.y - ey, dz = f.z - q.z, L = Math.hypot(dx, dy, dz);
  if (L > range || L < 0.1) return false;
  const pc = Math.cos((S.pitch * Math.PI) / 180), ax = Math.sin(q.yaw) * pc, ay = -Math.sin((S.pitch * Math.PI) / 180), az = Math.cos(q.yaw) * pc;
  if ((dx * ax + dy * ay + dz * az) / L < Math.cos((S.fov * Math.PI) / 360)) return false;
  return !raycast(w.index, q.x, ey, q.z, dx / L, dy / L, dz / L, L - 0.5);
}
