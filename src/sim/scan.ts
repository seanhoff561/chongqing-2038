// Scanning (M5-04, DESIGN section 12): with the laptop open, whatever he looks at for two seconds Anna identifies: a
// machine in his sight (within 40 m), a thing lying in front of him, or, with nothing else before him, what he holds.
// What's been scanned is kept; the last one is what her Scan page shows. Food scanned has its date read (M5-05);
// a machine scanned disabled, its kind's weak points (M5-12).
import type { SimState } from './types';
import type { World } from '../world/world';
import { DT } from './types';
import { aimAt } from './damage';
import { lookTarget } from './interact';
import { heldStack } from './use';
import type { Stack } from './inventory';
import { item } from '../data/items';
import { isOff } from './units';
import type { UnitKind } from '../data/units';

/** Real seconds he has to look, and how far off a machine can be. */
export const SCAN = { secs: 2, reach: 40 };

/** What he's looking at to scan ('unit:<kind>' or 'item:<id>'), the very stack when it's a thing, and the machine's
 *  kind when it's one disabled (shut down, or a wreck at his feet: M5-12). */
function looked(s: SimState, w: World): { key: string; stack?: Stack; down?: UnitKind } | null {
  const a = aimAt(s, w, SCAN.reach);
  if (a) return { key: `unit:${a.u.kind}`, down: isOff(s, a.u) ? a.u.kind : undefined };
  const it = lookTarget(s, w), wreck = it?.id.startsWith('wreck:') ? s.units.find(u => `wreck:${u.id}` === it.id) : undefined;
  if (wreck) return { key: `unit:${wreck.kind}`, down: wreck.kind };
  if (it?.kind === 'pickup') { const d = s.dropped.find(q => `drop:${q.stack.uid}` === it.id); if (d) return { key: `item:${d.stack.id}`, stack: d.stack }; }
  const held = heldStack(s);
  return held ? { key: `item:${held.id}`, stack: held } : null;
}
export const scanTarget = (s: SimState, w: World) => looked(s, w)?.key ?? null;

export function stepScan(s: SimState, w: World) {
  if (!s.laptop?.open) { s.scan = undefined; return; }
  const on = looked(s, w), target = on?.key ?? null;
  if (!s.scan || s.scan.target !== target) { s.scan = { target, t: 0 }; return; }
  if (!target || s.scan.done) return;
  s.scan.t += DT;
  if (s.scan.t < SCAN.secs) return;
  s.scan.done = true;
  (s.scans ??= {})[target] = true;
  s.lastScan = target;
  // Food (M5-05): she reads that packet's date, so its shelf life is known from now on.
  if (on?.stack && item(on.stack.id).food) { on.stack.checked = true; s.lastFood = on.stack.uid; }
  // A disabled machine (M5-12): opened up to her, its kind's weak points.
  if (on?.down) (s.weak ??= {})[on.down] = true;
  s.events.push({ t: 'scan', id: target });
}
