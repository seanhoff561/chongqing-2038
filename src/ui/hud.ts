// The only on-screen interface during play: a centre dot, the name of what he looks at, the held item, a short notice
// of what just happened, and subtitles for Anna's story lines alone (U-104: English, one size); a ring round the dot
// filling while he works at something (U-051).
/** A subtitle: one of Anna's lines, in English, and its seconds. */
interface Sub { en: string; secs: number }

export class Hud {
  readonly root: HTMLDivElement;
  private prompt: HTMLDivElement;
  private held: HTMLDivElement;
  private ring: SVGCircleElement;
  private wrap: SVGSVGElement;
  readonly subs: HTMLDivElement;
  private note: HTMLDivElement;
  private noteLeft = 0;

  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'hud';
    this.root.innerHTML = `<div class="dot"></div><svg class="ring" viewBox="0 0 40 40"><circle class="track" cx="20" cy="20" r="15"/><circle class="fill" cx="20" cy="20" r="15" pathLength="1"/></svg><div class="prompt"></div><div class="held"></div><div class="notice"></div><div class="subs"></div>`;
    document.body.appendChild(this.root);
    this.prompt = this.root.querySelector('.prompt')!;
    this.held = this.root.querySelector('.held')!;
    this.subs = this.root.querySelector('.subs')!;
    this.note = this.root.querySelector('.notice')!;
    this.wrap = this.root.querySelector('.ring')!;
    this.ring = this.root.querySelector('.ring .fill')!;
    this.scope = document.createElement('div');
    this.scope.className = 'scope';
    this.root.appendChild(this.scope);
  }

  /** Looking through the 4x scope (U-058): its round view over the screen (no crosshair: U-079); or through the
   *  binoculars (M5-07), their two. */
  private scope: HTMLDivElement;
  setScope(on: boolean, binos = false) { const v = on ? 'block' : 'none', c = binos ? 'scope binos' : 'scope'; if (this.scope.style.display !== v) this.scope.style.display = v; if (this.scope.className !== c) this.scope.className = c; }
  /** The crosshair hidden for filming (U-104: settings in dev mode), whatever else. */
  private noDot = false;
  setCrosshair(on: boolean) { this.noDot = !on; this.setAiming(false); }
  /** Aiming down the sights or through the scope: the centre dot gone (U-079). */
  setAiming(on: boolean) { const d = this.root.querySelector<HTMLDivElement>('.dot')!, v = on || this.noDot ? 'none' : ''; if (d.style.display !== v) d.style.display = v; }

  private shown = -1;
  /** The ring: how far along what he's doing (0..1), or hidden (below 0). */
  setProgress(f: number) {
    const v = f < 0 ? -1 : Math.round(Math.min(1, f) * 100) / 100;
    if (v === this.shown) return;
    this.shown = v;
    this.wrap.style.display = v < 0 ? 'none' : 'block';
    if (v >= 0) this.ring.style.strokeDashoffset = String(1 - v);
  }

  private queue: Sub[] = [];
  private now?: Sub;
  private subShown = '';
  private left = 0;
  /** One of Anna's story lines, after any before it, each for as long as it takes to read. */
  say(en: string) { this.queue.push({ en, secs: 1.5 + en.length * 0.06 }); }
  /** A short notice of what just happened ('ladder up', 'no room'): at once, in place of the last, gone soon. */
  notice(text: string, secs = Math.min(2.5, 1.2 + text.length * 0.04)) { this.note.textContent = text; this.noteLeft = secs; }
  /** Every frame: the next subtitle when this one's time is up; the notice fading. */
  tick(dt: number) {
    if ((this.left -= dt) <= 0) { this.now = this.queue.shift(); this.left = this.now?.secs ?? 0; }
    const html = this.now ? this.now.en.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!) : '';
    if (this.subShown !== html) this.subs.innerHTML = this.subShown = html;
    if (this.noteLeft > 0 && (this.noteLeft -= dt) <= 0) this.note.textContent = '';
  }

  setPrompt(text: string) { if (this.prompt.textContent !== text) this.prompt.textContent = text; }
  setHeld(text: string) { if (this.held.textContent !== text) this.held.textContent = text; }
}
