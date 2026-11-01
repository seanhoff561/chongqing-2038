// His breath and heartbeat (M4-55, U-051). Spent (his grip worn out, or running and climbing hard), hurt, or
// terrified, he breathes hard and his heart pounds in his ears, louder and faster the worse it is; calm and whole,
// neither is heard.
import type { Audio } from './audio';

/** His effort: up while he runs hard or hangs and climbs, down at rest (a second's worth each way). */
export const EFFORT = { rise: 0.12, fall: 0.06, run: 5 };

/** Effort eased: sprinting (faster than EFFORT.run m/s) or holding on, up; otherwise down. */
export function stepEffort(effort: number, dt: number, speed: number, holding: boolean): number {
  return speed > EFFORT.run || holding ? Math.min(1, effort + EFFORT.rise * dt) : Math.max(0, effort - EFFORT.fall * dt);
}

/** How hard he breathes and how his heart pounds, 0 to 1: from his grip's endurance (of 100), his health (of 100),
 *  the city's alert (0 to 1) and his effort. */
export function strainOf(endurance: number, hp: number, alert: number, effort: number) {
  const spent = Math.max(effort, 1 - endurance / 100), hurt = Math.max(0, Math.min(1, (60 - hp) / 50)), fear = alert;
  return { breath: Math.min(1, Math.max(spent, hurt * 0.7, fear * 0.6)), heart: Math.min(1, Math.max(hurt, fear * 0.85, spent * 0.6)) };
}

export class Breath {
  /** the levels just now */
  level = { breath: 0, heart: 0 };
  effort = 0;
  private nextBreath = 0;
  private nextBeat = 0;
  private inhale = true;
  constructor(private a: Audio) {}

  update(dt: number, endurance: number, hp: number, alert: number, speed: number, holding: boolean) {
    this.effort = stepEffort(this.effort, dt, speed, holding);
    const L = (this.level = strainOf(endurance, hp, alert, this.effort)), a = this.a;
    if (!a.ready) return;
    const t = a.ctx!.currentTime;
    // Breaths: in and out, quicker and louder the harder; nothing heard while he's easy.
    if (t >= this.nextBreath) {
      const rate = 0.3 + 0.9 * L.breath, half = 1 / rate / 2;
      this.nextBreath = t + half;
      if (L.breath > 0.25) {
        const g = 0.09 * (L.breath - 0.2) / 0.8;
        if (this.inhale) a.noise(t, half * 0.8, g * 0.8, 'bandpass', 1300, 1.2, 1700, a.bus.voice);
        else a.noise(t, half * 0.7, g, 'bandpass', 900, 1.1, 600, a.bus.voice);
      }
      this.inhale = !this.inhale;
    }
    // The heart: lub-dub, 60 a minute calm to 170 at worst; heard from a third of the way up.
    if (t >= this.nextBeat) {
      this.nextBeat = t + 60 / (60 + 110 * L.heart);
      if (L.heart > 0.3) {
        const g = 0.35 * (L.heart - 0.25) / 0.75;
        a.tone(t, 0.12, g, 62, 40, 'sine', a.bus.voice);
        a.tone(t + 0.14, 0.1, g * 0.7, 55, 38, 'sine', a.bus.voice);
      }
    }
  }
}
