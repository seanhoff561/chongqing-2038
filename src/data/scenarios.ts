// Scenarios: set-up situations loaded with ?scenario=<name>. The world builder names come from src/world/build.ts.
export interface Scenario {
  name: string;
  world: string;
  desc: string;
  /** optional spawn override: a point, or the name of one of the world's teleports */
  spawn?: { x: number; y: number; z: number; yaw: number };
  at?: string;
  /** a fresh run (U-013, U-018): supplies in the backpack, starting in the friends' hideout; saves on sleep */
  run?: boolean;
  /** the furnished test shelter: stocked stash, battery */
  furnished?: boolean;
  /** draw distance in metres (default 160) */
  draw?: number;
  /** 0 clear to 1 flat overcast light (until the weather schedule drives it) */
  overcast?: number;
  /** the hour it starts at (default the run's 06:00), and dev flags it starts with (the machines' lineup) */
  hour?: number;
  /** the day it starts on (default 1), and the snow lying as it starts (U-097) */
  day?: number;
  cover?: number;
  flags?: Partial<import('../sim/types').SimState['flags']>;
  /** a machine already on him as it starts, to escape from (M4-32) */
  pursuit?: import('../sim/pursuit').Pursuer;
  /** the run ending on this route as it starts, its sequence played (M7-15) */
  ending?: string;
}

export const scenarios: Scenario[] = [
  { name: 'gym', world: 'gym', desc: 'movement gym with labelled obstacles' },
  { name: 'shibati', world: 'yuzhong', desc: 'Shibati and Jiaochangkou: the top of the Eighteen Stairs', overcast: 0.6, at: 'shibati' },
  { name: 'run', world: 'yuzhong', desc: "a new run: day 1, 06:00, in the friends' hideout under the vent grate", run: true, overcast: 0.6 },
  { name: 'hideout', world: 'hideout', desc: 'the furnished air-raid shelter (test scene)', run: true, furnished: true },
  { name: 'yuzhong', world: 'yuzhong', desc: 'Yuzhong at 1:1 from the real ground and map, from Jiefangbei', overcast: 0.6, at: 'jiefangbei' },
  { name: 'tunnels', world: 'yuzhong', desc: 'the Grand Tunnel under Yuzhong, at the junction of its north passage', overcast: 0.6, at: 'Tunnel junction (north passage)' },
  // The pursuits (M4-32): a drone on him at the top of the Eighteen Stairs, a quadruped coming for him by the alleys there
  // (the friends' hideout's grate among them), a camera that has him at Jiaochangkou; each by day, to be escaped.
  { name: 'pursuit-drone', world: 'yuzhong', desc: 'a drone tailing him at the top of the Eighteen Stairs: get away', overcast: 0.5, at: 'shibati', hour: 14, pursuit: 'drone' },
  { name: 'pursuit-dog', world: 'yuzhong', desc: 'a quadruped coming for him by the alleys at the top of the Eighteen Stairs: get away', overcast: 0.5, at: 'shibati', hour: 14, pursuit: 'quadruped' },
  { name: 'pursuit-camera', world: 'yuzhong', desc: 'a camera has him at Jiaochangkou: get out of sight before they come', overcast: 0.5, at: 'jiaochangkou', hour: 14, pursuit: 'camera' },
  // The four endings (M7-15), each played from where its route comes out.
  { name: 'ending-bridge', world: 'yuzhong', desc: 'Beneath the Bridge: the ending of the rail-deck route', at: 'xiaoshizi', hour: 6, overcast: 0.8, ending: 'bridge', flags: { god: true } },
  { name: 'ending-cable', world: 'yuzhong', desc: 'The Cable: the ending of the cableway route', at: 'cablewayNorth', hour: 19, overcast: 0.6, ending: 'cable', flags: { god: true } },
  // Every district and site (M6-25), from its teleport; each site at its main way in.
  { name: 'jiaochangkou', world: 'yuzhong', desc: 'Jiaochangkou junction', overcast: 0.6, at: 'jiaochangkou' },
  { name: 'hongyadong', world: 'yuzhong', desc: 'Hongyadong on the Jialing cliff', overcast: 0.6, at: 'hongyadong' },
  { name: 'xiaoshizi', world: 'yuzhong', desc: 'Xiaoshizi and Xinhua Road, toward the Dongshuimen Bridge', overcast: 0.6, at: 'xiaoshizi' },
  { name: 'chaotianmen', world: 'yuzhong', desc: 'Chaotianmen at the tip, where the rivers meet', overcast: 0.6, at: 'chaotianmen' },
  { name: 'site-construction', world: 'yuzhong', desc: "the construction site and its tower crane", overcast: 0.6, at: 'Construction site' },
  { name: 'site-hospital', world: 'yuzhong', desc: 'the hospital, at its ambulance-bay door (M6-11)', overcast: 0.6, at: 'Yuzhong Hospital: card' },
  { name: 'site-police', world: 'yuzhong', desc: 'the police station, at its front door (M6-12)', overcast: 0.6, at: 'Police station: card' },
  { name: 'site-market', world: 'yuzhong', desc: 'the electronics market, at its loading door (M6-13)', overcast: 0.6, at: 'Electronics market: door' },
  { name: 'site-telecom', world: 'yuzhong', desc: 'the telecom exchange, at its front gate (M6-14)', overcast: 0.6, at: 'Telecom exchange: card' },
  { name: 'site-substation', world: 'yuzhong', desc: 'the Xinhua Road substation, at its gate (M6-15)', overcast: 0.6, at: 'Xinhua Road substation: card' },
  { name: 'snow', world: 'yuzhong', desc: 'a snowy winter morning at the top of the Eighteen Stairs (U-097)', at: 'shibati', day: 50, hour: 10, cover: 1, overcast: 0.9, flags: { snow: 0.8, god: true } },
  { name: 'ending-boat', world: 'yuzhong', desc: 'Into the Fog: the ending of the river route', at: 'chaotianmen', hour: 3, overcast: 0.9, ending: 'boat', flags: { god: true } },
  { name: 'ending-tunnel', world: 'yuzhong', desc: "Tunnel's End: the ending of the underground route", at: 'Tunnel junction (north passage)', hour: 5, overcast: 0.9, ending: 'tunnel', flags: { god: true } },
  { name: 'units', world: 'lineup', desc: "the machines' lineup: every kind on a plaza at noon, walking their beats at him", hour: 12, flags: { god: true, clear: true }, overcast: 0.4 },
  { name: 'reference', world: 'reference', desc: 'the reference hillside (docs/reference/look-01.jpg) from the vantage roof', draw: 700, overcast: 1 },
];

export const scenarioByName = (n: string) => scenarios.find(s => s.name === n);
