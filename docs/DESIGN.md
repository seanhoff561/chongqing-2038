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

**Key places.** The named places (the Li family flat, the sites, the exits' approaches) are not on the map at the start. A clue that names or shows one (a document, a note, a sign) marks it the next time he opens the map, with Anna's line on it; walking into one marks it. Each key place has its own hand-designed layout, a maze like the generated buildings (stairways, locked doors, collapses) but its own, and tells part of the story through what's in it: the Li family flat tells what happened to his family; other places tell how life went on and how the city came to this.

**Found documents.** Worldbuilding documents turn up now and then in homes, offices, workshops and military posts, each something a person there would have written or kept, each fitting where it's found (a journal page about sneaking into the sewers through the basement grate only in a home with one), never twice in a world. Story documents lie at the key places. Each is an item: hovered in the backpack it shows its title and its whole text. 29 worldbuilding documents (homes, shops, offices, workshops, clinics, military posts; one needs a basement drain grate, four a district) and 11 story ones (the five high-security sites, the construction site, the pier, the Grand Tunnel, the air-raid shelter, the metro, the cableway), all in `src/data/documents.ts`. As a run starts each worldbuilding one goes into one container picked by the run's seed among those that fit, and is in it when it's first searched; a site's story document goes into one of the site's containers, the others lie on the floor at their place. Written to be specific and human, never generic. Two examples from the director: *Deepmind Article*: "China pulls ahead of the US in the race to ASI! Millions of Chinese celebrate, many call for 'an end to poverty.'" *Journal Page*: "Wei and I snuck into the sewers through the old grate in the basement... it was so dark, if only we had a light..."

**His sister.** Xiaoyu is alive and gone. Each run she has left the city by one of the exits, a paper trail of her notes leading from the family flat through places on her way to it: each note has context clues but never the whole answer, so he pieces it together and is always one step behind her. The trail also shows him which places matter for that exit and how. At her exit he can leave with her or without her.

**Endings.** Each exit has its own ending (section 10), with or without his sister, then the run's summary (days survived, places entered, times seen).

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
| Climbing | pipes, ladders, street poles, tree trunks and vines are grabbable anywhere along them: hand over hand (U-104: the real ones, no added poles) |
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
| Crawler | the sewers and tunnels only (U-104: never on the streets) | short, thermal | underground |
| Delivery robot | 2 m/s, no stairs | 120 deg, 18 / 10 | flat streets |
| Turret, PIR, tripwire, pressure plate, acoustic sensor | static | | inside sites |
| River drone boats, sonar buoys | 4 m/s / static | 50 m sonar | the rivers |

**Patrols.** Every unit has a route with dwell times and active hours. While Unaware its position is a function of the game time and its phase, so sleep is a cheap time skip and timings can be learned. Patrol drones fly 6 real minutes on a battery and sit on their dock 2: a learnable gap. Units think at 10 Hz, move at 60 Hz, path on a navigation graph (streets, stairs, tunnels). No machine starts within about 40 m of the hideout's way out in a run's first minutes; everywhere else they're out from the first second.

**How they look and move (U-104).** Eldritch and futuristic: all white, pointed and unfamiliar in shape (not dogs and men in boxes), no eyes or faces; more variety of shape and size within each kind. Their paths bend organically at small scale; no machine enters a wall, another machine's body or his. Each kind has its own attack pattern (wind-up, strike, recovery, repositioning) and keeps its distance rather than running into him. A destroyed machine or a dead camera fades to grey-black; a machine that dies falls as a ragdoll.

### Combat

| Enemy weapon | Fire | Damage | Notes |
|---|---|---|---|
| Humanoid rifle | 3-round burst a second | 30 a hit | hit chance falls with his speed, distance and cover |
| Hunter drone SMG | 2-round burst / 0.8 s | 8 | accuracy 0.4 |
| Turret | 6 rounds/s | 12 | accuracy 0.7 within 40 m |
| Quadruped tag launcher | 1 / 6 s, 20 m | 0 | sticks a tracking tag (above) |
| Quadruped shock prod | 1.5 m | 15 + 1 s stun | |

Each hit: 30% heavy bleed, otherwise light; 15% a limb (sprain or graze). Machines have hit zones (sensor heads blind them, batteries shut them down); U-104 lowers most machines' health (dogs and humanoids most, drones as they are). His weapons: knife (40, takedown from behind: 2 s within 1.5 m of a quadruped or humanoid not Engaged), crowbar (55, slow), pistol (25, 15 rounds, heard 150 m), pump shotgun (8 x 12, 5 shells), nail gun (14, quiet, 15 m), grenade (6 m, 200), EMP (6 m: drones crash, robots off 30 s, cameras 60 s; 3 charges). Ammunition is scarce.

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

**Crafting** at a bench (a toolbox on a table, square on its top): jammer (SDR + RF amplifier + battery pack + board), EMP (capacitor bank + coil + battery pack + trigger), camera tap (board + cable + clip leads), drone controller (board + radio module + battery pack), cloner (RFID reader + board + battery pack), grappling hook (steel hook + rope), haul-rope trolley (pulley block + 2 carabiners + harness), battery pack (scooter cells + tape), splint (2 rods + tape), bandage (cloth + alcohol), lockpicks (2 hairpins), clean water (river water + tablet), solar charger. Weapons and explosives are found, never made. Salvage from downed machines: rotors, radio and camera modules, servos, power cells, armour plate.

**Loot.** Containers roll seeded tables by what they are and where: kitchens, bedrooms, shops, workshops, cars; the rarer buildings' rooms (offices, clinics, barracks, armouries); each high-security site's own (tier 2 tools, medicine and electronics; tier 3 weapons and network kit; tier 4 the drone hub's). Toolboxes turn up in kitchens, shops, car boots, workshops and the substation (U-099). Every item can be found somewhere.

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
| Construction site | scaffold over the hoarding from the street; crawl under it along the ditch; drop from the next roof onto the hoist (the real Line 2 beam is 850 m off, D-131); the gate (his site card, under its camera) | tier 2 tools: bolt cutters, rope, carabiners, harness, steel hook, nail gun, grinder, jerrycan, breaching charge; the pulley block in the crane cab | loose scaffold planks that tip under a run; the crane on autopilot |
| Hospital | ambulance bay (camera + card); the laundry crawlspace; the roof; the basement from the tunnels | tier 2 medical | pressure-plate pharmacy, motion sensors in the wards |
| Police station | the roof; pry the garage shutter; cut the cell-block bars; the front door (card, camera) | tier 3 weapons and keys (pistol, shotgun, grenades, the boat key) | the armoury turret |
| Electronics market | the loading dock; the vent from next door; the roof; the basement | tier 2-3 electronics | acoustic sensors |
| Telecom exchange | the gate (card, camera); the vent; the roof; the cable tunnel | tier 3 network kit | gas in the server hall (8 s) |
| Substation | the gate (his father's badge, camera); cut the back fence; the control roof; the drain culvert | electrical: insulated gloves, coil, the one spare HV fuse | live busbars (arcs within 1 m; keep low) |
| River-police pier | the gangway (cameras); the ladder out of the water; the cargo crane's jib | the patrol boat | sonar buoys, drone boats |
| Cableway station, metro control room, Raffles drone hub, bridge checkpoint | to build (M6) | | |

Every site has an approach unwatched for 10 s or more (the coverage test).

## 10. Escape routes

| Route | What it takes |
|---|---|
| A. Dongshuimen rail deck 桥下 | cut the bridge's sensor-bus relay (bolt cutters, insulated gloves), a jammer, reach the deck (the Line 6 tunnel or the north pier), cross 300 m of truss |
| B. Yangtze Cableway 索道 | the cabin (the spare HV fuse restores the feeder, the operator key) or the haul-rope trolley (pulley block, carabiners, harness) from the station tower |
| C. River at night 雾中 | the police boat + 20 L of fuel + a battery + the key or a CAN hotwire; past the buoys and drone boats in fog, drifting, or jammed |
| D. Underground 隧道尽头 | the flooded section (pumps on the spare fuse, or the oxygen kit), the blast door (grinder, charge or keycard), the seismic sensors |

There is one spare HV fuse (a second in the Raffles hub). The construction site feeds three routes. Each route has its own short ending, with or without his sister.

## 11. The laptop (U-104)

**In his hands.** Tab takes it out: he holds it out low in front of him, its screen tipped back toward his eyes (no arms drawn); it goes with his body and the way he faces, not his look, so he looks down to read it and over it to see ahead, and can't grab, sprint or jump while it's out; the page lies on its glass in perspective. The machine is a worn space-grey aluminium laptop: rounded lid, glass bezel with a webcam, hinge, a keyboard of separate keys and a trackpad, scuffed and scratched (M10-57). Its screen looks like one: the backlight's bloom round it, the room's light glancing off the glass and sliding as he moves, the pixels' grain seen close, darker edges; ice blue on near-black, minimal. Its glow (ice blue) lights him and what's round him at night (0.5). A full battery lasts 8 game hours open; one battery pack charges it (and all he carries) full; a powered hideout charges it shut. Anna stands in a corner.

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
| Songs | | the song playing, Play or Pause and Skip: the songs in the songs folder (desktop; Open the songs folder, read again each time the app opens) or a folder he picks (browser), shuffled, one after another as background music through the master volume; the game has no music of its own |
| Training Room | | VR goggles on, the screen fades into the tutorial map |

A tab he can't use yet opens to a hint at what unlocks it (the binoculars, a camera tap, a drone).

## 12. Menus, maps and the tutorial (U-104)

**Main menu**, on plain black (U-105), everything paused under it, its own quiet music looping (a slow A-minor piece: pad, bass, an echoing electric-piano line; it fades out as play starts, M10-60): 重庆 2038; Continue (the save's date and time); New Run; Settings; Maps; the version number, which opens the changelog: the README at the top, then the changes (PROGRESS), then the credits, a link to the GitHub page and a note that the game was coded entirely by Claude, linking the repository. Ice blue on near-black, like every menu.

**Maps.** Lists the maps in the maps folder (the desktop game's maps/ folder; the browser's saved maps), the tutorial among them. Double click plays one; a single click selects it to edit, delete or copy; New makes one.

**The map editor.** A flat empty ground. Place, move, turn, size and delete: one large empty apartment to fill; movement-gym platforms of any size; pipes, ladders, poles, ledges, rails, ropes and every climbing and parkour piece; props and decorations; containers with chosen loot; red signs for floors and walls whose text he edits and players read by interacting; the spawn point. Save, export and import (JSON); play the map from the editor. The tutorial is a map the director makes with it, shipped with the game, played from the laptop's Training Room. (It replaces the old movement gym.)

## 13. Audio

Synthesised with Web Audio, one master volume: footsteps by surface (low and soft), breathing and heartbeat, rotor buzz with Doppler, servo whine, gunfire, rain, the rivers, city hum, tunnel drips. The street speakers' announcements are recorded (Kokoro, Chinese) and play from the lampposts round him, unsubtitled. Anna's lines play in the same voice, clear. The game has no music of its own: the laptop's Songs. A trailer track of 90 s ships for the director's trailer, public/audio/trailer.ogg, made by `node tools/trailer.mjs` (synthesised sample by sample, A minor, 120 bpm, the menu's motif): cold open 0-12 s, introduction 12-35, escalation 35-65, climax 65-85, button 85-90 (a hard cut, a last A, a servo and a rotor leaving).

## 14. Art direction

No visible draw distance: detail near him, the rest as cheap stand-ins in aerial haze. Wet concrete and tile, mossy walls, fig roots, tiled blocks with balconies and AC units; brick and timber in Shibati; glass towers and LED screens in Jiefangbei; neon and signs in simplified Chinese. Late autumn: the trees turned, leaves on the ground; winter snow. Everything of his is themed ice blue (the menus, the laptop, its light, the headlamp's dim mode, the neon by his family's flat, lit only at night). The machines are white. The reference (docs/reference/look-01.jpg): a hillside of abandoned Chongqing housing on an overcast day, layers stacked up the slope, grid facades with dark openings, rain streaks, moss, soft flat light.

## 15. Performance

Medium graphics for everyone (render/view.ts GFX: detail within 90 m, rooms within 35 m, a 2048 shadow map). Target 150 fps on the director's machine (U-104): a frame's CPU work (the game's frame JS, 0.4 of a sim tick, 0.015 ms a draw call) averages at most 6.6 ms at ten viewpoints in the city by day and night, with at most 250 draw calls and 1.35 M triangles at each (tests/e2e/framecost.e2e.mjs). The sim skips machines whose whole beat is out of reach of what's being asked (sight, hearing, fire, the hive's word), a hunting machine plans its way again only when its target has moved, and rooms' furniture is copied from pieces built once. City solids merge per material per 128 m chunk, props instance and merge, far chunks are stand-ins, the shadow map redraws only when needed.

## 16. The desktop game (U-104)

A Windows installer (.exe) from desktop/ (Electron): whenever main's package.json version has no release, GitHub Actions (.github/workflows/release.yml) builds it and publishes it as that version's GitHub Release; the README links the latest (releases/latest/download/Chongqing-2038-Setup.exe). Installed, it updates itself from the Releases on start (the new version installs when it's closed), runs uncapped by the screen's refresh (F11 fullscreen, no menu so Ctrl+W never closes it), and keeps its songs/ and maps/ folders in Documents/Chongqing 2038, which updates never touch. A new release is made by raising the version.

## 17. Architecture and dev tools

- `src/sim`: deterministic fixed-step simulation (60 Hz), headless; state is one plain JSON-able object; all randomness from the run seed.
- `src/world`: builds the static city (solids, ramps, water, climbables, interactables, nav graph, patrols) from `src/data`, the same every run.
- `src/data`: tuning and content (movement, units, items, recipes, loot, dialogue, scenarios, the geo extract).
- `src/render`, `src/ui`, `src/audio`, `src/input`, `src/dev`: browser only; the renderer interpolates between ticks.
- Collision: boxes and ramps (turnable about a pivot) in a 4 m grid and the heightfield; per-axis sweeps with step-up; rays for sight.
- `?dev=1`: teleports, time and weather, perception overlays, item spawner, god mode, noclip, frame costs. `?scenario=<name>`: set-up situations for tests. `?seed=<n>`: the run seed.
