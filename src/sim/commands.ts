// UI commands (backpack moves, hotbar binds, item use) travel in input frames so the sim stays authoritative.
import type { SimState } from './types';
import type { World } from '../world/world';
import type { Grid } from './inventory';
import { moveStack, quickMove } from './inventory';

export type Cmd =
  | { c: 'move'; from: string; to: string; uid: number; x: number; y: number; rot: boolean }
  | { c: 'bind'; slot: number; uid: number | null }
  | { c: 'use'; uid: number }
  | { c: 'drop'; uid: number }
  | { c: 'quick'; from: string; uid: number }
  | { c: 'fit'; uid: number; onto: number }
  | { c: 'strip'; uid: number }
  | { c: 'takeall' }
  | { c: 'act'; name: string; arg?: string | number };

/** 'pack' or a container id. */
export function gridRef(s: SimState, ref: string): Grid | null {
  return ref === 'pack' ? s.inv.pack : s.containers[ref] ?? null;
}

type Handler = (s: SimState, cmd: Cmd, w: World) => void;
const handlers: Handler[] = [];
/** Other systems (use, drop, crafting) register here. */
export const onCmd = (h: Handler) => { handlers.push(h); };

export function applyCmds(s: SimState, w: World, cmds: Cmd[] | undefined) {
  if (!cmds) return;
  for (const cmd of cmds) {
    if (cmd.c === 'move') {
      const from = gridRef(s, cmd.from), to = gridRef(s, cmd.to);
      if (from && to && (cmd.to === 'pack' || cmd.from === 'pack' || cmd.from === cmd.to || s.openContainer === cmd.to || s.openContainer === cmd.from)) moveStack(from, to, cmd.uid, cmd.x, cmd.y, cmd.rot);
    } else if (cmd.c === 'quick' && s.openContainer) {
      // Shift-click: across to the other side, the backpack or the open container (M4-71).
      const from = cmd.from === 'pack' || cmd.from === s.openContainer ? gridRef(s, cmd.from) : null, to = gridRef(s, cmd.from === 'pack' ? s.openContainer : 'pack');
      if (from && to) quickMove(from, to, cmd.uid);
    } else if (cmd.c === 'takeall' && s.openContainer) {
      const g = gridRef(s, s.openContainer);
      if (g) for (const st of [...g.items]) quickMove(g, s.inv.pack, st.uid);
    } else if (cmd.c === 'bind') {
      if (cmd.slot >= 0 && cmd.slot < s.inv.hotbar.length) {
        s.inv.hotbar = s.inv.hotbar.map(u => (u === cmd.uid ? null : u));
        s.inv.hotbar[cmd.slot] = cmd.uid;
      }
    }
    for (const h of handlers) h(s, cmd, w);
  }
}
