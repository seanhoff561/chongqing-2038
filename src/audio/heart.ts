// His heartbeat (M4-55, U-051, U-077, U-079): badly hurt, his sight going dark at the edges, his heart pounds in his
// ears, louder and faster the worse it is; otherwise it isn't heard. (No breathing: U-079, it was a long repeat.)
import type { Audio } from './audio';

/** How low his health must be (of 100) for his heart to be heard. */
export const BADLY = 30;

/** How his heart pounds, 0 to 1, by his health (of 100). */
export const heartOf = (hp: number) => { const hurt = Math.max(0, Math.min(1, (BADLY - hp) / 22)); return hurt > 0 ? Math.min(1, 0.35 + hurt) : 0; };

export class Heart {
  /** how it pounds just now */
  level = 0;
  private nextBeat = 0;
  constructor(private a: Audio) {}

  update(hp: number) {
    const L = (this.level = heartOf(hp)), a = this.a;
    if (!a.ready) return;
    const t = a.ctx!.currentTime;
    // Lub-dub, 60 a minute at the threshold to 170 at worst.
    if (t >= this.nextBeat) {
      this.nextBeat = t + 60 / (60 + 110 * L);
      if (L > 0.3) {
        const g = 0.35 * (L - 0.25) / 0.75;
        a.tone(t, 0.12, g, 62, 40, 'sine', a.bus.voice);
        a.tone(t + 0.14, 0.1, g * 0.7, 55, 38, 'sine', a.bus.voice);
      }
    }
  }
}
