# Chongqing 2038: design

How everything in the game works, or will work: the director's notes up to U-104 are all in here. docs/PROGRESS.md says what's built so far. Live numbers are in `src/data` and win over this file once tuned.

## 1. The game

Li Wei wakes in a hideout under occupied Chongqing in 2038 and has to get out of the city. Parkour, climbing and scavenging in a 1:1 Yuzhong peninsula built from the real map; machines that patrol on learnable schedules and hunt him as one mind when they see him; a mystery told only through places and the things people left in them.

- **Learn the machine.** The city and the machines' patrols are the same every run: timings, blind spots, battery gaps and routes are knowledge he keeps.
- **The vertical city is the toolkit.** Every block offers a street route, a rooftop route and an underground route; tools open new lines through it.
- **Seen is survivable, but it costs.** Kill on sight, then a search that closes in. Escape is hard and always possible.
- **Little on screen.** No minimap, quest markers, meters, hints or tutorial text. Nothing tells him how to open a lock or what a tool is for; he finds out by trying (U-104). The body, the world and the laptop carry the information.
- **Every tool, two uses; no tool, every answer.** Several ways into every place, several ways out of the city.
- **Curiosity is the progression (U-104, Outer Wilds).** Mysteries he can see and wants to investigate, not exposition or objectives. Every meaningful discovery answers a question, raises another, overturns an assumption or shows him something he can act on. Knowledge unlocks possibilities, never invisible quest flags: if he works something out on his own he can act on it without the intended clue. Clues are things people made for their own reasons, connected across places, with more than one path to anything important, so he can explore in any order, miss things and still progress. Discoveries persist and interpretations are his.

## 2. Story and discovery (U-104)

**The opening.** No cutscene. A new run fades in from black: Li Wei lying on his back in the hideout at night, looking up, the room flooded with blue light. He looks round: debris everywhere, a crate ("Crate": he doesn't know whose hideout it is) and a table to one side, rubbish heaped where a way out was (impassable, unlabelled), and in the middle a shaft of blue light coming down through a hole with a ladder up into it. Beside him his backpack, the laptop open on top. On it a girl drawn in anime style (straight black hair to her shoulders, a white collared shirt) looks at him and speaks in a robotic voice (the street speakers' voice, clear, as if in his headphones), English subtitles:
- "You woke up... I thought you were dead 哈哈哈" (a pause, she leans closer) "Seems like you hit your head pretty hard, what do you remember?" (a pause) "If you don't say anything I'm not going to help you. Hmph!"

The screen blips to black and he has control. He takes the laptop and puts on the bag by interacting with them; then "Tab to open laptop" shows, once. Opening it, Anna is mid-sentence: "-all going to die anyways... HEY!!! You can't just turn me on like that without a warning!" (she turns red) "A-anyways... what I was saying is you, Li Wei, are gonna die. Got a problem with that?" (arms crossed, thinking) "Lets see... starvation, gunshots, death by falling... you're cooked 哈哈哈" "But try not to worry too much. You've lasted much longer than most. In fact, I must admit that your slipperiness and sliminess is quite unmatched." She leaves the full screen for the laptop's corner. "This is the status page. Now, I know your thick skull can't understand what's going on here, but that's OK." "If you really don't remember anything, though, I'd highly recommend the training room. It'll get you back in shape real fast." "All you have to do is focus with Q and then click the dots on the side here, got it?"

**Anna.** An AI on his laptop, drawn as a small animated girl in its corner (idle, blinking, waving, laughing, pouting with her arms crossed, blushing), switched frame by frame like a gif. She speaks only: in the opening scene; the first time he turns to each laptop tab (a short snarky line about it); and when the map gains a key place. Those are the game's only subtitles: English, one size. The first time he opens the map: "This is the map. Should be helpful if you've got a specific place you want to go. One thing though..." (the family flat appears on the map) "I really wouldn't recommend visiting this place. Some things are better left forgotten 哈哈哈".

**Key places.** The named places (the Li family flat, the sites, the exits' approaches) are not on the map at the start. A clue that names or shows one (a document, a note, a sign) marks it the next time he opens the map, with Anna's line on it; walking into one marks it. They are (`src/sim/places.ts`): the five sites (in the building's footprint), the construction site, the river-police pier, the Grand Tunnel, the air-raid shelter, where the Grand Tunnel meets the metro, Jiefangbei station, the Li flat, the river steps below Chaotianmen, the cableway's north station, the Dongshuimen Bridge's bridgehead, and each metro entrance (found only by walking in). Each document and note of Xiaoyu's lists the places it names (`names`); carrying it marks them. Each is kept in the run with the game time he learned of it (`s.known`); the map coming up says Anna's line on each learned since he last put it away (`s.mapAt`; data/dialogue.ts `MAP_LINES`) and rings it till then. The first look at the map marks the flat. Each key place has its own hand-designed layout, a maze like the generated buildings (stairways, locked doors, collapses) but its own, and tells part of the story through what's in it: the Li family flat tells what happened to his family; other places tell how life went on and how the city came to this. The flat (an upper floor near the top of Shibati's stair, its rooms found by flooding the floor from the stair landing with its doors shut) holds, before the ransack goes over it: two bedrolls slept in and a third laid out and never slept in in its biggest room; dinner for three on a table by the room he's put in, two bowls eaten from, his father's under a plate, the registration reminder beside it; a calendar on that room's wall crossed off to the 13th; two packed bags by the stairs (Xiaoyu took hers); two children's height marks inside a door frame; Xiaoyu's desk with a city map and a way drawn on it, her note beside it. The table and desk are solid, placed only where every room and cupboard can still be walked to.

**Found documents.** Worldbuilding documents turn up now and then in homes, offices, workshops and military posts, each something a person there would have written or kept, each fitting where it's found (a journal page about sneaking into the sewers through the basement grate only in a home with one), never twice in a world. Story documents lie at the key places. Each is an item: hovered in the backpack it shows its title and its whole text. 29 worldbuilding documents (homes, shops, offices, workshops, clinics, military posts; one needs a basement drain grate, four a district) and 12 story ones (the five high-security sites, the construction site, the pier, the Grand Tunnel, the air-raid shelter, the metro, the cableway, the Li family flat), all in `src/data/documents.ts`. As a run starts each worldbuilding one goes into one container picked by the run's seed among those that fit, and is in it when it's first searched; a site's story document goes into the container its layout keeps for it, the others lie at their place (the flat's on its table, the shelter's on a restaurant table, the metro's on the control room's desk, the pier's on its watch room's desk, the site's on its manager's desk; the cableway's is in its control desk's drawer). Written to be specific and human, never generic. Two examples from the director: *Deepmind Article*: "China pulls ahead of the US in the race to ASI! Millions of Chinese celebrate, many call for 'an end to poverty.'" *Journal Page*: "Wei and I snuck into the sewers through the old grate in the basement... it was so dark, if only we had a light..."

**His sister (M10-39).** Xiaoyu is alive and gone. As a run starts its seed picks the exit she has gone to (one of the four, on a stream of its own so no other draw moves), and her trail is laid: three notes in her hand (`src/data/sister.ts`), the first on her desk in the flat beside the map, the others on the floor at two places she stopped on her way, then her, waiting at the exit. Each note says where she went next only as a clue (somewhere the family knows: "the man who fixed my phone screen, the one who buys dead drones", "Dad's work") and what she learned there about getting out, never all of it, so he pieces it together, always a step behind her; the places are the ones that matter for that exit. Her mother went down to Jiaochangkou on the 14th to ask about their father and didn't come back; Xiaoyu waited, then left.

| Exit | Her notes lie at | She waits at |
|---|---|---|
| Bridge | her desk; the electronics market's loading dock (the jammer's parts, the bridgehead's box); the substation's back fence (his father's gloves) | Xiaoshizi, where Line 6 comes out to the bridge |
| Cableway | her desk; the air-raid shelter (the parked cabin needs power); the substation's back fence (the feeder's one spare fuse) | the cableway's north station, in the parked cabin |
| River | her desk; the police station's garage shutter (the key cabinet); the river-police pier by the crane (boat 3 dry, no battery; the buoys) | the riverfront steps below Chaotianmen, waiting for fog |
| Underground | her desk; where the Grand Tunnel meets the metro (the shut steel door, the water, they feel footsteps); Jiefangbei station (the card gone) | the running tunnel east of Jiefangbei |

She sits against the wall (low-poly: a dark padded jacket, jeans, her bag, black hair to her shoulders). E on her: she'll come (she stands, "Xiaoyu will come"); E again: she stays. The run's ending records whether she left with him: only at her exit, and only if she said she'd come (`s.ended.sister`, the ending event's `sister`).

**Endings.** Each exit has its own ending (section 10), with or without his sister: walking into its far end's zone (`ending:<route>`, `src/world/yuzhong/exits.ts`) ends the run. The sequence: the view lifts away letterboxed while he and Anna have their last exchange (with Xiaoyu there, the last two lines hers and Anna's; `data/dialogue.ts`), then the summary screen: the ending's name, the crossing and the far side, his last words alone or with her (`data/endings.ts`), and the run's tally (`s.stats`: nights survived, km on foot, machines destroyed, times seen, sites got into, documents found, with or without Xiaoyu). The far ends: the Nan'an end of the Dongshuimen Bridge's deck; out over the Yangtze on the cableway's line at the cabins' height; the open river past Chaotianmen's tip, downstream of the buoys; the running tunnel's level east of the crossover under Xiaoshizi. The bridge's is on its deck today, and the river's is reached in the patrol boat (M7-08 to M7-10; tests/sim/routec.test.ts takes the route from a fresh run); the cable's and the tunnel's wait for their routes (M7-05 to M7-07, M7-11).to reach them.

## 3. Controls and settings (U-104)

Movement keys are fixed: WASD to move, the mouse to look, Space to jump, the left and right mouse buttons for the left and right hand (and using a held item), 1 to 5 for the hotbar (0 or ` empty hands), Esc for settings. The rest are rebindable, to any key or to mouse buttons 4 and 5 (which never take the browser back or forward; Alt never opens the browser's menu):

| Action | Default |
|---|---|
| Sprint | Shift |
| Crouch (slide while sprinting) | Ctrl |
| Crawl | C |
| Interact (hold for timed actions) | E |
| Lean / Tab Left (with the laptop out: the page before) | Mouse4 |
| Lean / Tab Right (the page after) | Mouse5 |
| Reload, and rotate an item while dragging it | R |
| Headlamp / Focus Laptop (with the laptop out: sit down at it) | Q |
| Chimney | X |
| Sleep Rough (hold) | Z |
| Laptop | Tab |
| Backpack | Alt |

There is no "let go" key: a hand lets go when its button is released.

**Settings.** Esc in play, and Settings on the main menu, open the same panel, centred, ice blue on near-black, and nothing else is in it, top to bottom: 设置 SETTINGS; 继续 Resume (in play: closes it, the mouse taken back; U-105); 主菜单 Menu (last sleep saved); 音量 Volume (one master slider, long); 灵敏度 Sensitivity (long, a fairly low default); 按键 Keys (the twelve above). With `?dev=1` it also has toggles for the dev UI and the crosshair, for filming. Settings is a panel over the running game: the world goes on (he can be hurt and die), only his own movement and look stop. Esc closes it. Closing any menu takes the mouse back for looking round. Graphics are medium for everyone.

**Prompts.** Looking at something he can act on shows its name alone (门 Door), never a key or a hint. A locked door gives no word, only a click; an unlocked door opens at once.

**Menus.** Esc closes any menu (backpack, laptop, crafting, sleep, settings), and so does the key that opened it. The sleep menu lists wake times, each saying how many hours he'll sleep and the time he'll wake; there's no stay-awake button.

**Hands.** Both 3D hands are always on screen. On his feet they sit low and swing with his stride; in the air, on walls and crawling they reach forward and close on what they grip. Items sit in the right hand; anything bigger than a 1x1 item under 0.4 kg (and the knife) also takes the left, so climbing means putting it away with 0 first.

## 4. Movement

Parkour with the legs, climbing with the hands (U-002 to U-005). His collision is an axis-aligned box 0.5 m wide. All values live in `src/data/movement.ts`.

| Parameter | Value |
|---|---|
| Heights (stand / crouch / crawl and slide / curled in a box) | 1.75 / 1.10 / 0.50 / 0.75 m (eye 1.62 / 0.98 / 0.38 / 0.55) |
| Speeds (jog / sprint / crouch / crawl) | 3.2 / 7.0 / 1.6 / 0.8 m/s; no running stamina (U-003) |
| Ground accel / air accel | 30 / 4 m/s^2; in the air he steers and slows but never speeds past his take-off speed |
| Jump | take-off 3.55 m/s (apex about 0.63 m, 9.81 m/s^2); at a sprint 88% of the speed carries; releasing Space while rising cuts it (a tap is about 40% of the height); 0.03 s coyote time |
| Auto step-up | 0.45 m (stairs are invisible ramps under the visible steps) |
| Steep ground (U-020) | slopes over about 45 degrees are walls: he can't walk up them, slides off them and uses the wall moves on them |
| Too fast (U-020) | above 15 m/s (a fall of about 12 m) a grab tears loose (6 damage) and wall kicks, runs and clings are refused |
| Space hop | onto a ledge 0.5 to 1.2 m above the feet, 0.35 s |
| Vault | 0.5 to 1.2 m high, at most 1.2 m deep, at 2.5 m/s or more: 0.45 s, keeps 85% speed; over a parapet with a drop beyond he flies on with a 1.8 m/s lift; window openings (1.4 x 1.9 m, sill at 0.8 m) take a hop or a vault |
| Slide | Ctrl at 6 m/s+ (3 m/s+ down a grade of 0.2+): starts at 7.5 m/s, friction 3.5 m/s^2, gathers speed downhill (to 14 m/s); 0.5 m tall; releasing Ctrl stands him up keeping 80% speed |
| Crawl | passes 0.6 m gaps |
| Window corners (M10-29) | a hop or pull-up beside a jamb lands up to 0.3 m along the sill, in the opening; Ctrl held at an edge keeps half a move only where he fits; hanging while crouched in an opening moves him crouched until there's room to stand: never wedged in the frame |
| Wall cling | moving into a wall in the air holds him 0.35 s sliding 1.4 m/s, once per wall per airtime, keeping his speed along it |
| Wall moves (Space in the air within 0.8 m of a wall, 2 per airtime) | facing it: up-kick +4.6 m/s; along it at 5.5 m/s+: wall-run up to 3 steps (0.9 s) at 6.5 m/s, 60% gravity; facing away: kick off at 5.5 m/s toward the camera |
| Grab | hold a mouse button looking at a lip, sill, pipe, rung, pole, branch or vine within 1.6 m of the eye and 0.2 to 2.2 m above the feet (2.8 m with a jump, about 3.8 m with an up-kick) |
| Hanging | gravity off; the hands are a force-limited spring (one hand 35 m/s^2, two 80) toward a spot under them; momentum carries |
| Pull up / over | W pulls up, S lets the arms out; mouse drags move the body (drag down hauls up); near a lip top with room above, W climbs over (0.7 s) |
| Push-off from a hang | Space with wall under the feet: looking up dynos +4.6 m/s, else kicks off by the camera |
| Bars and laches | no wall under the feet: he swings; Space pumps 1.6 m/s toward the camera, max 6.5 m/s; letting go keeps the swing |
| Grip endurance | 100; drains 6/s one hand, 2/s two, half on ladders, double with a splinted arm; at 0 the hands slip until it refills (30/s with free hands) |
| Climbing | pipes, ladders, street poles, tree trunks and vines are grabbable anywhere along them: hand over hand. U-104: no added poles; at world build each big tree's trunk (to the crown), lamppost and camera pole (to under its head) and wall vine gets a climbing line on its surface |
| Safe drops | 7 m (every fall lands as a roll did: U-054) |
| Hide in a box | E at a box, crate, dumpster or cabinet with room inside: 0.6 s in, 0.5 s out |
| Swimming | surface 1.4 m/s (sprint 2.2), dive with Ctrl, breath 40 s then 8 HP/s; climbs out onto banks up to 0.6 m |
| Encumbrance | over 15 kg: sprint and jump -15%; over 25 kg: no sprint, no wall moves, no pulling up |
| Sound | each movement has one fixed cue (U-004); footsteps by surface, kept low and soft (U-100) |

**Falls** (h = fall height): up to 7 m nothing; 7-10 m: (h-7) x 8 damage, 40% sprain; 10-12 m: (h-4) x 10 and a broken bone; over 12 m: death. A soft landing (bags, bins, cardboard, an awning) halves h.

**The movement envelope (M3-50)**, measured from the sim (`src/data/envelope.ts`; `tests/sim/envelope.test.ts` re-measures it); comfortable is late, imperfect input, max is ideal:

| Move | Comfortable | Max |
|---|---|---|
| Standing jump (gap) | 2.35 | 2.75 |
| Running jump (gap) | 6.05 | 6.55 |
| Hop onto a ledge, no hands | 1.35 | 1.5 |
| Mantle from standing / after a jump (lip) | 1.98 / 2.52 | 2.2 / 2.8 |
| Run-up wall kick and grab (wall top) | 3.8 | 3.85 |
| Wall-run (gap) | 12.7 | 13.3 |
| Slide on the flat / down a 0.2 grade | 5.97 / 13.36 | 6.63 / 14.84 |
| Safe drop (onto bags, bins, awnings) | 6.3 (7.2) | 7 (8) |
| Lache (bar spacing) | 6.05 | 6.2 |
| Jump and two wall kicks in a 2 m chimney (lip) | 5.85 | 5.95 |
| Wall-run into a kick off the wall (gap) | 18.05 | 18.15 |

## 5. Survival, health, time and saving

**Clock.** A game day is 36 real minutes (an hour is 90 s). A run starts in late autumn, on day 1 at night. Dawn 05:30-06:30, day to 18:30, dusk to 19:30. Weather follows a seeded schedule: morning fog, rain in spells of 1-4 hours, snow some winter days (lying and melting). In autumn the trees turn and drop their leaves, which lie over the grass and patches of the ground.

| Need | Drain (per game hour) | Below 20 | At 0 |
|---|---|---|---|
| Satiety | 4 (x1.5 sprinting) | slower recovery, stomach sounds, no natural healing | -2 HP/h |
| Hydration | 5 (x1.2 hot afternoons, x1.5 sprinting) | blur | -5 HP/h |
| Energy | 5 awake, +12.5 asleep | blur, vignette, slow blinks, sprint -20% | he collapses asleep where he stands |

**Health** is 100 HP; +1 HP a game hour awake when fed and watered, +3 asleep.

| Injury | Cause | Effect | Treatment |
|---|---|---|---|
| Light bleeding | graze, glass, fall | 0.2 HP/s; clots after 90 s | bandage |
| Heavy bleeding | direct hit (30%) | 1.0 HP/s, never clots | tourniquet or first-aid kit |
| Sprain (leg) | fall, rare hit | no sprint, half jump | heals in 36 game hours; painkillers hide it 4 h |
| Broken leg | big fall | limp 1.5 m/s, no jump, mantle 1.0 m | splint makes it a sprain-level limp; 7 days |
| Broken arm | fall onto an arm | no pipes, ropes or hanging; aim sway x3 | splint allows slow climbing; 7 days |
| Food sickness | spoiled food, raw pork | 12 game hours: vomiting, no healing | time and water |

His state shows through breathing, heartbeat, blur, vignette, limp and stomach sounds, a small body figure bottom left while something's wrong, and the laptop's Status page (hover an injury, sitting, for what it is and how it's treated).

**Sleep.** At a bed, or rough anywhere (hold Z: 40% less rest, exposed): the sleep menu's choices each say the hours and the wake time. Sleep is a time skip: needs drain at sleep rates, healing applies, machines keep their schedules.

**Saving and death (U-104).** One save in localStorage (the desktop app: its own storage), written as a run starts and each time he wakes from sleep in a bed or rough (not a collapse); nothing else saves. Dying shows what killed him and the run's death count (a skull and the number, also on the laptop by the date and time) for 3 s or until a key or click, then he wakes as he was at his last save. The count is written into the save at once, so no reload rolls it back; a new run starts it at 0. Menu in settings goes to the main menu without saving: Continue wakes him at the last save. A run seed drives loot, food ages, weather, his sister's exit and small patrol offsets; the city and the patrol logic never change.

## 6. The machines

### Senses
Each unit keeps an awareness per tick: `rate = 2.5 x V` a second when V >= 0.04, else decay 0.15/s. At 0.3 the unit is Suspicious, at 1.0 Engaged. `V = exposure x light x posture x motion x falloff x weather`:

| Factor | Values |
|---|---|
| exposure | the share of 5 body points inside the cone in clear sight |
| light | day 1.0, dusk 0.5, night 0.12, plus local lights (lampposts 0.6 within 8 m, neon 0.35 within 5 m, searchlight 1.0, his headlamp 1.0 white or 0.4 dim blue, the laptop's glow 0.5 at night); IR floors it for cameras and humanoids (0.3); thermal units ignore light |
| posture | standing 1.0, crouched 0.55, crawling 0.3, hanging 0.8, curled in a box 0 (unless searched) |
| motion | still 0.4, crawl 0.45, crouch-walk 0.6, jog 0.85, sprint, parkour or airborne 1.0 |
| falloff | 1 - (d / range)^2 |
| weather | range x0.75 light fog, x0.45 heavy fog, x0.85 rain |
| thermal | at night within thermal range light counts as 1.0; x0.1 under a mylar blanket, x0.3 wet, 0 deeper than 1 m in water |

Hearing: every noise has a radius; a unit hears it within radius x its hearing (x0.6 through walls). Footsteps: crawl 1, crouch 2, jog 8, sprint 16 m (half in rain); landing hard 15; vault 6; crowbar 20; glass 35; pistol 150; shotgun 180; grenade 250. Gunfire and explosions start a search centred on them.

### Alert states (per district)

| State | Enter | What happens | World shows |
|---|---|---|---|
| Unaware | default | schedules | lights cool white |
| Suspicious | 0.3, a noise, or a unit gone silent | that unit investigates, scans 8 s, returns | its light amber |
| Engaged | 1.0 | armed units fire; after the broadcast delay his position goes to the network, live while any unit sees him | district lights red, LED boards on alert, sirens |
| Searching | unseen 4 s | the hive sweeps the search area for 150 s after the last contact | lights pulse red-orange |
| Heightened | the search ends without contact | +50% patrols, every camera active, awareness x1.3, until 06:00 | lights steady amber |

Broadcast delays: turret 0.5 s, camera 1.0, hunter drone 1.0, patrol drone 1.5, quadruped 2.0, delivery robot 2.0, humanoid 2.5. **Convergence:** on contact ground units within 250 m path to the last known position, drones within 400 m fly to it, docks within 500 m launch hunter drones (one more every 20 s, three a dock), and after 45 s a squad of two humanoids leaves the district's garage. **Search:** from the last known position and heading, a disc growing 6 + 3t m (max 140), searchers checking hiding spots they pass (60%), drones spiralling with searchlights. **Silent units:** one disabled while alert doesn't report; 12 s later the nearest drone and ground unit come to look. **Jamming:** a jammer cuts the link within 25 m; over 20 s it's a beacon. **Tracking (U-104: no raids).** Coming home with a machine's eyes on him in the last 10 s, with a tracking tag on him, or seen there gives that hideout away. Tracked (a tag on him anywhere, or at a hideout given away), his position goes to the network every 10 game minutes: his district Searching there, the machines near converging on him and the nearest garage's squad sent; asleep, he wakes to them coming. Nothing tells him why. A quadruped's launcher sticks a tag to his jacket (60% a shot, every 6 s, 20 m); the SDR dongle finds and picks it off in 1.2 s, or he takes his jacket off and goes over it by hand from the backpack (8 s, standing).

### The units

| Unit | Movement | Senses (FOV, day / night range) | Where |
|---|---|---|---|
| Fixed / sweeping camera | none / pans +/-45 deg over 10 s | 70 / 60 deg, 30 / 18 (IR) | doors, gates, plazas, sites |
| Smart lamppost | none | 90 deg, 22 / 14 | main streets (their speakers carry the announcements) |
| Patrol drone | among the buildings: 9 m over its street, or wandering short hops between low roofs and the gaps between blocks 7-12 m up (U-103), 9 m/s | 100 deg down-forward, 35 / searchlight 30 + thermal 30 | every district, from docks on low roofs |
| Hunter drone / FPV / bomber | 12 m/s, armed | as a patrol drone | launched on contact |
| Quadruped | 3 m/s patrol, 8 chase | 120 deg, 30 / thermal 20; hearing x1.5 | streets, stairs, sites |
| Humanoid | 2.5 / 4.5 m/s | 100 deg, 40 / 22 IR | checkpoints, sites, squads |
| Heavy walker, giant spider, colossus | slow, on the widest streets | long range | a few in the city |
| Crawler | the sewers and tunnels only (U-104: never on the streets): it goes only where it can along its run, underground; news of him above it looks about where it is; the helicopter drops it only below. A white eyeless pod on ten thin legs, jerky | short, thermal | underground |
| Delivery robot | 2 m/s, no stairs | 120 deg, 18 / 10 | flat streets |
| Turret, PIR, tripwire, pressure plate, acoustic sensor | static | | inside sites |
| River drone boats, sonar buoys | 4 m/s / static | 50 m sonar | the rivers |

**Patrols.** Every unit has a route with dwell times and active hours. While Unaware its position is a function of the game time and its phase, so sleep is a cheap time skip and timings can be learned. Patrol drones fly 6 real minutes on a battery and sit on their dock 2: a learnable gap. Units think at 10 Hz, move at 60 Hz, path on a navigation graph (streets, stairs, tunnels). No machine starts within about 40 m of the hideout's way out in a run's first minutes; everywhere else they're out from the first second.

**How they look and move (U-104).** Eldritch and futuristic: all white, pointed and unfamiliar in shape (not dogs and men in boxes), no eyes or faces; more variety of shape and size within each kind. Their paths bend organically at small scale; no machine enters a wall, another machine's body or his. (M10-45: each tick a machine that moves steers off the bodies within its 0.6 m of room (giving way to one in its way and stepping round it, to the right square on), weaves ±0.3 m about its way (off its beat), and is then put just clear of any body still overlapping; a move that would take its body into a wall slides along it or stands, unless its way itself is that tight (a door, a stair); held off the point it was making for, near it counts as there (and it faces it; one held off him by his body hasn't lost him, so doesn't go on the way he was going). One on its beat near him does the same, walking aside of where the clock has it and drifting back at 0.5 m/s (straight back once he's 25 m off). A lame machine or a wreck is a body the rest go round, and he can't walk into any machine's body: he slides round it. A straight way over open ground needs its body's width clear, not just its middle. Bodies are the hit cylinders and his box; the columns are left out.) Each kind has its own attack pattern (wind-up, strike, recovery, repositioning) and keeps its distance rather than running into him. A destroyed machine or a dead camera fades to grey-black; a machine that dies falls as a ragdoll.

### Combat

| Enemy weapon | Fire | Damage | Notes |
|---|---|---|---|
| Humanoid rifle | 3-round burst a second | 30 a hit | hit chance falls with his speed, distance and cover |
| Hunter drone SMG | 2-round burst / 0.8 s | 8 | accuracy 0.4 |
| Turret | 6 rounds/s | 12 | accuracy 0.7 within 40 m |
| Quadruped tag launcher | 1 / 6 s, 20 m | 0 | sticks a tracking tag (above) |
| Quadruped shock prod | 1.5 m | 15 + 1 s stun | |

Each hit: 30% heavy bleed, otherwise light; 15% a limb (sprain or graze). Machines have hit zones (sensor heads blind them, batteries shut them down); U-104 lowers most machines' health (dogs and humanoids half, other ground machines a third, drones as they are): pistol rounds to kill, body (head), are quadruped 15 (2), humanoid 60 (2), heavy 480 (12), turret 268 (7), delivery robot 3, patrol drone 1. His weapons: knife (40, takedown from behind: 2 s within 1.5 m of a quadruped or humanoid not Engaged), crowbar (55, slow), pistol (25, 15 rounds, heard 150 m), pump shotgun (8 x 12, 5 shells), nail gun (14, quiet, 15 m), grenade (6 m, 200), EMP (6 m: drones crash, robots off 30 s, cameras 60 s; 3 charges). Ammunition is scarce.

**Attacks (M10-46, U-104).** A machine Engaged on a trip after him that has seen him in the last second, within its reach, fights in a cycle it shows (sim/combat.ts `ATTACK`, the phase on the unit as `u.atk`): it winds up (stands, faces him; a humanoid drops into a crouch), strikes, recovers, repositions, round again. It fires only in its strike: its weapon's bursts back to back 0.25 s apart, as many as its old cadence gave over the cycle, so damage over time holds (humanoid 2 bursts a 2.6 s cycle, hunter 3 a 3.2 s run, heavy 1 burst and its rocket, spider and colossus 2 bursts in about 5 s). A quadruped closes to 3-5 m, crouches 0.5 s, lunges (1.8x its chase, homing) to arm's length to prod once, backs out to 5 m and circles; with him more than 1.5 m up or down (a stair, a ledge) it doesn't lunge but goes its own way after him or stands where it sees him, launcher on him. A crawler skitters off to one side 2.5 m out, rears 0.4 s and pounces. A humanoid sets 0.5 s, fires standing, steadies 0.4 s, then bounds to cover or strafes (backing off inside 8 m). A heavy, spider or colossus plants (0.8 / 1.2 / 1.6 s), fires, recovers and steps along to hold its range (15 / 25 / 20 m out, closing beyond 45-60 m). A patrol drone or hunter hangs 0.5 s, makes a run in past his side to 8-9 m (a hunter firing), pulls away up and out to 18 m and circles to a new angle. A kamikaze brakes 8 m out and hangs 0.4 s, then locks on and dives; a bomb dropper steadies 0.6 s over him, drops, and slides 7 m off aside before coming back (a drop every 4 s at most). A walker's moves in its attack go onto the floor there and only where it can walk straight to (else it stands): never off a ledge or through a wall. The unarmed (helicopter, delivery robot, carrier) don't attack. Wind-ups give him a moment to act: duck, sidestep, shoot first.

**Looks (M10-44, U-104).** The machines are eldritch and white: matte white and pale grey ceramic shells, pointed limbs and blades, asymmetric segmented plates over thin dark seams, no faces (their senses are rings of pits and grooves, a camera's lens a dark slit), a faint ice-blue line of light on each that takes its state's colour. Each kind has a few looks, the same parts on the same pivots, picked by the unit's id (render/machinekit.ts, walkers.ts, machines.ts): humanoids four body plans (a tall crested sentinel, a stooped long-armed mantis with bladed forearms, a broad one-shouldered bulwark with a split dome, a spined thorn with a fin), quadrupeds three, heavies, carriers, delivery robots, patrol drones and colossi two; and every unit not fixed in place is its own size, 0.9 to 1.1 by its id. All looks' geometries sit in the one batch; a unit's instances take its look's when it's drawn (setGeometryIdAt), so the draw calls and the triangles drawn stay as they were.

**Wrecks (M10-47).** A destroyed machine or camera reads at a glance: its paint fades to grey-black over 1.5 s (the batch's per-instance colour: its alpha mixes the paint toward grey-black, same draw call) and its lights go out. A machine on the ground comes down where it was hit (the sim's wreck, `u.stop`, set at the moment of death, so scanning and salvage find it there): drawn only (render/ragdoll.ts), its rig's parts let go as rigid boxes, toppling the way its id picks, falling onto the ground under each (the world's raycast), bouncing a little, tipping onto a face and lying still within 2 s. One already a wreck when he comes by is drawn already down. Drones fall as before and grey-black too.

**Blasts (M10-65).** A kamikaze FPV's hit, a bomber's grenade, a rocket, his grenade and a hunter drone's crash are one blast (sim/strike.ts `blast`): it hurts him within its reach by how near (rocket 6 m/70, FPV 5/60, bomb 4/45) and throws him within half as far again (sim/knock.ts): 9 m/s away and 4 m/s up within 2 m, falling off linearly to nothing at the edge (a rocket at 1.5 m carries him about 7 m, at 4 m about 4 m, at 8 m barely). Within 3 m he's off his feet, tumbling, and lies down 1.6 s where he lands; further out he's only shoved (holding on to something, he rides it out). A wall or the ground between him and its centre shelters him from all of it. Seen (render/blastfx.ts, pooled): a point-light flash, a white core and orange fireball billows, a dark smoke column drifting on the wind for 6-11 s, 14 debris chunks bouncing down, sparks, a shockwave ring over the ground and a scorch left on it; the view shakes by how near (camera trauma). Heard (audio/gunfire.ts `explosion`): crack, deep thump, rolling roar and debris crackle, late and dull with distance, muffled through walls, echoing; close, a thump through his chest and ringing ears.

## 7. Items, crafting and loot

Grid backpack 8 x 6 (the hiking pack: 10 x 7); items are rotatable rectangles with weights; five hotbar slots.

| Item | Uses |
|---|---|
| Grappling hook | climb to a ledge up to 20 m above; rappel |
| Telescoping ladder | stood against a wall, upright in front of it (to 4 m; out past a sill, stopping under a balcony); bridge a 3.8 m gap; dropped it's loud |
| Crowbar | pry doors, shutters, vents, crates, scooter batteries; melee |
| Lockpicks | cheap locks, silent, slow |
| Keys, keycards, his site card, his father's badge | their doors; cards can be cloned |
| Keycard cloner | copy a card near a reader or a humanoid |
| Bolt cutters | chains, padlocks, fences, grates, camera cables |
| Rope, carabiners, harness, pulley block | anchors, rappels, fixed lines, the haul-rope trolley |
| Chalk bag | half the grip drain while it lasts |
| Headlamp | not his at the start: found. White (seen far) or dim blue |
| Binoculars | zoom; log machines (the laptop's Logs) |
| SDR dongle | drone routes, tag finding, jammer part |
| Camera tap | a camera's feed on the laptop; loop it 90 s |
| Drone controller | fly a salvaged drone (8 min) |
| Signal jammer, EMP device | cut the hive link 25 m; down drones, stop robots |
| Grenade, firecrackers, fire extinguisher | breach, decoy noise, smoke |
| Mylar blanket | beats thermal while worn |
| Knife, pistol, shotgun, nail gun | weapons |
| Car battery + inverter | power at a hideout (bench, charging) |
| Battery pack | used (in hand or from the backpack), one charges everything he carries that takes a charge (laptop, phone, headlamp, jammer, drone) full and is used up; with nothing to charge it isn't used (U-104); jammer, EMP, drone and grinder power |
| Angle grinder, breaching charge | blast doors, bars |
| Oxygen kit, jerrycan, boat key / CAN interface | the river and underground routes |
| Healing: bandage, tourniquet, splint, painkillers, first-aid kit | section 5 |
| Water bottle, purification tablets | drink; refill at taps or the river (purify first) |
| Toolbox, bedroll, mattress, folding crate | make a bench (the toolbox lies in the middle of the table's top, along its long side), a bed, storage; crouched, E at one (the toolbox: its table) packs it back into the backpack if it fits (the crate only when empty) |
| Documents | read in the backpack (section 2) |

Food spoils from its date of manufacture (noodles 180 d, luncheon meat 1000 d, chocolate 300 d, bread 3 d, steamed buns 2 d, raw pork 1 d...); spoiled food makes him sick; the laptop's Scan says how much life a scanned packet has left.

**Crafting** at a bench (a toolbox on a table, square on its top): jammer (SDR + RF amplifier + battery pack + board), EMP (capacitor bank + coil + battery pack + trigger), camera tap (board + cable + clip leads), drone controller (board + radio module + battery pack), cloner (RFID reader + board + battery pack), grappling hook (steel hook + rope), haul-rope trolley (pulley block + 2 carabiners + harness), battery pack (scooter cells + tape), splint (2 rods + tape), bandage (cloth + alcohol), lockpicks (2 hairpins), clean water (river water + tablet), solar charger (solar panel + charge controller + cable). Weapons and explosives are found, never made. Salvage from downed machines: rotors, radio and camera modules, servos, power cells, armour plate.

**Loot.** Containers roll seeded tables by what they are and where: kitchens, bedrooms, shops, workshops, cars; the rarer buildings' rooms (offices, clinics, barracks, armouries); each high-security site's own (tier 2 tools, medicine and electronics; tier 3 weapons and network kit; tier 4 the drone hub's). Toolboxes turn up in kitchens, shops, car boots, workshops and the substation (U-099). Every item can be found somewhere: a table, a placed spot (a site's keys and tools, the metro staff's lockers, the cableway operator's key in its control desk's drawer, the rail-deck schedule in the nearest room by the bridgehead, yuzhong/finds.ts), the start, a wreck, or made from what's found (tests/sim/sources.test.ts lists each item's sources).

## 8. Hideouts

He wakes in an unknown hideout: the brick-arched air-raid chamber under Jiaochangkou (his friends' once; he doesn't know it), its vent shaft up to a grate in the plaza. It has a crate (firecrackers, tape, a rag) and a table beside it, no bed, no power. He starts with no headlamp. From there he makes his own hideouts anywhere: a bed (one he finds, or a bedroll or mattress he places) makes a hideout; a toolbox on a table makes a bench; the containers within 15 m nearer its bed than any other's are its storage; a car battery and inverter power it. Packing up a bed he laid ends its hideout, and the power wired in there comes out with it (the battery holding its charge). Sleeping in any of his beds saves the run. Being tracked there gives him away (section 6): he's hunted where he is, so leading them home is still the mistake.

## 9. The city

**The map is frozen (U-053):** its layout and geometry stay as they are; fix what's broken, change nothing else unless the director asks (U-104 asked: one of the two wires outside the start hideout goes).

The 1:1 Yuzhong peninsula from OpenStreetMap and SRTM (`src/data/geo`, `tools/geo-fetch.mjs`): game height is real elevation minus 150 m, the rivers stand at 12 m, x east and z south of the map's north-west corner (lon 106.564, lat 29.5735). Every OSM footprint is a fitted, turned lot at its real height; rows of infill front every street with 1.6-3.2 m alleys; half the blocks that fit a stair core can be entered, their floors mazes of rooms, stairs, locked doors and collapses; parapets, roof clutter, pipes, fire escapes, AC units and balconies make the facades climbable; Shibati's brick terraces step down the Eighteen Stairs. Every building's type (homes, offices, clinics, workshops, military posts, malls) shows on the laptop's map from the start.

| Place | Where (x, z) | What's there |
|---|---|---|
| Shibati 十八梯 | 552, 2021 | the Eighteen Stairs; the Li family flat in the upper terraces (a key place: walk in from the street) |
| The start hideout | 495, 1945 | the air-raid chamber off the Grand Tunnel, its vent grate in the street above |
| Grand Tunnel 大隧道 | 576, 1996 to 378, 1938 | under the street from Shibati toward Jiaochangkou |
| Jiaochangkou 较场口 | 371, 1897 | the junction, the metro stations below |
| Construction site 工地 | 497, 1892 | the real plot under construction: Li Wei's half-built tower and the tower crane |
| Line 2 beam | 0-335, 911-1114 | the monorail beams over the Jialing bank; the stalled train |
| Jiefangbei 解放碑 | 907, 1486 | the CBD, malls, LED screens, the monument |
| Hongyadong 洪崖洞 | 1074, 948 | the stilt complex down the Jialing cliff |
| Xiaoshizi 小什字 | 1546, 1168 | metro stations toward the Dongshuimen bridge |
| Chaotianmen 朝天门 | 1794, 688 | the tip, Raffles City |
| Cableway 长江索道 | 1469, 1426 | the north station |

**High-security sites** (each a key place with its own layout, U-104):

| Site | Ways in | Loot | Hazard |
|---|---|---|---|
| Construction site | scaffold over the hoarding from the street; crawl under it along the ditch; drop from the next roof onto the hoist (the real Line 2 beam is 850 m off, D-131); the gate (his site card, under its camera) | tier 2 tools: bolt cutters, rope, carabiners, harness, steel hook, nail gun, grinder, jerrycan, breaching charge; the pulley block in the crane cab | loose scaffold planks that tip under a run (loud); the crane on autopilot, its skip of rebar swung up over the top slab and down onto it, hitting hard; the hoist's ride down heard all round |
| Hospital | ambulance bay (camera + card); the laundry crawlspace; the roof; the basement from the tunnels | tier 2 medical | pressure-plate pharmacy, motion sensors in the wards |
| Police station | the roof; pry the garage shutter; cut the cell-block bars; the front door (card, camera) | tier 3 weapons and keys (pistol, shotgun, grenades, the boat key) | the armoury turret |
| Electronics market | the front door; the loading dock (it sticks); the roof; the basement | tier 2-3 electronics | acoustic sensors |
| Telecom exchange | the gate (card, camera); the vent; the roof; the cable tunnel | tier 3 network kit | gas in the server hall (8 s) |
| Substation | the gate (his father's badge, camera); cut the back fence; the control roof; the drain culvert | electrical: insulated gloves, coil, the one spare HV fuse | live busbars (arcs within 1 m; keep low) |
| River-police pier | the gangway (cameras); the ladder out of the water; the cargo crane's jib | the patrol boat | sonar buoys, drone boats |
| Metro control room (Jiefangbei station) | from the underground city's deck into the concourse; from its lower concourse into the platform hall and up the stair; the running tunnels from the east, by the staff stair's door off the tracks | tier 3 (its drawers and cabinet) | to build (M6-17: the third rail, the face gates' alarm, the pump panel) |
| Cableway station (Xinhua Road) | the street door (camera); the staff door on the side street; the roof (down its stairwell); the sewer, up the manhole into its cellar | workshop table; the operator key; carabiners and harness in the rope store | the bullwheel: creeping in the wind, brake off; its lurch drags him in by the rim (sim/cableway.ts) |
| Raffles drone hub, bridge checkpoint | to build (M6) | | |

The five in the city's buildings are laid out by hand (M10-38b: `yuzhong/insides.ts`, `insides2.ts`, built with `city/handmade.ts` in the building's own frame in place of its rolled rooms; the rolled rooms are still rolled and thrown away so the city's dice fall as before, their windows and shelters kept as ghosts for the routes' dice only). Each two floors or so off its stairwell: the hospital's A&E, laundry corridor, wards and pharmacy store (the charge nurse's card in her locker opens it; the plate in front of the counter, round it by the wall); the police station's front office, interview rooms, cells, garage, and upstairs the sergeant's office (his card), the evidence room (the boat key) and the armoury; the market's hall of stalls, the escalator, and upstairs the repair stall (bolt cutters) cut off by a collapse from the chained cold store; the telecom exchange's gate hall and its own stair (its stairwell came down over the first floor), the plant rooms, and upstairs Gao's duty room (the card) and the server hall; the substation's two-storey transformer hall under its busbars, its steel stair to the control room and store cage B (the relay cabinet, the fuse); in the hall, the last of its three feeder panels the cableway's (`feeder`, its fuse carrier, M7-05). Each has a heap or a buried door that sends him round, locks that what's inside opens, its story document in the container its layout keeps for it, and words on its walls; the layout marks where its hazard goes and its heart (`Secure.heart`). Their ways in through outer walls come from the layout too (ids `.way<kind>`). tests/sim/securesites.test.ts walks each from every way in to its heart.

Under the city three key places are made by hand too (M10-38c), each in its run's own frame (t along, s across) with `yuzhong/handunder.ts` (lined halls, doorways and their doors, heaps, furniture over hidden boxes, containers, words on the walls, marks): **the air-raid shelter** (`airraid.ts`), the first 150 m of the air-raid tunnel north of the Grand Tunnel's junction room, its gallery straight through (the underground's way north) past the open protective and gas-tight doors (the tool cabinet's crowbar between them), the dormitory hall where the families slept, the ventilation hall (the hand-cranked fan, the students' corner), the hotpot restaurant's store passage behind, and the Dongdong Shelter Hotpot where they lived (its heart; the menu on a table): its front door buried, its kitchen door off the gallery locked, round by the ventilation hall and the store passage to the kitchen's back door; ways in from the junction room, the grate at 120 m, the cellar steps at 140 m and the tunnel north. The generic tunnel's rooms and fittings there are still rolled and thrown away (`clipped`), so the rest falls as before. **Jiefangbei station** (`metroroom.ts`): the concourse over the platform hall's west end, level with the city's deck (its street runs on into it), a stair up from the hall, the face-recognition gates and dead screens; behind it the staff corridor, come down in the middle, the control room (its heart; the log on the desk, its drawers out) behind the maintenance key's reader, the signal equipment room, the staff lockers (the key), the cable gallery behind them to the control room's back door, and the staff stair down to a door by the tracks. **The Grand Tunnel's far end** (`tunnels.ts` galleries()): the tunnel come down short of the cool room (its heart: the neighbourhood's summer cool room, shut since the 9th), round by wartime branch 3 and the long gallery to the cool room's chained gate; off the gallery the old store (the crowbar) and the old way up to Jiaochangkou, fallen in. Each marks its ways in (`in:<place>:<way>`) and heart (`heart:<place>`); tests/sim/underground.test.ts walks each from every way in to its heart.

Three more are made by hand (M10-38d). **The cableway's north station** (`yuzhong/cableway.ts`, the building at its landmark, a sixth `SECURE` site): a low building, as the real one on Xinhua Road is, the cabins leaving from its top two floors. Below, the ticket hall (turnstiles, the stair down to the cellar), the staff corridor come down in the middle, round through the switch room (the dead 10 kV feeder panel, a crowbar in the tool cabinet) to the stairwell; up it, the upper station's door off the landing, locked. Behind it the stair room, its door to the platform buried, so round by the machine deck past the bullwheel; off the stair room the operator's booth (locked; the control desk's drawer holds the operator key and the operator's note) and the rope store (carabiners and a harness); cabin 2 parked at the platform (the heart: `cable:cabin` marks its door, where Xiaoyu waits on her cableway trail). The bullwheel (`cable:bullwheel`, sim/cableway.ts): every 18 s it strains (heard) and turns 2.5 s; in its nip (0.4 m in to 0.9 m out from its 2 m rim) it hurts 45 and throws him; its brake lever (`cablebrake`, across the deck from the way past it, held 3 s, loud) stops it, as does power (`s.wstate.open['cable-feeder']`, set when the feeder's fuse is fitted; `cableLive`). Cabin 2's control panel (`cabin`, on its far wall) takes the operator key (M7-05). The ropes (`w.ropes`, drawn by render/lines.ts, not ridden; `cableLine()`): two track ropes and the haul rope from the platform's open end in the street wall (`cable:saddle`), 136 m up, on the real line's bearing (OpenStreetMap's aerialway, no towers between, as the real span has none) 1150 m over the old town and the river to the south station on Shangxin Street (the map's building there, its unknown height set low: 15 m; cabin 1 drawn at its wall), sagging 8 m. Under them the city's own buildings (none on the map, nor a hand-made one) within 6 m of the line stand lower, cut by whole floors to 10 m under the rope's lowest over each, a floor at least (21 of them, 3 to 87 m off, on the hillside below the station and one on the far bank): found before the city's built (`cableCuts()`), cut once it stands and is joined up (`cutCableway()`: what was over the cut gone, its windows kept as ghosts and its shelters 'gone' for the routes' dice, a roof over the rest), and the planks and cables that would have run through the space over the line or to what was cut made and taken down (`inCableWay()`), so every die falls as it did and nothing else in the city moves. `cable:rope` marks the haul rope's two ends for the cabin ride and the trolley (M7-05, M7-06); the cable ending's zone is 0.6 of the way along it. The haul rope at the open end (`haulrope`, in reach from cabin 2's roof) takes the trolley (M7-06). **The river police's deckhouse** (`pierhouse.ts`, on the pontoon, built with `handbuilt.ts`: shells carved by handunder's tools): below, the corridor from the front door to the back door, come down where a drone fell through both decks, the duty office, the equipment store (the crowbar), the mess, bunks, battery room and the stair room (its river door locked); above, the gallery (come down too), the radio room and captain's cabin (its door to the watch room locked) and the watch room (its heart; the boat 3 log on the desk, the key board's hooks empty). **The construction site's office compound** (`siteoffice.ts`, in the site past its tool containers, a crowbar now in the second): its fenced yard's gate chained; the two-storey site office, its main stair buried under fallen formwork, so up the fire stair and along the walkway; the canteen, the changing room (Li Wei's locker), the store (bolt cutters) below; the plan room, engineers' office and the site manager's office (locked; its heart, the site diary on his desk) above. tests/sim/keyplaces3.test.ts walks each from outside by each way in to its heart (the cableway's four, the pier's three, the site's four) and sets off the bullwheel.

Every site has an approach unwatched for 10 s or more (the coverage test).

## 10. Escape routes

| Route | What it takes |
|---|---|
| A. Dongshuimen rail deck 桥下 | cut the bridge's sensor-bus relay (bolt cutters, insulated gloves), a jammer, reach the deck (the Line 6 tunnel or the north pier), cross 300 m of truss |
| B. Yangtze Cableway 索道 | the cabin (the spare HV fuse restores the feeder, the operator key) or the haul-rope trolley (pulley block, carabiners, harness) from the station tower |
| C. River at night 雾中 | the police boat + 20 L of fuel + a battery + the key or a CAN hotwire; past the buoys and drone boats in fog, drifting, or jammed |
| D. Underground 隧道尽头 | the flooded section (pumps on the spare fuse, or the oxygen kit), the blast door (grinder, charge or keycard), the seismic sensors |

**The cabin (M7-05, `sim/cablecar.ts`).** At the substation, E held 8 s on the cableway's feeder panel with the spare HV fuse fits it and closes the breaker (heard 40 m): the feeder's live. In cabin 2, E held 3 s on its control panel with the operator key starts the drive (a dead drive only clicks): the doors shut and the cabin runs out along the ropes (`s.cable`, his mode `cable`: he stands where he was, Ctrl keeps him low, Z lies him down), 1 m/s² up to 12 m/s, its carriage rumbling (heard 30 m), 60 s out to the open river and the ending. Xiaoyu rides if she said she'd come (only then does she leave with him by this route). The line drone patrols the line from 0.15 to 0.45 of the way over (the old town and the bank), 8 m over the ropes and 6 m to the side at 3.5 m/s, looking down the way it flies; hearing the cabin it looks at it for 10 s. It sees him as a patrol drone sees (perception's `visibility`), but only what of him is in the windows' band (1.1 to 2.1 m over the floor) and none of his heat through the glass: kept low he's never seen; standing, lit (by day, or his lamp, or its searchlight), near, he is. The jammer blinds it within 25 m of him. Seen (its awareness 1), the network trips the feeder: the cabin brakes (2 m/s²) to a stop over the old town, short of the river, the drone hovers by it, and 20 s later the hunters have him (`cableway`). The cabin (parked at the platform till it leaves: the world's boxes for it are left out of the world's meshes) and the drone are drawn by `render/cable3d.ts`.

**The trolley (M7-06, `sim/trolley.ts`).** The real span has no towers, so the climb is the station's own: up onto cabin 2's roof at the platform's open end (a jump to its lip, 2.45 m, and a pull up), under the haul rope where it leaves (out of reach from the platform). E held 4 s on it with the haul-rope trolley (crafted: pulley block, two carabiners, harness) clips him on, and he's off, hanging 2 m under the rope, down its sag: he picks up at 1 m/s² to a top speed set from the line's length (`topSpeed`: what takes him from the station to the first of the line in the ending's zone in 40 s; about 22 m/s on the real line), so the slide to the ending takes 40 s. Its whine is heard 15 m off; Ctrl lets go. One trolley, one harness: Xiaoyu can't come this way. From a cabin the line drone has stopped, E with a trolley in his pack takes him up through its roof hatch (4 s) onto the haul rope and on, out of the hunters' reach.

**The patrol boat (M7-08, `sim/boat.ts`).** Boat 3 lies alongside the river-police pier, drawn and moved from the run's state (`render/boat3d.ts`). E on it from the pontoon does the next thing it needs that he has, each a hold: pour in a jerrycan (20 L of diesel, 5 s), wire in a car battery (4 s; one under 25% charge won't turn the engine over, and a better one takes its place), hotwire its controller with the CAN interface (8 s); with all that, or its key in his pack, E takes the helm and casts off. At the helm: W and S throttle ahead (7 m/s) and astern (2 m/s), A and D the rudder (it turns better with way on), E starts and stops the engine (a start draws 2% of the battery; a flat one just clicks), jump steps off over the side onto a footing within 6 m, else into the river (the kill cord stops the engine). With the engine off he paddles, 0.6 m/s and silent. The river's current (1.8 m/s) carries it on toward the open reach past Chaotianmen either way; it runs up against banks, pontoons and piers and slides along them. The engine is heard 60 m round and burns its 20 L in about 25 minutes at full throttle.

**The crossing (M7-09, `sim/river.ts`).** At the helm the river's rules are the boat's: a sonar buoy within 50 m hears the engine running and the drone boats set out at once; out on the open river (no bank within 60 m) their own sonar hears it, and by day or in clear air they see the boat even drifting (10 s to find it); once they're coming the bank is no help, and 20 s later they run him down. With the engine off in fog (0.6 or more) at night, or the jammer running, they've nothing to go on and lose him. An EMP set off within 6 m of a buoy deafens the pier's whole string (they share one cable) for 60 s. So the ways past: drift and paddle out on a foggy night with the engine off, the current taking him past the buoys and on down; jam them; or deafen the buoys and motor away along the bank, then go quiet before the open river. The open reach past Chaotianmen (`ending:boat`) ends the run. Xiaoyu, on this route, waits on the steps below Chaotianmen; if she said she'd come, she comes down into the boat when it lies still within 30 m of her (drawn sat in its bow), and only then leaves with him.

There is one spare HV fuse (a second in the Raffles hub). The construction site feeds three routes. Each route has its own short ending, with or without his sister (she waits at the route the run's seed picked, section 2).

## 11. The laptop (U-104)

**In his hands.** Tab takes it out: he holds it out low in front of him, its screen tipped back toward his eyes (no arms drawn); it goes with his body and the way he faces, not his look, so he looks down to read it and over it to see ahead, and can't grab, sprint or jump while it's out; the page lies on its glass in perspective. The machine is a worn space-grey aluminium laptop: rounded lid, glass bezel with a webcam, hinge, a keyboard of separate keys and a trackpad, scuffed and scratched (M10-57). Its screen looks like one: the backlight's bloom round it, the room's light glancing off the glass and sliding as he moves, the pixels' grain seen close, darker edges; ice blue on near-black, minimal. Its glow (ice blue) lights him and what's round him at night (0.5). Taking it out never hitches (M10-64): its glow light is always in the scene (dark, not removed), so the count of lights, and with it every shader in view, never changes when it opens; put away, the machine isn't drawn, but whenever the scene's lights change (the renderer's shader programs change) its shaders are compiled for them unseen (render/laptop3d.ts); and as the world loads its page is built, laid out unseen and its map drawn. A full battery lasts 8 game hours open; one battery pack charges it (and all he carries) full; a powered hideout charges it shut. Anna stands in a corner.

**Anna's OS (U-105, M10-58).** The screen is a desktop he already knows how to use: a dark ice-blue wallpaper with ANNA faint on it, and a taskbar along the bottom with an icon for every app (a short mark under those open, a longer one under the one in front) and at its right the tray: the battery, the time over the date, and a skull with the death count.

**Standing,** the lean keys turn its four apps, each filling the desktop: Map, Status, Scan, Notes. Nothing says how.

**Sitting (focus).** Q with it out sits him down where he is (low, as crouched; he goes nowhere until he gets up), his eyes come level and the view closes in on the screen; the mouse moves a cursor; Q or Esc stands him up, on the app in front if it's one of the four. Sitting down the first time, the app he was on opens full. A taskbar icon opens its app in a window, brings it to the front, or tucks it away if it's already in front; a window has a title bar he drags it by, minimise, maximise and X; the one clicked last is in front. An app he can't use yet says what it needs:

| Tab | Standing | Sitting |
|---|---|---|
| Map | the city, every building's type, him, the key places he knows, his marks (not his hideouts: he remembers those) | markers, straight lines, text, the eraser; wheel zoom, right-drag |
| Status | his body | hover an injury: what it is and how it's treated |
| Scan | the last thing scanned (looked at with the laptop out, 2 s) | pick any item in the backpack to scan |
| Notes | his notes, to read | a blank page to write and edit |
| Drone | | its battery; Launch flies it (he stays sat, the view the drone's, flown with his movement keys), the laptop's key brings it back to him at the Drone window |
| Cams | | a button per tapped camera to pick its feed; Loop blinds the one shown for 90 s |
| Logs | | machines logged through binoculars; one picked opens the Map on it, ringed |
| Songs | | the song playing, Play or Pause and Skip: the songs in the songs folder (desktop; Open the songs folder, read again each time the app opens) or a folder he picks (browser), shuffled, one after another as background music through the master volume; the city's own music silent while they play |
| Training Room | | sitting only: Put on the goggles fades to black and up into the tutorial map (a map of his named "tutorial" in the maps folder, else the built-in one), at its spawn, a lens edge and a VR tag on screen; his run is kept aside whole (the same state); Esc's Take off the goggles fades back to it, sat at the laptop where he was. The world's clock doesn't stop: the time spent in the goggles passes for him, his needs with it (as sleep does), nothing else moving meanwhile; dying in there starts the map over (src/ui/training.ts) |

A tab he can't use yet opens to a hint at what unlocks it (the binoculars, a camera tap, a drone).

## 12. Menus, maps and the tutorial (U-104)

**Main menu**, on plain black (U-105), everything paused under it, its own quiet music looping (a slow A-minor piece: pad, bass, an echoing electric-piano line; it fades out as play starts, M10-60): 重庆 2038; Continue (the save's date and time); New Run; Settings; Maps; the version number, which opens the changelog: the README at the top, then the changes (PROGRESS), then the credits, a link to the GitHub page and a note that the game was coded entirely by Claude, linking the repository. Ice blue on near-black, like every menu.

**Maps** (src/ui/maps-menu.ts). The built-in tutorial first, then the maps in the maps folder: in the desktop game a .json file each in Documents/Chongqing 2038/maps (named after the map; drop one in and it's listed; Open the maps folder), in the browser the maps saved in localStorage (src/ui/mapfiles.ts, one small store for both). A single click selects one to edit, copy ("<name> copy") or delete (a second click to be sure); a double click plays it (Esc's Back to the editor edits it); New opens the editor on a new map. The tutorial can be played and copied, never edited in place, deleted or overwritten (Save refuses its name). Esc goes back to the menu.

**The built-in tutorial** (src/data/tutorial.json, editor pieces) until the director makes the real one: a straight course from the spawn, a red sign at each move naming its real key: hop (Space), vault (Shift), slide under a slab (Ctrl, or crawl with C), jump and grab a 2.2 m lip (a mouse button, W over), a 5 m tower climbed by its pipe hand over hand (a ladder or a safe drop down the back), a wall up-kick (Space in the air), a swing bar, a chimney (X), done.

**The map editor.** From Maps (New or Edit). A flat empty 300 m ground; a new map holds the spawn point and one large empty apartment (14 x 10 m, a door and windows, a flat roof) to fill. The palette places, where the cursor points: platforms, walls, pillars, ramps and stairs of any size and material, a pool; pipes, ladders, poles, a rope in its frame, vines, a tree, ledges, swing bars, rails, a zipline (falling 1 in 8), a chimney slot, a hiding crate; the rooms' furniture (a bed to sleep on, a table, a running sink); containers (cabinet, drawers, fridge, locker, crate, wardrobe) holding exactly the things chosen for them, plus a loot table's roll if one's picked; props and decorations as the city sets them (their collision, hiding places, climbable trunks and posts); red signs on walls and floors whose text players read with E; the spawn point. Wall pieces face out from the wall they're put on. Click selects, drag moves (a wall piece along its wall), handles size it (red across, blue deep, green up, the opposite face staying put), lift it (white) and turn it (yellow, 15 degree steps); R turns, Delete removes; the side panel types its numbers, material, text and things. A free camera flies over it (right drag looks, WASD/Q/E, Shift faster, the wheel). The map is JSON of placed pieces (src/world/sets/usermap.ts; pieces.ts the palette), built into a World by the city's own builders as world 'map' each time it changes, the game paused under the editor; Save keeps it in the maps folder, Export downloads it as .json, Import reads one back; Play runs it as scenario 'map' from its spawn, at noon in clear weather (Esc's Back to the editor returns; death restarts it); its Maps button goes back to the list. The tutorial is a map the director makes with it, shipped with the game, played from the laptop's Training Room. (It replaces the old movement gym, removed in M10-31.)

## 13. Audio

Synthesised with Web Audio, one master volume: footsteps by surface (low and soft), breathing and heartbeat, rotor buzz with Doppler, servo whine, gunfire, rain, the rivers, city hum, tunnel drips. The street speakers' announcements are recorded (Kokoro, Chinese) and play from the lampposts round him, unsubtitled. Anna's lines play in the same voice, clear. The city has its own quiet music (src/audio/music.ts): mostly silence, then minutes apart a short faint piece fades in and away (50-100 s, silences 100-260 s): soft FM electric-piano notes far apart over a cold detuned-saw pad, a long reverb and a dotted-eighth echo, no drums. Eight pieces in A minor, A Dorian and Aeolian (slow walks through the pentatonic or modal scale, slow arpeggios up the chord, one of rare bells over two long chords), picked by a seeded rng, never the same twice running, three only by day and two only by night; by night the pads darker and the notes fewer. Each is voiced by where he is (high: slower, an octave up, brighter; streets: warmer; underground: an octave down, darker, longer echo) and cross-fades as he moves. Under it a pursuit pulse follows the district's alert. While his own songs play (the laptop's Songs) or the main menu's up it fades out in about two seconds and stays silent; the next piece comes at least 20 s after they stop. A trailer track of 90 s ships for the director's trailer, public/audio/trailer.ogg, made by `node tools/trailer.mjs` (synthesised sample by sample, A minor, 120 bpm, the menu's motif): cold open 0-12 s, introduction 12-35, escalation 35-65, climax 65-85, button 85-90 (a hard cut, a last A, a servo and a rotor leaving).

## 14. Art direction

No visible draw distance: detail near him, the rest as cheap stand-ins in aerial haze. Wet concrete and tile, mossy walls, fig roots, tiled blocks with balconies and AC units; brick and timber in Shibati; glass towers and LED screens in Jiefangbei; neon and signs in simplified Chinese. Late autumn: the trees turned; fallen leaves lie under and round the trees and bushes, a carpet by the trunk thinning to nothing at about 1.8 crowns out, in drifts (a top-down leaf map, src/render/leafmap.ts, read by the ground's shaders), each leaf its own shape (lobed, oval, a ginkgo's gold fan, some broken), veined and curled, in browns, golds and reds, darker wet; from afar a tint. Winter snow. Everything of his is themed ice blue (the menus, the laptop, its light, the headlamp's dim mode, the neon by his family's flat and in the start hideout's alley, dark glass by day and lit only at night). The machines are white. The reference (docs/reference/look-01.jpg): a hillside of abandoned Chongqing housing on an overcast day, layers stacked up the slope, grid facades with dark openings, rain streaks, moss, soft flat light.

## 15. Performance

Medium graphics for everyone (render/view.ts GFX: detail within 90 m, rooms within 35 m, a 2048 shadow map). Target 150 fps on the director's machine (U-104): a frame's CPU work (the game's frame JS, 0.4 of a sim tick, 0.015 ms a draw call) averages at most 6.6 ms at ten viewpoints in the city by day and night, with at most 250 draw calls and 1.35 M triangles at each (tests/e2e/framecost.e2e.mjs). A crowd (tests/e2e/crowdcost.e2e.mjs: some 100 machines on the lineup's plaza, giants included, in view) stays within the same frame: a machine keeps apart only from bodies it could touch this tick; the machines are one batch, culled and posed unit by unit (out of view, not posed; past 40 m a walker posed every other frame). The sim skips machines whose whole beat is out of reach of what's being asked (sight, hearing, fire, the hive's word), a hunting machine plans its way again only when its target has moved, and rooms' furniture is copied from pieces built once. City solids merge per material per 128 m chunk, props instance and merge (moving ones like the site's gate and crane load, and things he drops, one mesh a material; dropped things drawn within 90 m), far chunks are stand-ins, the shadow map redraws only when needed.

## 16. The desktop game (U-104)

A Windows installer (.exe) from desktop/ (Electron): whenever main's package.json version has no release, GitHub Actions (.github/workflows/release.yml) builds it and publishes it as that version's GitHub Release; the README links the latest (releases/latest/download/Chongqing-2038-Setup.exe). Installed, it updates itself from the Releases on start (the new version installs when it's closed), runs uncapped by the screen's refresh (F11 fullscreen, no menu so Ctrl+W never closes it), and keeps its songs/ and maps/ folders in Documents/Chongqing 2038, which updates never touch. A new release is made by raising the version.

## 17. Architecture and dev tools

- `src/sim`: deterministic fixed-step simulation (60 Hz), headless; state is one plain JSON-able object; all randomness from the run seed.
- `src/world`: builds the static city (solids, ramps, water, climbables, interactables, nav graph, patrols) from `src/data`, the same every run, and the same in every browser as in the Node tests: it takes sin, cos, tan and atan2 from `src/world/trig.ts` (fdlibm's, as Node has them), never Math's, whose last bits differ between engines. tests/sim/samecity.slow.test.ts keeps seed 1's city hash in tests/worldhash.json and tests/e2e/samecity.e2e.mjs checks Chrome builds the same.
- `src/data`: tuning and content (movement, units, items, recipes, loot, dialogue, scenarios, the geo extract).
- `src/render`, `src/ui`, `src/audio`, `src/input`, `src/dev`: browser only; the renderer interpolates between ticks.
- Collision: boxes and ramps (turnable about a pivot) in a 4 m grid and the heightfield; per-axis sweeps with step-up; rays for sight.
- `?dev=1`: teleports, time and weather, perception overlays, item spawner, god mode, noclip, frame costs. `?scenario=<name>`: set-up situations for tests. `?seed=<n>`: the run seed.
