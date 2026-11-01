// The machines that move (DESIGN section 7): how fast each kind goes on its beat and when chasing, whether it takes
// stairs, how high it flies, and the hours its beats keep by default. Speeds in real metres a second.
export type UnitKind = 'quadruped' | 'humanoid' | 'heavy' | 'drone' | 'hunter' | 'fpv' | 'bomber' | 'spider' | 'colossus' | 'heli' | 'crawler' | 'delivery' | 'carrier' | 'camera' | 'sweeper' | 'lamppost' | 'turret' | 'pir' | 'tripwire' | 'acoustic';
/** The machines that stay where they're put (M4-07, M4-11). */
export const STATIC = new Set<UnitKind>(['camera', 'sweeper', 'lamppost', 'turret', 'pir', 'tripwire', 'acoustic']);

export const UNITS: Record<UnitKind, { patrol: number; chase: number; stairs: boolean; fly: number; zh: string; en: string; hp: number; weapon?: Weapon }> = {
  // Its shock prod (M4-18; its tag launcher is M4-22's).
  quadruped: { patrol: 1.8, chase: 5, stairs: true, fly: 0, zh: '四足机器人', en: 'Quadruped', hp: 150, weapon: 'prod' },
  // Armoured (its plates take a tenth of a hit: ZONES) and armed with a rifle (M4-18).
  humanoid: { patrol: 1.8, chase: 3.6, stairs: true, fly: 0, zh: '人形机器人', en: 'Humanoid', hp: 300, weapon: 'rifle' },
  // A street heavy (M4-26b, U-038): a 3 m walker on the main streets, heavily armoured, a rotary cannon on its arm.
  heavy: { patrol: 1.6, chase: 3, stairs: false, fly: 0, zh: '重型机甲', en: 'Heavy walker', hp: 900, weapon: 'cannon' },
  drone: { patrol: 3.5, chase: 6, stairs: true, fly: 30, zh: '巡逻无人机', en: 'Patrol drone', hp: 25 },
  // Giants (M4-48, U-050): a spider walker on eight legs with twin guns, and a colossus 9 m tall with a cannon.
  spider: { patrol: 2.5, chase: 4, stairs: false, fly: 0, zh: '蛛形机甲', en: 'Spider walker', hp: 4000, weapon: 'cannon' },
  colossus: { patrol: 1.2, chase: 2, stairs: false, fly: 0, zh: '巨型机甲', en: 'Colossus', hp: 3000, weapon: 'cannon' },
  heli: { patrol: 22, chase: 22, stairs: true, fly: 60, zh: '运兵直升机', en: 'Helicopter', hp: 2500 },
  crawler: { patrol: 2, chase: 4.5, stairs: true, fly: 0, zh: '蛛形无人机', en: 'Crawler drone', hp: 60, weapon: 'prod' },
  // Kept on the docks and launched on contact (M4-14), armed with a submachine gun.
  hunter: { patrol: 9, chase: 9, stairs: true, fly: 30, zh: '猎杀无人机', en: 'Hunter drone', hp: 70, weapon: 'smg' },
  // Strike drones (M4-47, U-050), kept on the docks and sent when a district's had him in sight too long: a kamikaze
  // FPV that dives at him and blows up, and a bomb dropper that drops grenades on him from above.
  fpv: { patrol: 16, chase: 16, stairs: true, fly: 30, zh: '自杀无人机', en: 'Strike drone', hp: 10 },
  bomber: { patrol: 7, chase: 7, stairs: true, fly: 30, zh: '投弹无人机', en: 'Bomb drone', hp: 35 },
  delivery: { patrol: 2, chase: 2, stairs: false, fly: 0, zh: '配送机器人', en: 'Delivery robot', hp: 80 },
  carrier: { patrol: 1.6, chase: 1.6, stairs: false, fly: 0, zh: '运输机器人', en: 'Carrier', hp: 200 },
  camera: { patrol: 0, chase: 0, stairs: false, fly: 0, zh: '监控摄像头', en: 'Camera', hp: 20 },
  sweeper: { patrol: 0, chase: 0, stairs: false, fly: 0, zh: '旋转摄像头', en: 'Sweeping camera', hp: 20 },
  lamppost: { patrol: 0, chase: 0, stairs: false, fly: 0, zh: '智慧灯杆', en: 'Smart lamppost', hp: 20 },
  turret: { patrol: 0, chase: 0, stairs: false, fly: 0, zh: '自动炮塔', en: 'Turret', hp: 500, weapon: 'turret' },
  pir: { patrol: 0, chase: 0, stairs: false, fly: 0, zh: '红外感应器', en: 'Motion sensor', hp: 20 },
  tripwire: { patrol: 0, chase: 0, stairs: false, fly: 0, zh: '激光绊线', en: 'Laser tripwire', hp: 20 },
  acoustic: { patrol: 0, chase: 0, stairs: false, fly: 0, zh: '声学传感器', en: 'Acoustic sensor', hp: 20 },
};

/** Where a machine can be hit and what each place takes of a hit (DESIGN section 6, M4-19); the damage to a place that
 *  blinds it (its sensor head), immobilises it (each knee) or shuts it down (its battery). */
export const ZONES: Record<UnitKind, Record<string, number>> = {
  drone: { body: 1, rotors: 1.5 }, hunter: { body: 0.8, rotors: 1.5 }, fpv: { body: 1 }, bomber: { body: 1, rotors: 1.5 }, spider: { body: 0.05, head: 2 }, colossus: { body: 0.03, head: 2 }, heli: { body: 0.3, rotors: 1.5 }, crawler: { body: 1 },
  quadruped: { body: 0.2, head: 2.5, legs: 0.6, battery: 1.5, launcher: 0.5 },
  humanoid: { body: 0.1, head: 3, kneeL: 0.8, kneeR: 0.8, battery: 2, rifle: 0.5 },
  heavy: { body: 0.05, head: 2, kneeL: 0.5, kneeR: 0.5, battery: 1.5 },
  turret: { body: 0.05, head: 2, barrels: 0.5 },
  delivery: { body: 1 }, carrier: { body: 0.3 },
  camera: { body: 1 }, sweeper: { body: 1 }, lamppost: { body: 1 }, pir: { body: 1 }, tripwire: { body: 1 }, acoustic: { body: 1 },
};
/** What breaks (M4-19, M4-62): the damage at a place that blinds it, lames it, shuts it down, puts its weapon out of
 *  action (a humanoid's rifle shot out of its hands, a quadruped's launcher wrecked, a turret's barrels bent), or
 *  brings a drone down out of the air. */
export const BREAKS: Partial<Record<UnitKind, { head?: number; knee?: number; battery?: number; weapon?: number; rotors?: number }>> = {
  quadruped: { head: 60, weapon: 20 }, humanoid: { head: 75, knee: 100, battery: 120, weapon: 20 }, heavy: { head: 150, knee: 250, battery: 300 }, turret: { head: 100, weapon: 25 },
  drone: { rotors: 20 }, hunter: { rotors: 30 }, bomber: { rotors: 20 }, heli: { rotors: 400 },
};
/** A downed drone's blast (M4-62): how far it hurts and how much at its heart, and how far it's heard. */
export const CRASH = { reach: 4, damage: 35, noise: 60, /** a patrol drone's fall, heard (m) */ clatter: 15 };

/** The fixed sensors (M4-11, DESIGN section 7): a motion sensor's cone and reach and the movement it notices (his
 *  speed times how his posture shows him, so a crawl slides under it). */
export const SENSORS = { pir: { fov: 90, range: 10, motion: 0.5 } };

/** The machines' weapons (DESIGN section 6, M4-11, M4-18): rounds a burst (0.1 s apart), seconds from one burst to the
 *  next, damage a hit, how far it reaches (a turret sure within `sure`), its hit chance at best, how far it's heard;
 *  a prod's stun; whether a miss cracks past him (supersonic, M4-54). A rifle burst kills in seconds in the open (M4-54). */
export const WEAPONS = {
  turret: { burst: 1, every: 1 / 4.5, damage: 12, reach: 60, sure: 40, accuracy: 0.7, noise: 150, stun: 0, crack: true },
  rifle: { burst: 3, every: 1.3, damage: 30, reach: 80, sure: 0, accuracy: 0.75, noise: 150, stun: 0, crack: true },
  smg: { burst: 2, every: 1.05, damage: 8, reach: 35, sure: 35, accuracy: 0.4, noise: 100, stun: 0, crack: false },
  cannon: { burst: 6, every: 2.6, damage: 30, reach: 100, sure: 0, accuracy: 0.45, noise: 250, stun: 0, crack: true },
  prod: { burst: 1, every: 1.8, damage: 15, reach: 1.5, sure: 1.5, accuracy: 1, noise: 0, stun: 1, crack: false },
};
export type Weapon = keyof typeof WEAPONS;

/** His blades and bars (DESIGN section 6, M4-20): damage a blow, reach, seconds between blows, how far a blow on a
 *  machine is heard; a takedown's reach, the rear arc it's made from (degrees), how long it takes, how far it's heard. */
/** A blow (M4-20); one that lands on a wall or a thing instead is heard by what it hits (M4-60): metal, hard (concrete,
 *  brick, tile, glass), soft (wood, crates, bags, cloth). */
export const MELEE = {
  knife: { damage: 40, reach: 1.6, every: 0.5, noise: 4, wall: { metal: 3, hard: 2, soft: 1 } },
  crowbar: { damage: 55, reach: 1.9, every: 1.1, noise: 20, wall: { metal: 20, hard: 12, soft: 5 } },
};
export const TAKEDOWN = { reach: 1.5, rear: 120, time: 1, noise: 6 };

/** A quadruped's tag launcher (DESIGN section 6, M4-22): a shot every 6 s at him out to 20 m (beyond its prod's
 *  reach), sticking a tracking tag to his clothes three times in five; its pop heard 15 m round. Found with an SDR
 *  dongle, a tag takes 3 s to pick off. */
export const TAG = { every: 6, reach: 20, near: 1.5, chance: 0.6, noise: 15, remove: 1.2 };
/** Followed home (M4-23, U-013): coming within 25 m of a hideout's bed under 10 s (real) after a machine last had
 *  him in sight, or with a tag on him, or seen while there, gives the hideout away. */
export const TRACK = { near: 25, after: 10 };
/** The raid on a hideout given away (M4-24, DESIGN section 9): between 01:00 and 04:00 that night (game hours), 10 s
 *  (real) from the breaching to their coming in, everywhere within 18 m of where they come in swept; an EMP trap downs
 *  them as they come for 30 s (real); a rubble fall takes 15 s to clear with a crowbar, heard 20 m off. */
export const RAID = { from: 1, to: 4, warn: 10, sweep: 18, emp: 30, clear: 6, noise: 20 };

/** His pistol (DESIGN section 6, M4-21): damage a round, rounds a magazine, the least time between shots, how far it's
 *  heard and reaches, how long a reload takes; its spread in degrees (from the hip, aimed down the sights, more for each
 *  m/s he's moving, less crouched or lying), the aimed sway of his breathing (degrees), each shot's kick up (radians)
 *  and how fast that settles (a second). */
/** The pistol's attachments (U-058): where each goes (one to a place), and what it does: the suppressor's shot heard
 *  `noise` m round, a sight's aimed spread times `aim`, the scope's view at `zoom` times. The magazines' rounds. */
export const MODS: Record<string, { slot: 'muzzle' | 'optic'; noise?: number; aim?: number; zoom?: number }> = {
  suppressor: { slot: 'muzzle', noise: 40 }, reddot: { slot: 'optic', aim: 0.5 }, scope4x: { slot: 'optic', aim: 0.35, zoom: 4 },
};
export const MAGS: Record<string, number> = { mag9: 15, mag9x: 25 };
/** The pump shotgun and the nail gun (M5-18, DESIGN section 6): pellets a shot and each one's damage, their cone
 *  (degrees), what the tube or magazine holds, how far a shot's heard and reaches (m), real seconds between shots and to
 *  load (a shell; the nail gun's strip), and its kick; the nails it takes to pin a door shut. */
export const SHOTGUN = { pellets: 8, damage: 12, cone: 3.5, tube: 5, noise: 180, reach: 50, every: 0.9, shell: 0.5, kick: 0.07 };
export const NAILGUN = { damage: 14, strip: 30, noise: 25, reach: 15, every: 0.3, reload: 1.5, spread: 1.2, kick: 0.01, pin: 4 };
export const PISTOL = { damage: 25, mag: 15, every: 0.15, noise: 150, reach: 150, reload: 1.3, spread: { hip: 2.5, aim: 0.6, move: 0.6, low: 0.7 }, sway: 0.4, kick: 0.035, settle: 6 };

/** How long after a machine has him (Engaged) it tells the network (DESIGN section 5), real seconds: the wired
 *  sensors at once nearly, the cameras in a second, the walkers slowest. */
export const BROADCAST: Record<UnitKind, number> = { turret: 0.5, pir: 0.5, tripwire: 0.5, acoustic: 0.5, camera: 1, sweeper: 1, lamppost: 1, hunter: 1, drone: 1.5, fpv: 1, bomber: 1, spider: 2, colossus: 2, heli: 1, crawler: 1.5, quadruped: 2, delivery: 2, carrier: 2, humanoid: 2.5, heavy: 2 };
/** How far into the districts next to his the network's word of him goes (DESIGN section 5), metres. */
export const SPREAD = 300;

/** Convergence and escalation on contact (DESIGN section 5, M4-14): how near his last known position (metres) the
 *  machines on the ground go to it, the drones fly to it, and the docks launch hunters (one at once, one more every
 *  20 s while the district is Engaged, three a dock at most); how long Engaged before the district's garage sends its
 *  squad of two humanoids. */
/** The troop helicopter's team (M4-92), held in a garage until it's called. */
export const DROP: [UnitKind, number][] = [['heli', 1], ['humanoid', 4], ['quadruped', 3], ['crawler', 3]];
export const CONVERGE = { ground: 250, fly: 400, dock: 500, every: 20, perDock: 3, squadAfter: 45, squad: 2 };
/** Strike drones (M4-47): on each dock, kamikazes and a bomb dropper; sent once a district's been Engaged `after` s (a
 *  kamikaze every `every` s from the nearest dock within `dock` m) and the bomb dropper after `bomberAfter`; a kamikaze
 *  locks on within `commit` m and dives there; a bomb dropper hangs `bombH` over him dropping a grenade every
 *  `bombEvery` s; a blast hurts within `reach` m by how near, `damage` at its heart, heard `noise` m round. */
/** Rockets (M4-65): their speed (m/s), the blast (reach, damage to him at its heart, to a machine at its heart, armour
 *  no help), how far heard; a heavy fires one from its pod every `every` s at him `near` to `far` m off; his launcher's
 *  blast heard `noise` m round. */
export const ROCKET = { speed: 45, life: 4, reach: 6, damage: 70, machine: 420, noise: 200, every: 9, near: 20, far: 120 };
export const STRIKE = { fpvs: 2, bombers: 1, after: 25, every: 15, bomberAfter: 40, dock: 600, commit: 8, bombH: 12, bombEvery: 4, fpvBlast: { reach: 5, damage: 60 }, bomb: { reach: 4, damage: 45 }, noise: 120 };

/** A patrol drone's battery (M4-08, DESIGN section 7): 6 real minutes in the air, the first and last 20 s of them
 *  flying out from its rooftop dock and home again, then 2 minutes on the dock charging: the gap in its cover. */
export const DRONE = { flight: 360, charge: 120, launch: 20 };

/** A sweeping camera pans 45 degrees either side, 10 s each way (M4-07). */
export const SWEEP = { arc: 45, pass: 10 };

/** The columns out of the factory (M4-01b, U-030, U-031): their marching pace, a squad out of each gate every so
 *  often (real seconds), the bounding cycle (one fire team moves at double pace while the other holds, then they
 *  swap), and each squad's members: where in the formation (to the side, back from its head) and in which team (2
 *  keeps the pace). Six humanoids in two staggered files, a quadruped on each flank, a carrier in the middle, a drone
 *  over them. The last two humanoids peel off into an alley on the way and run to catch up. */
export const COLUMN = {
  pace: 1.6, every: 150, bound: 12, peel: [4, 5], look: 8,
  squad: [
    { kind: 'humanoid', side: -1.8, back: 0, team: 0 }, { kind: 'humanoid', side: 1.8, back: 2, team: 0 }, { kind: 'humanoid', side: -1.8, back: 4, team: 0 },
    { kind: 'humanoid', side: 1.8, back: 10, team: 1 }, { kind: 'humanoid', side: -1.8, back: 12, team: 1 }, { kind: 'humanoid', side: 1.8, back: 14, team: 1 },
    { kind: 'quadruped', side: -4, back: 3, team: 0 }, { kind: 'quadruped', side: 4, back: 13, team: 1 },
    { kind: 'carrier', side: 0, back: 8, team: 2 }, { kind: 'drone', side: 0, back: 7, team: 2 },
  ] as { kind: UnitKind; side: number; back: number; team: number }[],
};

/** A beat's pauses (real seconds): at its ends, where it looks into an alley, where it goes into a building. */
export const DWELL = { end: 6, alley: 8, inside: 12, tunnel: 90 };
/** Moving like they're alive (M4-59): a walker stops to look at a door, a bin or down a side street within `near` m of its way at most every
 *  `every` m, for `look` s, turning its head `sweep` rad either side; on the move it drifts up to `drift` m off the
 *  line. A drone drops to look over a building face (`face` m out from it, `faceLook` s) at every third point of its line (up to `faces`),
 *  and weaves `weave` m either side of its line and `bob` m up and down. */
export const ALIVE = { near: 12, every: 35, look: 2.5, sweep: 0.6, drift: 0.5, face: 4, faceLook: 3, faces: 30, weave: 3, bob: 1.5 };
/** A run's units start each somewhere else along their loops: at most this share of a loop out (M4-01). */
export const PHASE = 0.08;

/** What each kind sees (DESIGN sections 5 and 7): its cone (degrees, and pitched down for a drone's), how far by
 *  day and by night, its eyes' height over its feet, an infrared floor on the light it needs (0 for none), the
 *  half-angle of a searchlight's spot along its cone that lights him by night (the drones'), how far its thermal
 *  sight reaches at night, how well it hears. */
export const SENSES: Record<UnitKind, { fov: number; pitch: number; day: number; night: number; eye: number; ir: number; lamp: number; thermal: number; hear: number }> = {
  quadruped: { fov: 120, pitch: 0, day: 30, night: 20, eye: 0.85, ir: 0, lamp: 0, thermal: 20, hear: 1.5 },
  humanoid: { fov: 100, pitch: 0, day: 40, night: 22, eye: 1.8, ir: 0.3, lamp: 0, thermal: 0, hear: 1 },
  heavy: { fov: 110, pitch: 0, day: 45, night: 25, eye: 2.8, ir: 0.3, lamp: 0, thermal: 25, hear: 1 },
  drone: { fov: 100, pitch: 45, day: 35, night: 30, eye: -0.1, ir: 0, lamp: 15, thermal: 30, hear: 0.8 },
  hunter: { fov: 100, pitch: 45, day: 35, night: 30, eye: -0.1, ir: 0, lamp: 15, thermal: 30, hear: 0.8 },
  fpv: { fov: 90, pitch: 30, day: 40, night: 30, eye: 0, ir: 0, lamp: 0, thermal: 40, hear: 0.5 },
  bomber: { fov: 100, pitch: 60, day: 35, night: 30, eye: -0.1, ir: 0, lamp: 0, thermal: 30, hear: 0.8 },
  spider: { fov: 200, pitch: 35, day: 80, night: 50, eye: 21, ir: 0.3, lamp: 0, thermal: 40, hear: 1.2 },
  colossus: { fov: 120, pitch: 30, day: 70, night: 40, eye: 9, ir: 0.3, lamp: 0, thermal: 45, hear: 1 },
  heli: { fov: 140, pitch: 55, day: 90, night: 70, eye: -1, ir: 0.3, lamp: 20, thermal: 60, hear: 0.4 },
  crawler: { fov: 220, pitch: 0, day: 25, night: 18, eye: 0.3, ir: 0.5, lamp: 0, thermal: 20, hear: 1.5 },
  delivery: { fov: 120, pitch: 0, day: 18, night: 10, eye: 0.5, ir: 0, lamp: 0, thermal: 0, hear: 1 },
  carrier: { fov: 120, pitch: 0, day: 25, night: 15, eye: 1.2, ir: 0.3, lamp: 0, thermal: 0, hear: 1 },
  // The cameras (M4-07): fixed ones over doors and at junctions, sweepers at plazas and gates, the smart lampposts'.
  camera: { fov: 70, pitch: 25, day: 30, night: 18, eye: 0, ir: 0.3, lamp: 0, thermal: 0, hear: 0 },
  sweeper: { fov: 60, pitch: 20, day: 30, night: 18, eye: 0, ir: 0.3, lamp: 0, thermal: 0, hear: 0 },
  lamppost: { fov: 90, pitch: 35, day: 22, night: 14, eye: 0, ir: 0, lamp: 0, thermal: 0, hear: 0 },
  // The fixed sensors (M4-11): a turret sees far, thermal by night; the others don't see as cameras do.
  turret: { fov: 90, pitch: 10, day: 60, night: 45, eye: 0, ir: 0, lamp: 0, thermal: 45, hear: 0 },
  pir: { fov: 0, pitch: 0, day: 0, night: 0, eye: 0, ir: 0, lamp: 0, thermal: 0, hear: 0 },
  tripwire: { fov: 0, pitch: 0, day: 0, night: 0, eye: 0, ir: 0, lamp: 0, thermal: 0, hear: 0 },
  acoustic: { fov: 0, pitch: 0, day: 0, night: 0, eye: 0, ir: 0, lamp: 0, thermal: 0, hear: 2 },
};

/** Hearing him (DESIGN section 5): a noise is heard within its radius times the unit's hearing (its rotors dull a
 *  drone's), x0.6 through walls; gunfire and explosions are hostile, and the hive searches round them. */
/** Thermal sight at night (DESIGN section 5): his heat shows as full light within a unit's thermal range, a tenth
 *  of it under a mylar blanket, three tenths wet, none deeper than a metre in water. */
export const THERMAL = { mylar: 0.1, wet: 0.3, deep: 1 };
export const HEARING = { occluded: 0.6, /** real s a sight of him outweighs machine fire heard */ fresh: 5, /** a noise heard this far off or further (m) scares a delivery robot off its route (M4-34), and how far it goes */ scare: 40, flee: 30, hostile: new Set(['pistol', 'shotgun', 'grenade', 'firecrackers', 'explosion', 'gunfire']) };

/** Seeing him (DESIGN section 5): awareness climbs at RATE x visibility a second while he's visible at all (MIN),
 *  falls at DECAY a second otherwise; how much each posture and each way of moving shows. */
export const SIGHT = {
  rate: 2.5, min: 0.04, decay: 0.15, /** how much faster it climbs in a Heightened district (M4-16) */ heightened: 1.3,
  /** within this far (m) of him, level with him, a machine bumps into him whichever way it faces, however dark */ touch: 1,
  posture: { stand: 1, crouch: 0.55, crawl: 0.3, hang: 0.8, hidden: 0 },
  motion: { still: 0.4, crawl: 0.45, crouch: 0.6, jog: 0.85, fast: 1 },
};
