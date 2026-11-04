// Anna's laptop (M5-01, DESIGN section 12): his scuffed laptop, Anna running on it. L opens and shuts it without
// stopping anything; open, its battery runs down (full lasts two game hours open) and at night its screen lights him
// (0.5); shut at a hideout with a charged car battery and an inverter (M5-27), it charges, a little off the battery.
import { B, type InputFrame, type SimState } from './types';
import { onCmd } from './commands';
import { GAME_PER_TICK } from './clock';
import { shelterAt } from './shelter';
import { powered } from './power';

/** Game seconds a full battery lasts open; the light its screen casts on him; a full charge's game seconds at a
 *  hideout, and what it takes from the car battery (percent). */
export const LAPTOP = { lasts: 8 * 3600, glow: 0.5, charge: 3 * 3600, draw: 4 };

onCmd((s, c) => {
  // Sitting down at it and getting up (focus, M10-13): only while it's out.
  if (c.c === 'act' && c.name === 'focus' && s.laptop?.open && !s.flight && !s.dead) { s.laptop.sit = !s.laptop.sit; return; }
  if (c.c !== 'act' || c.name !== 'laptop' || s.dead) return;
  const L = (s.laptop ??= { open: false, charge: 1 });
  if (!L.open && L.charge <= 0) { s.events.push({ t: 'msg', text: "the laptop's flat" }); return; }
  // (Taken out only on his feet, with his hands free of holds: U-104.)
  if (!L.open && (s.player.mode !== 'ground' || s.player.hands.some(h => h.grip))) return;
  L.open = !L.open;
  L.sit = false;
});

/** Holding the laptop up in both hands (U-104): no running, no jumping, nothing grabbed or used. Sat down at it
 *  (M10-13) he's low on the ground and goes nowhere. */
export function laptopHands(s: SimState, input: InputFrame): InputFrame {
  if (!s.laptop?.open) return input;
  if (s.laptop.sit) return { ...input, mx: 0, my: 0, buttons: B.CROUCH, pressed: 0, slot: -1 };
  const off = B.SPRINT | B.JUMP | B.USE | B.AIM;
  return { ...input, buttons: input.buttons & ~off, pressed: input.pressed & ~off };
}

export function stepLaptop(s: SimState) {
  const L = s.laptop;
  if (!L) return;
  if (L.open) {
    L.charge = Math.max(0, L.charge - GAME_PER_TICK / LAPTOP.lasts);
    if (L.charge <= 0) { L.open = false; L.sit = false; s.events.push({ t: 'msg', text: "the laptop's flat" }); }
    return;
  }
  // Shut, at a hideout whose car battery has charge: charging.
  const p = s.player.pos, h = L.charge < 1 ? shelterAt(s, p.x, p.y, p.z) : null;
  if (!powered(h)) return;
  const f = Math.min(1 - L.charge, GAME_PER_TICK / LAPTOP.charge);
  L.charge += f; h!.battery = Math.max(0, h!.battery - f * LAPTOP.draw);
}

/** The light his open laptop casts on him (nothing by day: it's lost in the daylight). */
export const laptopLight = (s: SimState) => (s.laptop?.open ? LAPTOP.glow : 0);
