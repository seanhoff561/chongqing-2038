// M9-05: save robustness. A save carries its version; a broken one or one from an older version is set aside (kept
// under its own key, the slot cleared) and said why, not crashed on; a good one loads.
import { describe, it, expect } from 'vitest';
import { setup, floor, run } from './helpers';
import { writeSave, readSave, SAVE_KEY, BAD_KEY, setAside } from '../../src/sim/save';
import { STATE_VERSION } from '../../src/sim/sim';

const shim = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m }; };

describe('save robustness (M9-05)', () => {
  it('sets aside a broken or old save and says why; loads a good one', () => {
    const st = shim();
    st.setItem(SAVE_KEY, '{"version": 3, "state": {"time": 1');
    expect(readSave(st)).toBeNull();
    expect(setAside).toBe('broken');
    expect(st.getItem(BAD_KEY)).toContain('"version": 3');
    expect(st.getItem(SAVE_KEY)).toBeNull();
    st.setItem(SAVE_KEY, JSON.stringify({ version: STATE_VERSION - 1, scenario: 'run', savedAt: 0, state: { time: 0 } }));
    expect(readSave(st)).toBeNull();
    expect(setAside).toMatch(/older version/);
    const { world, state } = setup([floor()]);
    run(state, world, 2);
    writeSave(st, 'run', state);
    const f = readSave(st)!;
    expect(f.version).toBe(STATE_VERSION);
    expect(setAside).toBeNull();
    expect(f.state.time).toBe(state.time);
  });
});
