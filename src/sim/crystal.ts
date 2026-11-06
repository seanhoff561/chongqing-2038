// Up on The Crystal (M6-18, DESIGN section 9; yuzhong/hub.ts). Out on its roof and its towers' roofs the wind comes in
// gusts off the Jialing: heard rising first, then for a couple of seconds it shoves him south, toward the Yangtze,
// hard enough on his feet to walk him off the roof's edge, half that crouched (he holds), nothing lying flat or
// hanging on. Inside, the glass floor over the gap between T3S and T4S has a pressure sensor under each pane: any
// weight on a pane gives him away to the district; the steel beams between the panes carry none. And the two rides
// up: the freight lift in T5 (the hub's power runs it: loud, its car watched) and the window-cleaning gondola up T3S.
import { DT, type SimState } from './types';
import type { World } from '../world/world';
import { onInteract, START_SOUND } from './interact';
import { SCALE } from './clock';
import { teleport } from './player';
import { giveAway } from './district';
import { RAFFLES } from '../world/yuzhong/raffles';
import { HUB } from '../world/yuzhong/hub';

interface Crystal { ox: number; oz: number; ux: number; uz: number; y: number; t0: number; t1: number; g0: number; g1: number }
const frames = new WeakMap<World, Crystal | null>();
/** The Crystal's frame from its marks (raffles.ts). */
function crystal(w: World): Crystal | null {
  if (!frames.has(w)) {
    const o = w.features.find(f => f.kind === 'crystal'), e = w.features.find(f => f.kind === 'crystal:east'), wst = w.features.find(f => f.kind === 'crystal:west'), g = w.features.filter(f => f.kind === 'crystal:glass');
    const T = (x: number, z: number) => (x - o!.x) * o!.nx! + (z - o!.z) * o!.nz!;
    frames.set(w, o && e && wst && g.length === 2 ? { ox: o.x, oz: o.z, ux: o.nx!, uz: o.nz!, y: o.y, t0: T(wst.x, wst.z), t1: T(e.x, e.z), g0: T(g[0].x, g[0].z), g1: T(g[1].x, g[1].z) } : null);
  }
  return frames.get(w)!;
}
/** A point in The Crystal's frame: along it, across it (south +). */
const local = (c: Crystal, x: number, z: number) => ({ t: (x - c.ox) * c.ux + (z - c.oz) * c.uz, s: (x - c.ox) * -c.uz + (z - c.oz) * c.ux });

/** Where a game time falls in the gusts: the wind rising before one, the gust, or between; and which gust it is. */
export function gustAt(time: number): { now: 'warn' | 'gust' | null; n: number } {
  const G = HUB.gust, r = time / SCALE, t = ((r % G.every) + G.every) % G.every, n = Math.floor(r / G.every);
  return t < G.last ? { now: 'gust', n } : t >= G.every - G.warn ? { now: 'warn', n: n + 1 } : { now: null, n };
}

/** Whether a point's out in the wind up there: as high as The Crystal's floor, near it, not inside its glass. */
export function inWind(w: World, x: number, y: number, z: number): boolean {
  const c = crystal(w);
  if (!c || y < c.y - 2) return false;
  const { t, s } = local(c, x, z);
  if (t < c.t0 - 80 || t > c.t1 + 80 || Math.abs(s) > 120) return false;
  return !(Math.abs(s) < RAFFLES.half && t > c.t0 && t < c.t1 && y < c.y + RAFFLES.tall);
}

/** Whether a point's on a pane of the glass floor, not on a beam between panes. */
export function onPane(w: World, x: number, y: number, z: number): boolean {
  const c = crystal(w);
  if (!c || Math.abs(y - c.y) > 0.3) return false;
  const { t, s } = local(c, x, z), P = HUB.pane, off = (v: number) => { const m = ((v % P) + P) % P; return Math.min(m, P - m); };
  if (t < c.g0 || t > c.g1 || Math.abs(s) > RAFFLES.half) return false;
  return off(t - c.g0) > HUB.beam && off(s + RAFFLES.half) > HUB.beam;
}

/** Every tick: the wind on the tops, the glass floor's sensors. */
export function stepCrystal(s: SimState, w: World) {
  const c = crystal(w), p = s.player;
  if (!c || s.dead || p.pos.y < c.y - 3) return;
  const st = (s.crystal ??= { warned: -1, pane: -Infinity });
  if (inWind(w, p.pos.x, p.pos.y, p.pos.z)) {
    const g = gustAt(s.time);
    if (g.now === 'warn' && st.warned !== g.n) {
      st.warned = g.n;
      s.events.push({ t: 'sfx', id: 'gust' }, { t: 'msg', text: 'the wind is rising over the glass' });
    }
    const P = HUB.gust.push, a = g.now !== 'gust' ? 0 : p.mode === 'air' ? P.air : p.mode !== 'ground' ? 0 : p.posture === 'stand' ? P.stand : p.posture === 'crouch' ? P.crouch : P.crawl;
    if (a) { p.vel.x += -c.uz * a * DT; p.vel.z += c.ux * a * DT; }
  }
  if (p.mode === 'ground' && p.onGround && (s.time - st.pane) / SCALE >= 2 && onPane(w, p.pos.x, p.pos.y, p.pos.z)) {
    st.pane = s.time;
    giveAway(s, w, { ...p.pos });
    s.events.push({ t: 'sfx', id: 'click' }, { t: 'msg', text: 'the pane ticked under your weight: a pressure sensor' });
  }
}

// The freight lift: its motor grinding the car up (or down) the tower, heard at both ends. The gondola: its winch,
// slow, quieter.
START_SOUND.hublift = () => 'latch';
START_SOUND.gondola = () => 'latch';
for (const [kind, dur, r, text] of [['hublift', HUB.lift, HUB.liftNoise, 'the freight lift ground its way up the tower'], ['gondola', HUB.gondola, HUB.gondolaNoise, 'the cradle crept its way along the glass']] as const) {
  onInteract(kind, {
    dur: () => dur,
    done: (s, _w, it) => {
      const to = it.data!.to as { x: number; y: number; z: number };
      teleport(s.player, to.x, to.y, to.z);
      s.events.push({ t: 'noise', x: it.x, y: it.y, z: it.z, r, kind: 'hoist' }, { t: 'noise', x: to.x, y: to.y, z: to.z, r, kind: 'hoist' }, { t: 'msg', text: to.y < it.y ? text.replace('up', 'down') : text });
    },
  });
}
