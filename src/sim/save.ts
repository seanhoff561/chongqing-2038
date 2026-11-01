// The ironman save: one slot, written when he wakes, deleted when he dies. Storage is injected so tests can use a shim.
// One that can't be read (an older version's, or broken) is set aside under its own key and said so (M9-05).
import type { SimState } from './types';
import { STATE_VERSION } from './sim';

export interface Storage { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }
export interface SaveFile { version: number; scenario: string; savedAt: number; state: SimState }

export const SAVE_KEY = 'cq2038.save';
/** Things renamed since a save may have been written (U-053: the climbing gloves are a chalk bag now). */
const RENAMED: Record<string, string> = { gloves: 'chalk' };

export function writeSave(st: Storage, scenario: string, state: SimState) {
  const f: SaveFile = { version: STATE_VERSION, scenario, savedAt: state.time, state };
  st.setItem(SAVE_KEY, JSON.stringify(f));
}

/** Where a save that can't be read is set aside (M9-05), and why the last one was. */
export const BAD_KEY = 'cq2038.save.bad';
export let setAside: string | null = null;

/** A save that can't be used: kept under BAD_KEY, out of the way, with why. */
function aside(st: Storage, raw: string, why: string) {
  st.setItem(BAD_KEY, raw); st.removeItem(SAVE_KEY);
  setAside = why;
  return null;
}

/** The save, or null if there is none or it can't be read (one from an older version, or broken, set aside). */
export function readSave(st: Storage): SaveFile | null {
  setAside = null;
  const raw = st.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const f = JSON.parse(raw) as SaveFile;
    if (!f || !f.state) return aside(st, raw, 'broken');
    if (f.version !== STATE_VERSION) return aside(st, raw, `from an older version (${f.version ?? '?'})`);
    const s = f.state;
    for (const k of [...s.inv.pack.items, ...Object.values(s.containers).flatMap(g => g.items), ...(s.dropped ?? []).map(d => d.stack)]) k.id = RENAMED[k.id] ?? k.id;
    return f;
  } catch {
    return aside(st, raw, 'broken');
  }
}

export const deleteSave = (st: Storage) => st.removeItem(SAVE_KEY);
