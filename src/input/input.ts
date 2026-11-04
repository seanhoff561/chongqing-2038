// Keyboard and mouse to per-tick input frames. Presses between ticks are kept until the next frame.
import { B, emptyInput, type InputFrame } from '../sim/types';
import type { Cmd } from '../sim/commands';

/** The twelve actions he can rebind (U-104, word for word): their buttons, keys as they come (mouse buttons 4 and 5 as
 *  Mouse4 and Mouse5). Walking (WASD) and jumping (Space) are fixed, never rebound. */
export const ACTIONS: { id: string; label: string; bits: number; keys: string[] }[] = [
  { id: 'sprint', label: '冲刺 Sprint', bits: B.SPRINT, keys: ['ShiftLeft', 'ShiftRight'] },
  { id: 'crouch', label: '蹲下 Crouch', bits: B.CROUCH, keys: ['ControlLeft', 'ControlRight'] },
  { id: 'crawl', label: '爬行 Crawl', bits: B.CRAWL, keys: ['KeyC'] },
  { id: 'interact', label: '互动 Interact', bits: B.INTERACT, keys: ['KeyE'] },
  { id: 'leanL', label: '左探/左页 Lean/Tab Left', bits: B.LEAN_L, keys: ['Mouse4'] },
  { id: 'leanR', label: '右探/右页 Lean/Tab Right', bits: B.LEAN_R, keys: ['Mouse5'] },
  { id: 'reload', label: '装弹 Reload', bits: B.RELOAD, keys: ['KeyR'] },
  { id: 'lamp', label: '头灯/专注 Headlamp/Focus Laptop', bits: B.HEADLAMP, keys: ['KeyQ'] },
  { id: 'chimney', label: '撑墙 Chimney', bits: B.CHIMNEY, keys: ['KeyX'] },
  { id: 'sleep', label: '露宿 Sleep Rough', bits: B.SLEEP, keys: ['KeyZ'] },
  { id: 'laptop', label: '笔记本 Laptop', bits: 0, keys: ['Tab'] },
  { id: 'pack', label: '背包 Backpack', bits: 0, keys: ['AltLeft', 'AltRight'] },
];
/** The fixed keys: walking and the jump. */
const FIXED: Record<string, string[]> = { forward: ['KeyW'], back: ['KeyS'], left: ['KeyA'], right: ['KeyD'], jump: ['Space'] };
/** Each action's keys just now. */
export const binds: Record<string, string[]> = Object.fromEntries(ACTIONS.map(a => [a.id, [...a.keys]]));
let KEYS: Record<string, number> = {};
/** The keys' buttons, from the bindings. */
function rebuild() { KEYS = { Space: B.JUMP }; for (const a of ACTIONS) if (a.bits) for (const k of binds[a.id]) KEYS[k] = (KEYS[k] ?? 0) | a.bits; }
rebuild();
/** Bind an action to a key or mouse button (taking it off any other action it was on); never a fixed key. */
export function bindKey(id: string, code: string) {
  if (Object.values(FIXED).some(ks => ks.includes(code)) || !binds[id]) return;
  for (const a of ACTIONS) binds[a.id] = binds[a.id].filter(k => k !== code);
  binds[id] = [code];
  rebuild();
}
/** The bindings back to how they come. */
export function resetKeys() { for (const a of ACTIONS) binds[a.id] = [...a.keys]; rebuild(); }
/** A mouse button's own name: 4 and 5 (the browser's 3 and 4, back and forward). */
export const mouseCode = (button: number) => (button === 3 ? 'Mouse4' : button === 4 ? 'Mouse5' : null);

export class Input {
  yaw = 0;
  pitch = 0;
  /** radians of turn per pixel of mouse movement (U-104: a fairly low default) */
  sensitivity = 0.0016;
  /** the laptop's out: the lean keys turn its pages (U-098), the headlamp's key sits him down at it (M10-13) */
  tabKeys = false;
  /** UI (backpack, laptop, menus) takes the mouse; movement keys still work */
  uiOpen = false;
  /** the settings or the main menu up (U-104): none of his input reaches the game */
  frozen = false;
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
    // Mouse buttons 4 and 5 act as keys (U-104), and never take the browser back or forward.
    const side = (e: MouseEvent, down: boolean) => { const code = mouseCode(e.button); if (!code) return; e.preventDefault(); if (!this.uiOpen || !down) this.press(code, down); };
    addEventListener('mousedown', e => side(e, true), true);
    addEventListener('mouseup', e => side(e, false), true);
    addEventListener('auxclick', e => { if (mouseCode(e.button)) e.preventDefault(); }, true);
    addEventListener('contextmenu', e => e.preventDefault());
    // (The mouse let go of, its buttons up: none left held down, aiming for good.)
    document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement !== el) this.mouse = 0; });
    // (A lock asked for as a menu closed that lands after another's opened is let go again: U-105.)
    document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement === el && (this.uiOpen || this.frozen)) document.exitPointerLock(); });
    addEventListener('mousemove', e => {
      if (document.pointerLockElement !== el || this.frozen) return;
      this.yaw -= e.movementX * this.sensitivity;
      this.pitch -= e.movementY * this.sensitivity;
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
    // (Alt is the backpack, never the browser's menu; Tab the laptop, never the next field; a space typed on the
    // laptop is a space.)
    const typing = !!(e.target as HTMLElement | null)?.closest?.('input, textarea');
    if (['Tab', 'AltLeft', 'AltRight'].includes(e.code) || (e.code === 'Space' && !typing)) e.preventDefault();
    if (e.repeat || typing) return;
    this.press(e.code, down);
  }

  /** A key or mouse button 4 or 5 going down or up. */
  private press(code: string, down: boolean) {
    // (The laptop's and the backpack's keys as bound, by name; the laptop's pages on the arrows.)
    const ui = binds.laptop.includes(code) ? 'laptop' : binds.pack.includes(code) ? 'pack' : ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(code) ? code : null;
    if (down && ui) { this.uiKeys.push(ui); return; }
    // (The laptop out: its pages on the lean keys, not leaning: U-098.)
    if (down && this.tabKeys && (binds.leanL.includes(code) || binds.leanR.includes(code))) { this.uiKeys.push(binds.leanL.includes(code) ? 'ArrowLeft' : 'ArrowRight'); return; }
    // (And Q, the headlamp's key, sits him down at it and stands him up: M10-13.)
    if (this.tabKeys && binds.lamp.includes(code)) { if (down) this.uiKeys.push('focus'); return; }
    // (Enter for the laptop's Cams page, M5-09.)
    if (down && code === 'Enter') this.uiKeys.push(code);
    // ` always puts whatever he holds away (U-009).
    if (down && code === 'Backquote') { this.slot = 0; return; }
    if (down && /^Digit[0-5]$/.test(code)) { this.slot = Number(code[5]); return; }
    if (down) this.held.add(code); else this.held.delete(code);
    const bit = KEYS[code];
    if (bit === undefined) return;
    if (down) { this.buttons |= bit; this.pressed |= bit; }
    else if (!Object.entries(KEYS).some(([k, b]) => b === bit && this.held.has(k))) this.buttons &= ~bit;
  }

  /** The frame for the next tick; clears edge-triggered state. */
  frame(): InputFrame {
    const f = emptyInput();
    if (this.frozen) { f.yaw = this.yaw; f.pitch = this.pitch; this.pressed = 0; this.slot = -1; return f; }
    const any = (id: string) => (FIXED[id].some(k => this.held.has(k)) ? 1 : 0);
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
