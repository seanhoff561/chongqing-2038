// A new run (U-013, U-018): day 1, 06:00, Li Wei wakes in his friends' old hideout under the vent grate with his
// backpack, their crate and nothing else (DESIGN section 9). The furnished shelter stays as a test scene (furnish).
import type { SimState } from './types';
import type { World } from '../world/world';
import { SCALE } from './clock';
import { grid, addItem, newUid, type Grid } from './inventory';
import { onUseId } from './use';
import { VOICEMAIL } from '../data/dialogue';
import { CONTAINER } from './containers';
import { claimBed } from './shelter';
import { placeDocuments } from './documents';

export const STARTING_SUPPLIES: [string, number, number?][] = [
  ['noodles', 2], ['luncheon', 1], ['bread', 1, 1], ['water', 3], ['bandage', 1],
];

const supply = (s: SimState, g: Grid) => {
  for (const [id, n, ageDays] of STARTING_SUPPLIES) addItem(s, g, id, n, ageDays ? { made: s.time - ageDays * 86400 } : {});
};

/** What the friends left in their crate: a string of firecrackers, tape, a rag, a headlamp at 60%. */
export const FRIENDS_CRATE: [string, number, number?][] = [['firecrackers', 1], ['tape', 1], ['cloth', 1], ['headlamp', 1, 60]];
export const START_CRATE = 'airraid-stash';

export function startRun(s: SimState, w: World) {
  supply(s, s.inv.pack);
  s.shelters = [];
  if (w.inter.some(i => i.id === START_CRATE)) {
    const g = (s.containers[START_CRATE] = grid(CONTAINER.crate.w, CONTAINER.crate.h));
    for (const [id, n, charge] of FRIENDS_CRATE) addItem(s, g, id, n, charge ? { charge } : {});
    s.wstate.searched[START_CRATE] = true;
  }
  // In the family flat in upper Shibati (M3-19): his father's badge, and the phone, nearly flat, with its voicemail.
  for (const f of w.features) if (f.kind === 'li:badge' || f.kind === 'li:phone') {
    const id = f.kind.slice(3);
    s.dropped.push({ stack: { uid: newUid(s), id, n: 1, x: 0, y: 0, rot: false, ...(id === 'phone' ? { charge: 6 } : {}) }, x: f.x, y: f.y, z: f.z });
  }
  // The found documents, each in its place (M10-37).
  placeDocuments(s, w);
  quietStart(s, w);
  s.events.length = 0;
}

/** A new run's first minutes (U-075, U-104): the machines are out on their beats everywhere from the first second, but
 *  none whose beat comes within QUIET.r of the hideout's way out (the grate he climbs out by) is out yet, so he isn't
 *  killed as he comes up. */
export const QUIET = { r: 40, minutes: 8 };
export function quietStart(s: SimState, w: World) {
  const at = w.inter.find(i => i.id === 'airraid-grate') ?? s.player.pos, until = s.time + QUIET.minutes * 60 * SCALE;
  for (const u of s.units) {
    const p = u.patrol >= 0 ? w.patrols[u.patrol] : undefined, c = u.cam !== undefined ? w.cameras[u.cam] : undefined, near = (q: { x: number; z: number }) => Math.hypot(q.x - at.x, q.z - at.z) < QUIET.r;
    // (And the columns marching past it, the hunters on a dock by it, the cameras and sensors on it, dark for now.)
    const col = u.convoy ? w.convoys?.[u.convoy.path] : undefined, dock = u.reserve?.dock !== undefined ? w.docks[u.reserve.dock] : undefined;
    // A beat counts if any leg of it passes near, not just its stops (a sky drone's legs run long).
    const leg = (pts: { x: number; z: number }[]) => pts.some((a, i) => {
      const b = pts[(i + 1) % pts.length], dx = b.x - a.x, dz = b.z - a.z, f = Math.max(0, Math.min(1, ((at.x - a.x) * dx + (at.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
      return near({ x: a.x + dx * f, z: a.z + dz * f });
    });
    if ((p && leg(p.pts)) || (c && near(c)) || (col && leg(col.pts)) || (dock && near(dock))) u.quiet = until;
  }
}

/** The phone plays its one voicemail, while it has charge. */
onUseId('phone', (s, _w, st) => {
  if ((st.charge ?? 0) <= 0) { s.events.push({ t: 'msg', text: 'the phone is dead' }); return; }
  st.charge = Math.max(0, (st.charge ?? 0) - 1);
  for (const l of VOICEMAIL) s.events.push({ t: 'say', id: l.id });
});

/** The furnished test shelter: supplies in its stash and a car battery at 60%. */
export function furnish(s: SimState, w: World) {
  if (w.inter.some(i => i.id === 'stash')) {
    supply(s, (s.containers.stash = grid(CONTAINER.stash.w, CONTAINER.stash.h)));
    s.wstate.searched.stash = true;
  }
  const bed = w.inter.find(i => i.kind === 'mattress');
  s.shelters = [];
  if (bed) claimBed(s, bed, 60);
  s.events.length = 0;
}
