// The only on-screen interface during play: a centre dot, context prompts, the held item and subtitles; a ring round
// the dot filling while he works at something (U-051).
/** A subtitle: a line of dialogue (its speaker, Chinese and English) or a short message, and its seconds. */
interface Sub { zh: string; en: string; speaker: string; secs: number }

export class Hud {
  readonly root: HTMLDivElement;
  private prompt: HTMLDivElement;
  private held: HTMLDivElement;
  private ring: SVGCircleElement;
  private wrap: SVGSVGElement;
  readonly subs: HTMLDivElement;

  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'hud';
    this.root.innerHTML = `<div class="dot"></div><svg class="ring" viewBox="0 0 40 40"><circle class="track" cx="20" cy="20" r="15"/><circle class="fill" cx="20" cy="20" r="15" pathLength="1"/></svg><div class="prompt"></div><div class="held"></div><div class="subs"></div>`;
    document.body.appendChild(this.root);
    this.prompt = this.root.querySelector('.prompt')!;
    this.held = this.root.querySelector('.held')!;
    this.subs = this.root.querySelector('.subs')!;
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
  /** Subtitles: a line of dialogue (its speaker, Chinese over English) or a short message, one after another, each
   *  for as long as it takes to read. */
  /** Which language the lines of dialogue show in, and how big (M8-04, settings.ts). */
  subLang: 'both' | 'zh' | 'en' = 'both';
  subSize = 1;
  say(zh: string, en: string, speaker = '') {
    // A short message takes the place of the one showing, at once, and goes soon (U-077); lines of dialogue queue.
    if (!speaker && !en) { this.queue = [{ zh, en, speaker, secs: Math.min(2.5, 1 + [...zh].length * 0.03) }]; this.left = 0; return; }
    this.queue.push({ zh, en, speaker, secs: 1.5 + [...zh].length * 0.18 });
  }
  /** Every frame: the next subtitle when this one's time is up, drawn in the language and size set just now. */
  tick(dt: number) {
    if ((this.left -= dt) <= 0) { this.now = this.queue.shift(); this.left = this.now?.secs ?? 0; }
    const n = this.now, esc = (t: string) => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
    // (A line of dialogue in the language chosen: Chinese, English or both; a short message as it is.)
    const line = !n ? '' : !n.en || this.subLang === 'both' ? `${esc(n.zh)}${n.en ? `<br><span>${esc(n.en)}</span>` : ''}` : this.subLang === 'zh' ? esc(n.zh) : `<span>${esc(n.en)}</span>`;
    const html = n?.speaker ? `<b>${esc(n.speaker)}</b> ${line}` : line;
    if (this.subShown !== html) this.subs.innerHTML = this.subShown = html;
    const size = `${this.subSize}`;
    if (this.subs.style.getPropertyValue('--sub') !== size) this.subs.style.setProperty('--sub', size);
  }

  setPrompt(text: string) { if (this.prompt.textContent !== text) this.prompt.textContent = text; }
  setHeld(text: string) { if (this.held.textContent !== text) this.held.textContent = text; }
}
