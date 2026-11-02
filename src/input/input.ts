// Keyboard and mouse to per-tick input frames. Presses between ticks are kept until the next frame.
import { B, emptyInput, type InputFrame } from '../sim/types';
import type { Cmd } from '../sim/commands';

/** What he can do from the keyboard, rebindable in the settings (U-079): its buttons (none for walking) and its keys
 *  as they come. (Q lets go hanging on, and leans left on his feet: U-032.) */
export const ACTIONS: { id: string; label: string; bits: number; keys: string[] }[] = [
  { id: 'forward', label: '前 Forward', bits: 0, keys: ['KeyW'] }, { id: 'back', label: '后 Back', bits: 0, keys: ['KeyS'] },
  { id: 'left', label: '左 Left', bits: 0, keys: ['KeyA'] }, { id: 'right', label: '右 Right', bits: 0, keys: ['KeyD'] },
  { id: 'jump', label: '跳 Jump', bits: B.JUMP, keys: ['Space'] }, { id: 'sprint', label: '跑 Sprint', bits: B.SPRINT, keys: ['ShiftLeft', 'ShiftRight'] },
  { id: 'crouch', label: '蹲 Crouch', bits: B.CROUCH, keys: ['KeyC', 'ControlLeft', 'ControlRight'] }, { id: 'crawl', label: '爬 Crawl', bits: B.CRAWL, keys: ['KeyZ'] },
  { id: 'interact', label: '互动 Interact', bits: B.INTERACT, keys: ['KeyF'] }, { id: 'letgo', label: '放手/左探 Let go, lean left', bits: B.DROP | B.LEAN_L, keys: ['KeyQ'] },
  { id: 'leanR', label: '右探 Lean right', bits: B.LEAN_R, keys: ['KeyE'] }, { id: 'reload', label: '装弹 Reload', bits: B.RELOAD, keys: ['KeyR'] },
  { id: 'lamp', label: '头灯 Headlamp', bits: B.HEADLAMP, keys: ['KeyH'] }, { id: 'chimney', label: '撑墙 Chimney', bits: B.CHIMNEY, keys: ['KeyX'] },
  { id: 'sleep', label: '睡觉 Sleep rough', bits: B.SLEEP, keys: ['KeyB'] },
  // (Menus, not movement: rebindable too, U-097.)
  { id: 'laptop', label: '安娜的笔记本 Anna\'s laptop', bits: 0, keys: ['KeyL'] }, { id: 'pack', label: '背包 Backpack', bits: 0, keys: ['Tab'] },
];
/** Each action's keys just now. */
export const binds: Record<string, string[]> = Object.fromEntries(ACTIONS.map(a => [a.id, [...a.keys]]));
let KEYS: Record<string, number> = {};
/** The keys' buttons, from the bindings. */
function rebuild() { KEYS = {}; for (const a of ACTIONS) if (a.bits) for (const k of binds[a.id]) KEYS[k] = (KEYS[k] ?? 0) | a.bits; }
rebuild();
/** Bind an action to a key (taking it off any other action it was on). */
export function bindKey(id: string, code: string) {
  for (const a of ACTIONS) binds[a.id] = binds[a.id].filter(k => k !== code);
  binds[id] = [code];
  rebuild();
}
/** The bindings back to how they come. */
export function resetKeys() { for (const a of ACTIONS) binds[a.id] = [...a.keys]; rebuild(); }

export class Input {
  yaw = 0;
  pitch = 0;
  sensitivity = 0.0022;
  invertY = false;
  /** the laptop's open: the lean keys turn its pages (U-098) */
  tabKeys = false;
  /** UI (backpack, laptop, menus) takes the mouse; movement keys still work */
  uiOpen = false;
  private held = new Set<string>();
  private buttons = 0;
  private pressed = 0;
  /** held mouse buttons as USE/AIM bits */
  mouse = 0;
  private slot = -1;
  /** single-shot UI keys (Tab, L, Esc...) read by the game each frame */
  readonly uiKeys: string[] = [];
  /** commands from UI, delivered with the next frame */
  readonly cmds: Cmd[] = [];

  constructor(readonly el: HTMLElement) {
    addEventListener('keydown', e => this.key(e, true));
    addEventListener('keyup', e => this.key(e, false));
    addEventListener('blur', () => { this.held.clear(); this.buttons = 0; this.mouse = 0; });
    el.addEventListener('mousedown', e => {
      if (!this.uiOpen && document.pointerLockElement !== el) { this.capture(); return; }
      if (this.uiOpen) return;
      const bit = e.button === 0 ? B.USE : e.button === 2 ? B.AIM : 0;
      this.mouse |= bit; this.pressed |= bit;
    });
    addEventListener('mouseup', e => { this.mouse &= ~(e.button === 0 ? B.USE : e.button === 2 ? B.AIM : 0); });
    addEventListener('contextmenu', e => e.preventDefault());
    // (The mouse let go of, its buttons up: none left held down, aiming for good.)
    document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement !== el) this.mouse = 0; });
    addEventListener('mousemove', e => {
      if (document.pointerLockElement !== el) return;
      this.yaw -= e.movementX * this.sensitivity;
      this.pitch -= e.movementY * this.sensitivity * (this.invertY ? -1 : 1);
      this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch));
    });
  }

  /**
   * Capture the mouse. Ctrl is crouch (U-001) and Ctrl+W would close the tab: in fullscreen (his choice, F11; never
   * forced, U-059) the keyboard's locked where the browser allows it (D-014), and otherwise the page asks before it's
   * left while he plays (the beforeunload guard in main.ts).
   */
  capture() {
    const el = this.el;
    if (document.fullscreenElement) (navigator as Navigator & { keyboard?: { lock?: (k?: string[]) => Promise<void> } }).keyboard?.lock?.().catch(() => {});
    try { (el.requestPointerLock?.() as unknown as Promise<void> | undefined)?.catch?.(() => {}); } catch { /* not allowed without a gesture */ }
  }

  private key(e: KeyboardEvent, down: boolean) {
    if (e.ctrlKey && document.pointerLockElement) e.preventDefault();
    if (e.repeat) { if (['Tab', 'Space'].includes(e.code)) e.preventDefault(); return; }
    // (The laptop's and the backpack's keys as bound, by name; the laptop's pages on the arrows.)
    const ui = binds.laptop.includes(e.code) ? 'laptop' : binds.pack.includes(e.code) ? 'pack' : ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code) ? e.code : null;
    if (down && ui) { this.uiKeys.push(ui); e.preventDefault(); return; }
    // (The laptop open: its pages on the lean keys, Q and E by default, not leaning: U-098.)
    if (down && this.tabKeys && (binds.letgo.includes(e.code) || binds.leanR.includes(e.code))) { this.uiKeys.push(binds.letgo.includes(e.code) ? 'ArrowLeft' : 'ArrowRight'); return; }
    // (Enter for the laptop's Cams page, M5-09; not while typing in a box.)
    if (down && e.code === 'Enter' && !(e.target instanceof HTMLInputElement)) this.uiKeys.push(e.code);
    // ` always puts whatever he holds away (U-009).
    if (down && e.code === 'Backquote') { this.slot = 0; e.preventDefault(); return; }
    if (down && /^Digit[0-5]$/.test(e.code)) { this.slot = Number(e.code[5]); return; }
    if (['Space', 'Tab'].includes(e.code)) e.preventDefault();
    if (down) this.held.add(e.code); else this.held.delete(e.code);
    const bit = KEYS[e.code];
    if (bit === undefined) return;
    if (down) { this.buttons |= bit; this.pressed |= bit; }
    else if (!Object.entries(KEYS).some(([k, b]) => b === bit && this.held.has(k))) this.buttons &= ~bit;
  }

  /** The frame for the next tick; clears edge-triggered state. */
  frame(): InputFrame {
    const f = emptyInput();
    const any = (id: string) => (binds[id].some(k => this.held.has(k)) ? 1 : 0);
    f.my = any('forward') - any('back');
    f.mx = any('right') - any('left');
    f.yaw = this.yaw;
    f.pitch = this.pitch;
    f.buttons = this.buttons | this.mouse;
    f.pressed = this.pressed;
    f.slot = this.slot;
    if (this.cmds.length) f.cmds = this.cmds.splice(0);
    this.pressed = 0;
    this.slot = -1;
    return f;
  }
}
