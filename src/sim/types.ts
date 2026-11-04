// Shared sim types. Everything in SimState is plain JSON data.
import type { Rng } from './rng';

export interface Vec3 { x: number; y: number; z: number }

export const TICK_HZ = 60;
export const DT = 1 / TICK_HZ;

/** Button bits for InputFrame.buttons (held) and InputFrame.pressed (went down since the last tick). */
export const B = {
  JUMP: 1, SPRINT: 2, CROUCH: 4, CRAWL: 8, INTERACT: 16, USE: 64, AIM: 128,
  RELOAD: 256, HEADLAMP: 512, LEAN_L: 1024, LEAN_R: 2048,
  /** chimneying, on its own key (U-060) */
  CHIMNEY: 4096,
  /** lying down to sleep rough, held (U-066: its own key, not the interact key's) */
  SLEEP: 8192,
} as const;

export interface InputFrame {
  /** strafe (right +) and forward (+) axes, -1..1 */
  mx: number;
  my: number;
  /** absolute look angles in radians; yaw 0 looks toward -z (north), positive yaw turns left */
  yaw: number;
  pitch: number;
  buttons: number;
  pressed: number;
  /** hotbar selection this tick (0-5) or -1 for none */
  slot: number;
  /** UI commands for this tick */
  cmds?: import('./commands').Cmd[];
}

export const emptyInput = (): InputFrame => ({ mx: 0, my: 0, yaw: 0, pitch: 0, buttons: 0, pressed: 0, slot: -1 });

export type SimEvent =
  | { t: 'noise'; x: number; y: number; z: number; r: number; kind: string }
  | { t: 'land'; h: number; outcome: FallOutcome }
  | { t: 'hurt'; dmg: number; cause: string }
  /** an action that didn't go: why, never shown (U-104: nothing says what a thing needs) */
  | { t: 'blocked'; why: string }
  /** he fired a gun (M4-21) */
  | { t: 'fire'; id: string; quiet?: boolean }
  /** he swung the knife or crowbar (M4-60), and on what it landed */
  | { t: 'swing'; kind: string; on: 'machine' | 'metal' | 'hard' | 'soft' | 'air' }
  /** where a round or blow left its mark (M4-61): the point, the surface's normal, what it was and what it hit */
  | { t: 'mark'; x: number; y: number; z: number; nx: number; ny: number; nz: number; kind: 'bullet' | 'scrape' | 'cut'; on: 'metal' | 'hard' | 'soft' | 'machine' }
  /** he hit a machine (M4-19) */
  | { t: 'hit'; id: number; zone: string; dmg: number }
  | { t: 'slept'; from: number; to: number; where: 'bed' | 'rough' | 'collapse' }
  | { t: 'use'; id: string }
  | { t: 'open'; id: string }
  | { t: 'sleep-menu'; id: string }
  | { t: 'grab'; hand: number; kind: string }
  | { t: 'sfx'; id: string }
  | { t: 'ate'; id: string; sick: boolean }
  | { t: 'msg'; text: string }
  | { t: 'bench'; id: string }
  | { t: 'ending'; route: string }
  | { t: 'logged'; kind: import('../data/units').UnitKind; head: number }
  /** a line of dialogue (src/data/dialogue) */
  | { t: 'say'; id: string }
  /** Anna has scanned something (M5-04) */
  | { t: 'scan'; id: string }
  /** the street speakers' announcement (M4-28), from the lamppost nearest him */
  | { t: 'pa'; id: string; x: number; y: number; z: number }
  /** a humanoid calling the others (M4-10) */
  | { t: 'call'; x: number; y: number; z: number }
  /** a machine's gun fired (M4-11) */
  | { t: 'shot'; x: number; y: number; z: number; /** a supersonic round that missed him, cracking past (M4-54) */ crack?: boolean };

/** A stack he dropped (M3-72): lying where he let it go until he picks it up. */
export interface Dropped { stack: import('./inventory').Stack; x: number; y: number; z: number; /** lying loose in a room from before (U-085), not his */ loose?: boolean }

/** A piece of furniture he placed: its item id and where it stands. */
export interface Placed { id: string; item: string; x: number; y: number; z: number; yaw: number }

export interface FallOutcome { damage: number; sprain: boolean; fracture: boolean; arm: boolean; lethal: boolean }

export interface Shelter {
  id: string; x: number; y: number; z: number; battery: number; compromised: boolean;
  /** an inverter wired in, and a solar charger set up (M5-27) */
  inverter?: boolean;
  solar?: boolean;
  /** he was within TRACK.near of its bed last tick (M4-23) */
  near?: boolean;
  /** given away, when they come for it (M4-24), and whether they have; an EMP trap rigged in it */
  raid?: number;
  raided?: boolean;
  trap?: boolean;
}

export interface SimState {
  version: number;
  seed: number;
  /** the seed the city was built with (its building types, M5-35); a new run in place keeps the city's (D-123) */
  worldSeed?: number;
  /** times he's died this run (U-104): never rolled back by waking at the last save */
  deaths?: number;
  rng: Rng;
  tick: number;
  /** game seconds since day 1, 00:00 */
  time: number;
  player: import('./player').Player;
  body: import('./body').Body;
  inv: { pack: import('./inventory').Grid; hotbar: (number | null)[]; held: number };
  /** container grids by id, created when first opened */
  containers: Record<string, import('./inventory').Grid>;
  nextUid: number;
  /** his hideouts (U-013, U-018): every bed he has claimed, where it is, its car battery charge (%) and
   *  whether the machines know where it is */
  shelters: Shelter[];
  /** a raid breaking in on him (M4-24): the hideout's bed, when they're in, where they come in */
  raid?: { id: string; at: number; x: number; y: number; z: number };
  /** hideouts the machines burnt out (M4-25): where each was, and whether he has come back and seen it */
  lost?: { x: number; y: number; z: number; seen?: boolean }[];
  /** furniture he has put down: beds, crates */
  placed: Placed[];
  /** things he dropped, lying where they fell */
  dropped: Dropped[];
  /** the machines on their beats (M4-01) */
  units: import('./units').Unit[];
  /** what the hive knows (M4-04): where and when it has seen him; each district's alert that isn't Unaware (M4-12); his
   *  last known position and the way he was going (M4-13) */
  /** rockets in the air (M4-65): where, going which way (unit), when fired, whose */
  rockets?: { x: number; y: number; z: number; dx: number; dy: number; dz: number; t: number; by: 'heavy' | 'him' }[];
  /** grenades falling from a bomb drone (M4-47): where dropped, when, and the ground under */
  bombs?: { x: number; y: number; z: number; gy: number; t: number }[];
  /** The street speakers (M4-28): when they next speak, what they last spoke of, how many lines they've said. */
  pa?: { at: number; kind: import('../data/announce').PaKind; n: number };
  hive: { /** when each column last changed a walker over, and how many it has (M4-58) */ changes?: Record<number, number>; changeovers?: number; /** the helicopter drop under way (M4-92): the building, when called, what it's doing, when the sweep began; and when it was last called */ heli?: { plot: number; t: number; phase: 'fly' | 'sweep' | 'leave'; from?: number }; heliAt?: number; seen: { x: number; y: number; z: number; t: number }[]; districts: Record<string, import('./district').District>; lkp?: { x: number; y: number; z: number; t: number; hx: number; hz: number; ax: number; az: number };
    /** machines gone silent while aware (M4-17): where and when */
    silent: { x: number; y: number; z: number; t: number }[] };
  /** container currently open beside the backpack, or null */
  openContainer: string | null;
  /** interactable id he's looking at, and a running hold-E task */
  target: string | null;
  task: { id: string; t: number; dur: number } | null;
  /** dynamic world state: searched containers, opened doors, removed things */
  wstate: { searched: Record<string, true>; open: Record<string, boolean>; gone: Record<string, true>; unlocked?: Record<string, true>; benches?: Record<string, true>; /** the floors' loose spots rolled so far (U-085) */ loose?: Record<string, true>; /** wrecks taken apart (M5-16) */ salvaged?: Record<string, true>; /** doors nailed shut (M5-18) */ pinned?: Record<string, true> };
  /** lines he has rigged with rope and hooks (M3-52), and the first hook of one he's rigging */
  lines?: import('../world/world').Line[];
  rig?: Vec3 | null;
  /** cause of death, or null while alive */
  dead: string | null;
  /** events emitted during the latest tick */
  events: SimEvent[];
  flags: { god: boolean; noclip: boolean; rain: number; fog?: number; clear?: boolean; snow?: number };
  /** Anna's laptop (M5-01): open or shut, its battery (0 to 1) */
  laptop?: { open: boolean; charge: number };
  /** what Anna's scanned ('unit:<kind>', 'item:<id>'), what she's scanning now and how long he's looked, and the last (M5-04) */
  scans?: Record<string, true>;
  scan?: { target: string | null; t: number; done?: boolean };
  lastScan?: string;
  /** the last food stack scanned (its uid), for her Scan page (M5-05) */
  lastFood?: number;
  /** the 10 m cells he's been in, by layer: 'cx,cz,layer' (M5-06) */
  explored?: Record<string, 1>;
  /** the machine he's watching through binoculars, for how long (real s) and when the next line's logged (M5-07) */
  watch?: { u: number; t: number; next: number };
  /** Anna's patrol log (M5-07) */
  sightings?: import('./binoculars').Sighting[];
  /** what Anna has from the SDR (M5-08): districts whose drones she's heard, how long she's listened in each (real s) */
  sdr?: { heard: Record<string, true>; t: Record<string, number> };
  /** the cameras (world indices) he's tapped (M5-09) */
  taps?: number[];
  /** the keycards he's cloned (M5-24) */
  cloned?: string[];
  /** the story's beats played this run (M8-15) */
  beats?: Record<string, true>;
  /** the escape routes' steps done, and when (M7-01) */
  escape?: Record<string, Record<string, number>>;
  /** the run ended on a route (M7-01) */
  ended?: { route: string; t: number };
  /** the run's tally: sites got into, times the machines had him (and which districts have him now) */
  stats?: { sites: Record<string, true>; seen: number; engaged: Record<string, boolean> };
  /** out too far on the river (M6-27): since when, and when the drone boats set out */
  river?: { since: number; boats?: number };
  /** the zipline kit's first clamp, on (M5-33) */
  kitRig?: Vec3;
  /** what Anna last remarked on, and when, and how things stood (M5-32) */
  /** the hacked drone in the air (M5-11): where it is, its look, and how long an armed machine has had it in sight */
  flight?: { x: number; y: number; z: number; yaw: number; pitch: number; seen: number };
  /** the jammer running (M5-13): since when (game time), and whether it's become a beacon */
  jam?: { since: number; beacon?: boolean };
  /** EMP devices rigged as traps (M5-14): the device and where */
  traps?: { stack: import('./inventory').Stack; x: number; y: number; z: number }[];
  /** things thrown, in the air (M5-19): what, when, where, how fast */
  thrown?: { id: string; stack: import('./inventory').Stack; t: number; x: number; y: number; z: number; vx: number; vy: number; vz: number }[];
  /** powder clouds (M5-19) and firecrackers going off: where and till when */
  smoke?: { x: number; y: number; z: number; until: number }[];
  crackers?: { x: number; y: number; z: number; until: number; next: number }[];
  /** when he can next cough in a cloud (M5-36) */
  coughAt?: number;
  /** ropes he's hung and ladders he's stood against walls (M5-20 to M5-22): each a climbable, and the item it was */
  ropes?: (import('../world/world').Climbable & { item: string })[];
  /** ladders laid across gaps (M5-22): where he stood, his heading, from and to how far along it, its top, the item */
  planks?: { x: number; z: number; yaw: number; a: number; b: number; y: number; item: string }[];
  /** the kinds of machine whose weak points she knows, from scanning one disabled (M5-12) */
  weak?: Partial<Record<import('../data/units').UnitKind, true>>;
  /** fog and rain now, 0 to 1 (M3-12): from the seeded schedule, forced up by the dev flags */
  /** snow falling 0 to 1 (U-097), and how much lies on what's open to the sky, 0 to 1 (as of game time `at`) */
  weather: { fog: number; rain: number; snow?: number; cover?: number; at?: number };
  /** a gas-suppressed room set off, by its id: when (M6-14) */
  gas?: Record<string, number>;
  /** a district's relay cut (M6-14): until when its machines can't pass word on */
  relayDown?: Record<string, number>;
}
