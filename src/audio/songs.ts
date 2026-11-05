// His own songs (M10-17, U-104): the laptop's Songs app plays his, the city's own music silent while they do (U-107). In the desktop game
// they're the files in its songs folder (Documents/Chongqing 2038/songs, empty at first); in the browser, a folder he
// picks. They play in a random order, one after another, as background audio through the music bus (the master volume
// sets them), whatever he's doing; play, pause and skip, the song's name shown.
import type { Audio } from './audio';

declare global {
  interface Window {
    /** the desktop game's own (desktop/preload.cjs) */
    desktop?: { songs: () => Promise<string[]>; folder: (which: 'songs' | 'maps') => Promise<void> };
  }
}

/** What counts as a song. */
export const SONG = /\.(mp3|ogg|wav|m4a|flac|opus|aac)$/i;
export type Song = { name: string; url: string };

export class Songs {
  list: Song[] = [];
  /** the order they play in (shuffled each time round), and where in it he is */
  private order: number[] = [];
  private at = -1;
  playing = false;
  /** how many songs have started (for the tests) */
  started = 0;
  readonly el = new window.Audio();
  private wired = false;

  constructor(private a: Audio) {
    this.el.preload = 'auto';
    this.el.addEventListener('ended', () => this.skip());
    this.el.addEventListener('error', () => { if (this.playing && this.list.length > 1) this.skip(); });
  }

  /** The desktop game's songs folder, read again (it may have changed since). */
  async load() {
    const names = (await window.desktop?.songs().catch(() => [])) ?? [];
    if (names.length) this.set(names.filter(n => SONG.test(n)).map(n => ({ name: n, url: `songs/${encodeURIComponent(n)}` })));
  }

  /** Songs from a folder he's picked in the browser. */
  pick(files: FileList | File[]) {
    for (const s of this.list) if (s.url.startsWith('blob:')) URL.revokeObjectURL(s.url);
    this.set([...files].filter(f => SONG.test(f.name) || f.type.startsWith('audio/')).map(f => ({ name: f.name, url: URL.createObjectURL(f) })));
  }

  private set(list: Song[]) {
    const was = this.playing;
    this.pause();
    this.list = list; this.order = []; this.at = -1;
    if (was && list.length) this.play();
  }

  /** The song playing (or paused), if any. */
  current(): Song | null { return this.at >= 0 ? this.list[this.order[this.at]] ?? null : null; }

  play() {
    if (!this.list.length) return;
    this.wire();
    if (this.at < 0) { this.skip(); return; }
    this.playing = true;
    this.el.play().catch(() => {});
  }

  pause() { this.playing = false; this.el.pause(); }

  /** The next song (a new shuffle each time through them all). */
  skip() {
    const n = this.list.length;
    if (!n) return;
    this.wire();
    if (++this.at >= this.order.length) {
      const last = this.order[this.order.length - 1];
      this.order = [...Array(n).keys()];
      for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [this.order[i], this.order[j]] = [this.order[j], this.order[i]]; }
      // (Never the same song twice running across a reshuffle.)
      if (n > 1 && this.order[0] === last) [this.order[0], this.order[1]] = [this.order[1], this.order[0]];
      this.at = 0;
    }
    this.el.src = this.list[this.order[this.at]].url;
    this.playing = true;
    this.started++;
    this.el.play().catch(() => {});
  }

  /** Through the game's music bus, once its sound has started. */
  private wire() {
    if (this.wired || !this.a.ready) return;
    this.wired = true;
    this.a.ctx!.createMediaElementSource(this.el).connect(this.a.bus.music);
  }
}
