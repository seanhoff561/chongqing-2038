// Anna (M10-18, U-104): the AI on his laptop, drawn as a small anime girl in its corner: straight black hair to her
// shoulders with a straight fringe, a white collared shirt with an ice-blue tie, big dark eyes. Her poses are drawn
// frames switched like a gif: idle (breathing, blinking now and then), waving, laughing, pouting with her arms crossed,
// and blushing red. Each frame is an SVG (100 by 130).

export type Pose = 'idle' | 'blink' | 'wave' | 'laugh' | 'pout' | 'blush';

const SKIN = '#f6dccb', SHADE = '#e9c3ae', HAIR = '#15171c', HAIR_HI = '#2c3340', SHIRT = '#f4f6f8', SHIRT_SH = '#cfd6dd', TIE = '#7fc4e0', LINE = '#3a2a26';

type Face = { eyes: 'open' | 'shut' | 'happy' | 'cross' | 'shy'; mouth: 'smile' | 'open' | 'pout' | 'small' | 'wobble'; brows: 'calm' | 'up' | 'angry' | 'worried'; cheeks: number; red?: boolean; puff?: boolean };
type Arms = 'down' | 'wave1' | 'wave2' | 'crossed';

function eyes(e: Face['eyes']) {
  if (e === 'shut') return `<path d="M34 57q6 3 12 0M54 57q6 3 12 0" stroke="${LINE}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  if (e === 'happy') return `<path d="M34 58q6-6 12 0M54 58q6-6 12 0" stroke="${LINE}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  const one = (x: number) => {
    const look = e === 'shy' ? 2 : 0, h = e === 'cross' ? 5 : 6.5;
    return `<ellipse cx="${x}" cy="57" rx="5.6" ry="${h}" fill="#fff"/>` +
      `<ellipse cx="${x + look}" cy="${57.6}" rx="4.2" ry="${h - 0.8}" fill="#2b4f63"/><ellipse cx="${x + look}" cy="58.6" rx="2.4" ry="${h - 2.6}" fill="#0f1c24"/>` +
      `<circle cx="${x + look - 1.6}" cy="55" r="1.5" fill="#fff"/><circle cx="${x + look + 1.5}" cy="60" r="0.8" fill="#bfe6f5"/>` +
      `<path d="M${x - 6.2} ${57 - h + 0.6}q6.2-3.4 12.4 0" stroke="${LINE}" stroke-width="2" fill="none" stroke-linecap="round"/>` +
      (e === 'cross' ? `<path d="M${x - 6} ${52.6}l12 1.6" stroke="${SKIN}" stroke-width="3"/>` : '');
  };
  return one(40) + one(60);
}

function brows(b: Face['brows']) {
  const d = { calm: ['M34 47q6-2.5 11 0', 'M55 47q5-2.5 11 0'], up: ['M34 45q6-3.5 11-0.5', 'M55 44.5q5-3 11 0.5'], angry: ['M34 46l11 3', 'M66 46l-11 3'], worried: ['M34 48l11-2.5', 'M66 48l-11-2.5'] }[b];
  return d.map(p => `<path d="${p}" stroke="${HAIR}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`).join('');
}

function mouth(m: Face['mouth']) {
  if (m === 'open') return `<path d="M45 70q5 7 10 0z" fill="#b5544f"/><path d="M47 72.5q3 2.2 6 0" fill="#e58c86"/>`;
  if (m === 'pout') return `<path d="M47.5 72q2.5-2 5 0" stroke="${LINE}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  if (m === 'small') return `<path d="M48 71q2 1 4 0" stroke="${LINE}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
  if (m === 'wobble') return `<path d="M46 71.5q1.5-1.5 3 0t3 0t3 0" stroke="${LINE}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
  return `<path d="M46 70.5q4 3 8 0" stroke="${LINE}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
}

function arms(a: Arms) {
  const hand = (x: number, y: number) => `<ellipse cx="${x}" cy="${y}" rx="4.6" ry="5.2" fill="${SKIN}" stroke="${SHADE}" stroke-width="0.6"/>`;
  if (a === 'crossed') return `<path d="M24 116q26-12 52 0l-2 8q-24-9-48 0z" fill="${SHIRT}" stroke="${SHIRT_SH}" stroke-width="0.8"/>` +
    `<path d="M76 110q-26 10-52 0l2 8q24 8 48 0z" fill="${SHIRT}" stroke="${SHIRT_SH}" stroke-width="0.8"/>` + hand(25, 113) + hand(75, 119);
  if (a === 'wave1' || a === 'wave2') {
    // (Her right arm up from the shoulder, the hand open, swinging between two frames.)
    const [ex, ey, hx, hy] = a === 'wave1' ? [84, 94, 85, 72] : [87, 95, 93, 75];
    const arm = (c: string, w: number) => `<path d="M70 106L${ex} ${ey}L${hx} ${hy + 5}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    return arm(SHIRT_SH, 11) + arm(SHIRT, 9) + hand(hx, hy) +
      `<path d="M${hx - 3} ${hy - 4}l-1-5M${hx} ${hy - 5}v-5.5M${hx + 3} ${hy - 4}l1-5M${hx + 5} ${hy}l3-2" stroke="${SKIN}" stroke-width="2.2" stroke-linecap="round"/>`;
  }
  return '';
}

/** One frame of her: her face and arms, breathing up (1) or down (0). */
function frame(f: Face, a: Arms, breath = 0) {
  const dy = breath ? -0.6 : 0, red = f.red ? `<ellipse cx="50" cy="58" rx="23" ry="20" fill="#ff6a6a" opacity="0.28"/>` : '';
  const cheeks = f.cheeks ? `<ellipse cx="35" cy="66" rx="5" ry="2.6" fill="#ff8a96" opacity="${f.cheeks}"/><ellipse cx="65" cy="66" rx="5" ry="2.6" fill="#ff8a96" opacity="${f.cheeks}"/>` +
    (f.cheeks > 0.6 ? `<path d="M32 65l2-2M35 65.4l2-2M38 65l2-2M61 65l2-2M64 65.4l2-2M67 65l2-2" stroke="#e25d6c" stroke-width="0.8"/>` : '') : '';
  const puff = f.puff ? `<path d="M27 64q-2 6 3 10M73 64q2 6-3 10" stroke="${SHADE}" stroke-width="1" fill="none"/>` : '';
  return `<svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0 ${dy})">` +
    // Her hair behind, straight to her shoulders.
    `<path d="M23 50q-2 26 -3 42q8 5 14 3l-1-26M77 50q2 26 3 42q-8 5-14 3l1-26" fill="${HAIR}"/>` +
    `<path d="M26 44q24-30 48 0v40H26z" fill="${HAIR}"/>` +
    // Her shirt, its collar and tie; her neck.
    `<path d="M14 130q2-28 22-34l14 6 14-6q20 6 22 34z" fill="${SHIRT}" stroke="${SHIRT_SH}" stroke-width="0.8"/>` +
    `<rect x="44" y="76" width="12" height="20" rx="4" fill="${SHADE}"/>` +
    `<path d="M36 96l14 7-6 7zM64 96l-14 7 6 7z" fill="#fff" stroke="${SHIRT_SH}" stroke-width="0.8"/>` +
    `<path d="M48 104h4l1.6 4-3.6 18-3.6-18z" fill="${TIE}"/>` +
    // Her face.
    `<ellipse cx="50" cy="56" rx="24" ry="26" fill="${SKIN}"/>${red}${puff}` +
    eyes(f.eyes) + brows(f.brows) + `<path d="M50 63l-1 3h2" stroke="${SHADE}" stroke-width="0.8" fill="none"/>` + mouth(f.mouth) + cheeks +
    // Her fringe, cut straight, and the locks by her face.
    `<path d="M25 52q-1-28 25-29q26 1 25 29q-3-6-4-10l-1 6q-3-6-4-9l-1 5q-6-4-8-9q-3 6-9 9l-1-6q-2 4-5 8l-1-6q-2 5-4 8z" fill="${HAIR}"/>` +
    `<path d="M32 30q10-6 22-5" stroke="${HAIR_HI}" stroke-width="2" fill="none" stroke-linecap="round"/>` +
    `<path d="M26 48q-1 20 2 36l5-1q-3-16-2-33zM74 48q1 20-2 36l-5-1q3-16 2-33z" fill="${HAIR}"/>` +
    arms(a) + `</g></svg>`;
}

const CALM: Face = { eyes: 'open', mouth: 'smile', brows: 'calm', cheeks: 0.25 };

/** Each pose's frames and how long each shows (s), round and round. */
export const POSES: Record<Pose, { frames: string[]; secs: number }> = {
  idle: { frames: [frame(CALM, 'down', 0), frame(CALM, 'down', 1)], secs: 1.4 },
  blink: { frames: [frame({ ...CALM, eyes: 'shut' }, 'down')], secs: 0.14 },
  wave: { frames: [frame({ ...CALM, eyes: 'happy', mouth: 'open', brows: 'up' }, 'wave1'), frame({ ...CALM, eyes: 'happy', mouth: 'open', brows: 'up' }, 'wave2')], secs: 0.28 },
  laugh: { frames: [frame({ eyes: 'happy', mouth: 'open', brows: 'up', cheeks: 0.45 }, 'down', 0), frame({ eyes: 'happy', mouth: 'open', brows: 'up', cheeks: 0.45 }, 'down', 1)], secs: 0.16 },
  pout: { frames: [frame({ eyes: 'cross', mouth: 'pout', brows: 'angry', cheeks: 0.5, puff: true }, 'crossed', 0), frame({ eyes: 'cross', mouth: 'pout', brows: 'angry', cheeks: 0.5, puff: true }, 'crossed', 1)], secs: 0.9 },
  blush: { frames: [frame({ eyes: 'shy', mouth: 'wobble', brows: 'worried', cheeks: 0.9, red: true }, 'down', 0), frame({ eyes: 'shy', mouth: 'wobble', brows: 'worried', cheeks: 0.9, red: true }, 'down', 1)], secs: 0.35 },
};

/** Her in the corner: a pose for a while (then back to idle), blinking now and then while idle. */
export class Anna {
  readonly el = document.createElement('div');
  private pose: Pose = 'idle';
  private until = 0;
  private t = 0;
  private nextBlink = 3;
  private shown = '';

  constructor() { this.el.className = 'lt-anna'; }

  /** Shows a pose for some seconds (then idle again). */
  set(pose: Pose, secs = 3) { this.pose = pose; this.until = this.t + secs; }
  get now() { return this.pose; }

  update(dt: number) {
    this.t += dt;
    if (this.pose !== 'idle' && this.pose !== 'blink' && this.t >= this.until) this.pose = 'idle';
    // (Idle, she blinks every few seconds.)
    if (this.pose === 'idle' && this.t >= this.nextBlink) { this.pose = 'blink'; this.until = this.t + POSES.blink.secs; this.nextBlink = this.t + 2.5 + ((this.t * 7.13) % 3); }
    if (this.pose === 'blink' && this.t >= this.until) this.pose = 'idle';
    const P = POSES[this.pose], svg = P.frames[Math.floor(this.t / P.secs) % P.frames.length];
    if (svg !== this.shown) { this.el.innerHTML = svg; this.shown = svg; }
  }
}
