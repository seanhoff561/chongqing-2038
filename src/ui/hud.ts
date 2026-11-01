// The only on-screen interface during play: a centre dot, context prompts, the held item and subtitles; a ring round
// the dot filling while he works at something (U-051).
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

  /** Looking through the 4x scope (U-058): its round view and crosshair over the screen. */
  private scope: HTMLDivElement;
  setScope(on: boolean) { const v = on ? 'block' : 'none'; if (this.scope.style.display !== v) this.scope.style.display = v; }

  private shown = -1;
  /** The ring: how far along what he's doing (0..1), or hidden (below 0). */
  setProgress(f: number) {
    const v = f < 0 ? -1 : Math.round(Math.min(1, f) * 100) / 100;
    if (v === this.shown) return;
    this.shown = v;
    this.wrap.style.display = v < 0 ? 'none' : 'block';
    if (v >= 0) this.ring.style.strokeDashoffset = String(1 - v);
  }

  private queue: { html: string; secs: number }[] = [];
  private left = 0;
  /** Subtitles: a line of dialogue (its speaker, Chinese over English) or a short message, one after another, each
   *  for as long as it takes to read. */
  say(zh: string, en: string, speaker = '') {
    const esc = (t: string) => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
    const html = `${speaker ? `<b>${esc(speaker)}</b> ` : ''}${esc(zh)}${en ? `<br><span>${esc(en)}</span>` : ''}`;
    // A short message takes the place of the one showing, at once, and goes soon (U-077); lines of dialogue queue.
    if (!speaker && !en) { this.queue = [{ html, secs: Math.min(2.5, 1 + [...zh].length * 0.03) }]; this.left = 0; return; }
    this.queue.push({ html, secs: 1.5 + [...zh].length * 0.18 });
  }
  /** Every frame: the next subtitle when this one's time is up. */
  tick(dt: number) {
    if ((this.left -= dt) > 0) return;
    const next = this.queue.shift();
    this.left = next?.secs ?? 0;
    const html = next?.html ?? '';
    if (this.subs.innerHTML !== html) this.subs.innerHTML = html;
  }

  setPrompt(text: string) { if (this.prompt.textContent !== text) this.prompt.textContent = text; }
  setHeld(text: string) { if (this.held.textContent !== text) this.held.textContent = text; }
}
