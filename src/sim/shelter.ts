// Hideouts (U-013, U-018, DESIGN section 9): he starts in the friends' old one under the vent grate and makes
// more: claim a bed or lay one down, turn a table into a workbench with a toolbox, keep things in containers
// near the bed. A hideout is a claimed bed and everything within SHELTER_R of it; he can have any number. What he
// puts down he can pack up again (M10-25).
import type { SimState, Shelter } from './types';
import type { World, Inter } from '../world/world';
import { onUseId } from './use';
import { onInteract, extraInters, lookTarget, crouchActs } from './interact';
import { raycast, query, frameIn, frameOut } from '../world/geom';
import { free } from './physics';
import { movement as M } from '../data/movement';
import { takeStack, addItem, type Stack } from './inventory';
import { districtAt, DISTRICT_NAMES } from '../world/yuzhong/lots';

export const SHELTER_R = 15;
const PLACE_REACH = 3;

const BEDS = new Set(['bedroll', 'mattress']);

/** Placed furniture as interactables: beds to sleep in, crates to store things (a toolbox is its table's). */
function placedInters(s: SimState): Inter[] {
  return s.placed.flatMap(p => BEDS.has(p.item)
    ? [{ id: p.id, kind: 'mattress', x: p.x, y: p.y + 0.2, z: p.z, r: 0.9, zh: '床', en: 'Bed' }]
    : p.item === 'foldcrate' ? [{ id: p.id, kind: 'container', x: p.x, y: p.y + 0.4, z: p.z, r: 0.6, zh: '折叠箱', en: 'Crate', data: { type: 'crate' } }] : []);
}
extraInters.push(placedInters);

/** Claim a bed: a new hideout, or nothing if it's already one of his. */
export function claimBed(s: SimState, it: Inter, battery = 0) {
  if (s.shelters.some(h => h.id === it.id)) return;
  // (One given power comes with its inverter: M5-27.)
  s.shelters.push({ id: it.id, x: it.x, y: it.y, z: it.z, battery, compromised: false, ...(battery > 0 ? { inverter: true } : {}) });
  s.events.push({ t: 'msg', text: s.shelters.length > 1 ? 'another hideout' : 'your bed now' });
}

/** The hideout whose bed is nearest (x, y, z) within SHELTER_R, or null. */
export function shelterAt(s: SimState, x: number, y: number, z: number): Shelter | null {
  let best: Shelter | null = null, bd = SHELTER_R;
  for (const h of s.shelters) { const d = Math.hypot(x - h.x, y - h.y, z - h.z); if (d <= bd) { best = h; bd = d; } }
  return best;
}

/** A hideout's own storage: the containers nearer its bed than any other hideout's, within reach, and those of
 *  the room its bed is in. */
export function stashIds(s: SimState, w: World, h: Shelter | null = shelterAt(s, s.player.pos.x, s.player.pos.y, s.player.pos.z)): string[] {
  if (!h) return [];
  const room = w.sites.find(x => x.bed === h.id)?.containers ?? [];
  return w.inter.concat(placedInters(s)).filter(i => i.kind === 'container' && (shelterAt(s, i.x, i.y, i.z) === h || room.includes(i.id))).map(i => i.id);
}

export const isBench = (s: SimState, it: Inter) => it.kind === 'bench' || (it.kind === 'table' && !!s.wstate.benches?.[it.id]);

/** The floor point he's looking at within reach, with room above it, or null. */
function floorAhead(s: SimState, w: World): { x: number; y: number; z: number } | null {
  const p = s.player, ey = p.pos.y + M.eye[p.posture];
  const dx = -Math.sin(p.yaw) * Math.cos(p.pitch), dy = Math.sin(p.pitch), dz = -Math.cos(p.yaw) * Math.cos(p.pitch);
  const h = raycast(w.index, p.pos.x, ey, p.pos.z, dx, dy, dz, PLACE_REACH);
  if (!h || h.ny < 0.7) return null;
  const x = p.pos.x + dx * h.t, y = ey + dy * h.t, z = p.pos.z + dz * h.t;
  return free(w.index, x, y + 0.05, z, 0.5, 0.45) ? { x, y, z } : null;
}

function place(s: SimState, w: World, uid: number, item: string) {
  if (s.player.mode !== 'ground') return;
  const at = floorAhead(s, w);
  if (!at) { s.events.push({ t: 'msg', text: 'no room' }); return; }
  takeStack(s.inv.pack, uid);
  s.inv.held = 0;
  const id = `placed${s.nextUid++}`;
  s.placed.push({ id, item, ...at, yaw: s.player.yaw });
  // Laying down a bed claims it.
  if (BEDS.has(item)) claimBed(s, placedInters(s).find(i => i.id === id)!);
}

for (const id of ['bedroll', 'mattress', 'foldcrate']) onUseId(id, (s, w, st) => place(s, w, st.uid, id));

/** A table's top: the middle of its box (the solid level with the top nearest where he reaches it) and the yaw
 *  that lays a thing along its long side. */
export function tableTop(w: World, t: Inter): [number, number, number] {
  let top: [number, number, number] = [t.x, t.z, 0], bd = 0.5;
  for (const i of query(w.index, t.x - 1, t.z - 1, t.x + 1, t.z + 1)) {
    const b = w.index.solids[i], r = b.rot ?? b, [u, v] = frameIn(b, t.x, t.z);
    const d = Math.hypot(Math.max(r.x0 - u, 0, u - r.x1), Math.max(r.z0 - v, 0, v - r.z1));
    if (Math.abs(b.y1 - t.y) > 1e-3 || d >= bd) continue;
    const [x, z] = frameOut(b, (r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2);
    // (A turned box's turn, as a yaw, is minus its angle: geom's turn and three.js's go opposite ways.)
    top = [x, z, (r.x1 - r.x0 >= r.z1 - r.z0 ? 0 : Math.PI / 2) - Math.atan2(b.rot?.s ?? 0, b.rot?.c ?? 1)];
    bd = d;
  }
  return top;
}

onUseId('toolbox', (s, w, st) => {
  const t = lookTarget(s, w);
  if (!t || t.kind !== 'table') { return; }
  if (s.wstate.benches?.[t.id]) return;
  takeStack(s.inv.pack, st.uid);
  s.inv.held = 0;
  (s.wstate.benches ??= {})[t.id] = true;
  // In the middle of its top, square to it.
  const [x, z, yaw] = tableTop(w, t);
  s.placed.push({ id: `placed${s.nextUid++}`, item: 'toolbox', x, y: t.y, z, yaw, on: t.id });
  s.events.push({ t: 'msg', text: 'workbench set up' });
});

/** Crouched, F at a thing he put down (a toolbox: its table) packs it back into the backpack. A crate only once it's
 *  empty; a bed ends its hideout, and what power he wired in there comes out with it (the car battery holding the
 *  charge left); a toolbox ends the bench. All of it fits in the pack or it all stays. */
crouchActs.push((s, _w, it) => {
  const p = s.placed.find(q => q.id === it.id || (it.kind === 'table' && q.on === it.id));
  if (!p) return false;
  if (s.containers[p.id]?.items.length) { s.events.push({ t: 'blocked', why: 'not empty' }); return true; }
  const h = s.shelters.find(q => q.id === p.id), back: [string, Partial<Stack>][] = [[p.item, {}]];
  if (h?.battery) back.push(['carbattery', { charge: h.battery }]);
  if (h?.inverter) back.push(['inverter', {}]);
  if (h?.solar) back.push(['solar', {}]);
  // (Tried in a copy of the pack: each is a stack of one, so none tops up a stack already there.)
  const pack = { ...s.inv.pack, items: [...s.inv.pack.items] };
  if (back.some(([id, extra]) => addItem(s, pack, id, 1, extra))) { s.events.push({ t: 'msg', text: 'no room' }); return true; }
  s.inv.pack.items = pack.items;
  s.placed.splice(s.placed.indexOf(p), 1);
  if (h) s.shelters.splice(s.shelters.indexOf(h), 1);
  if (p.on) delete s.wstate.benches![p.on];
  delete s.containers[p.id];
  if (s.openContainer === p.id) s.openContainer = null;
  s.events.push({ t: 'sfx', id: 'rustle' });
  return true;
});

onInteract('table', {
  now: (s, _w, it) => { if (isBench(s, it)) s.events.push({ t: 'bench', id: it.id }); },
});

/** His hideouts for the journal: where each is (district) and what its bed is, nearest first. */
export function hideoutList(s: SimState, w: World): { id: string; zh: string; en: string; place: [string, string]; dist: number }[] {
  const beds = allBeds(s, w), p = s.player.pos;
  return s.shelters.map(h => {
    const d = w.ground ? DISTRICT_NAMES[districtAt(h.x, h.z).district] : null;
    const b = beds.find(i => i.id === h.id);
    return { id: h.id, zh: b?.zh ?? '床', en: b?.en ?? 'Bed', place: d ?? ['城里', 'the city'] as [string, string], dist: Math.hypot(h.x - p.x, h.z - p.z) };
  }).sort((a, b) => a.dist - b.dist);
}
const allBeds = (s: SimState, w: World) => w.inter.concat(placedInters(s)).filter(i => i.kind === 'mattress');
