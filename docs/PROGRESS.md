# Progress

<!-- status -->
**Status:** building M6. Next: M6-03 Hongyadong.
Features done: 401 / 438 | Last done: M7-07
<!-- /status -->

## What's built

**Moving (M1).** A deterministic 60 Hz sim with box-and-ramp collision. Sprinting, crouching, slides, vaults and hops, wall clings, runs and kicks, chimneying, two-handed climbing (lips, sills, pipes, ladders, bars, laches, dynos, pull-overs), grip endurance, falls that hurt, swimming and diving, encumbrance; first-person 3D hands that grip and hold things; one fixed sound for every move. The movement envelope is measured and the city is built to it.

**Surviving (M2).** The clock, sky, weather (fog, rain, winter snow) and seasons; health, bleeding, sprains and breaks, hunger, thirst and fatigue shown through the body, not meters; the item database, grid backpack, hotbar and eating; beds, sleep as a time skip, saving.

**The city (M3, M6).** Yuzhong at 1:1 from OpenStreetMap and the real ground: streets, stairs, terraces, the rivers, every building at its real height, half of them enterable as mazes of rooms, stairs, locked and chained doors and collapses; climbable facades; alleys, sewers, the Grand Tunnel, the metro stations, the underground city; Shibati, Jiaochangkou, Jiefangbei (the monument, malls, LED edicts), the lower town, the riverfronts walled all round with docks; building types rolled each run (homes, offices, clinics, workshops, military posts, malls) with their rooms and loot. High-security sites inside real buildings: the hospital, police station, electronics market, telecom exchange (gas, camera mesh, the district relay), the Xinhua Road substation (live busbars, the spare HV fuse, his father's badge) and the river-police pier (gangway, ladder, crane, patrol boat, sonar buoys); every way in has a teleport, and each site has a 10 s unwatched approach.

**The machines (M4).** Cameras, lampposts, patrol and hunter drones from rooftop docks, quadrupeds, humanoids, heavies, giant walkers, sewer crawlers, delivery robots, turrets, sensors, strike drones, helicopter drops and convoys, all on learnable beats; sight, hearing and thermal senses; district alerts, the hivemind's broadcast, convergence, search, silence and jamming; combat both ways with hit zones, weak points, wounds, damage marks and salvage; tracking tags; the machines heard where they are; the street speakers' announcements.

**His kit (M5).** Anna's laptop (status, scan, map, logs, cams, drone, notes), binoculars, the SDR, camera taps and loops, a flyable salvaged drone, crafting at a bench (jammer, EMP, cloner, grappling hook and the rest), healing items, locks, lockpicks, crowbar, bolt cutters, ladders, ziplines, rappels, grapples, power and charging, guns with attachments, decoys.

**Story, sound, menus, polish (M7-M9).** The escape framework and endings, dialogue and voice tooling, the soundscape and mixer, the main and pause menus, settings, saves that survive bad data, a frame-time pass.

**The large update (M10, U-104), so far.** Dying wakes him at his last sleep with a death count; the repository trimmed (no ROADMAP, QUESTIONS or PLAYTEST: questions and playtest requests go to the director in chat; one CREDITS.md); the fast check shares one built city per worker; the director's docs rewritten.

## What's left

M10 in order (features.json): 150 fps on medium; settings word for word and the main menu; prompts without keys; Anna's remarks gone; the desktop download; the laptop held in both hands, focus, its tabs and Anna in the corner; ice blue; no raids; the Li family flat to visit; autumn; the start; loot and places finished (the construction site); the map editor, maps menu and training room; story, documents and his sister's trail; eldritch machines that keep their distance; the endings; the opening scene. Then M6's remaining places (Hongyadong, Chaotianmen, bridges, the cableway, the metro control room, the drone hub, the checkpoint, the city tunnels), the escape routes (M7) and the final passes (M9).

## Log (newest last)
- M10-01: death returns him to his last sleep, the death count kept.
- M10-02: a lean repository and a ten times faster check (one built city per test worker: 631 tests in under 4 minutes).
- M10-03: the director's docs rewritten: DESIGN, PROGRESS, DECISIONS
- M10-04: 150 fps on medium: a leaner sim tick and frame
- M10-05: settings word for word
- M10-06: settings over a running world; the main menu stops everything
- M10-07: prompts say just the thing
- M10-08: menus close the way they opened; the sleep menu says hours and the wake time
- M10-09: subtitles only for Anna's story lines; no hints
- M10-10: the main menu and its changelog
- M10-12: no grab, sprint or jump; the lean keys turn Map, Status, Scan, Notes; battery, date and skull in its corner
- M10-11, M10-13: the Windows installer updates itself (v0.2.1 with latest.yml); Q sits him down at the laptop, nine dots open every tab
- M10-14: map tools sitting (marker, line, text, eraser, zoom, drag), every building by type from the start, hideouts unmarked; U-105 logged
- M10-56: the laptop held out in front of him, low, no arms; Resume; the mouse taken back after menus; the menu on black; README says how it updates
- M10-57: a real laptop (aluminium lid and deck, bezel and webcam, hinge, keys, trackpad, scuffs) and a real screen (bloom, glare, grain, dark edges)
- M10-58: Anna's OS: a taskbar of app icons with the tray, windows with title bars, minimise, maximise and X
- M10-60: the main menu's own music, a quiet A-minor loop that fades out as play starts
- M10-15: sitting, Status's wounds say how they're treated, Scan picks from the backpack, Notes is written and kept
- M10-16: sitting, the drone launched and flown from its app, cameras picked and looped, sightings shown on the map
- M10-17: his own songs from the laptop (a folder in the browser, the songs folder on desktop); the game's own music removed
- M10-18: Anna in the laptop's corner, drawn and animated: idle, blinking, waving, laughing, pouting, blushing
- M10-59: the game's icon is Anna's face (installer, window, browser tab); version 0.3.0 for the next release
- M10-19: ice blue: every menu, the map, the headlamp's dim mode, and the neon by the family flat lit only at night
- M10-20: no more raids: tracked (tagged, or at a hideout given away), he's hunted where he is
- M10-21: the Li family flat, walked into from the street (its doors forced) and a key place on the map once he knows of it
- M10-22, M10-23: late autumn at the start, fallen leaves on the grass and paving; machines out everywhere from the first second but not at his door
- M10-24, M10-27, M10-28, M10-30, M10-36: the ladder in front of the wall; no bed in the start hideout, a table by the crate; one pack charges everything; one cable outside the hideout; the cutscene's leftovers gone
- M10-25, M10-29, M10-35: placed things picked back up; never stuck in a window's corner; the trailer's music
- M10-37, M10-41, M10-42, M10-48: found documents; no headlamp at the start; locked doors just click; machines take fewer hits
- M10-43, M10-47, M10-50: crawlers only underground; the dead read at a glance; real trees, vines and street poles to climb
- M6-10, M10-26, M10-38, M10-61, M10-62, M10-63, M10-65, M10-66, M10-44, M10-31, M10-45: the construction site, loot everywhere, the Li flat, no gym, eldritch machines that keep apart, the ground solid, leaves under the trees, the alley's neon ice blue, real explosions, the city's music back
- M10-64: the laptop opens without a hitch (no light added on opening, its page and map ready from load)
- M10-32: the map editor (build on flat ground with every climbing piece, props, containers and signs; save, export, import, play)
- M10-46: every enemy attacks like it means it (each kind's wind-up, strike, recovery and repositioning, keeping its distance)
- M10-39: his sister's trail (her exit from the seed, her notes from the family flat to it, leaving with her or without)
- M10-33, M10-34: the Maps menu (the tutorial built in; play, edit, copy, delete, new) and the Training Room (VR goggles into the tutorial and back)
- M10-38b: the secure sites made by hand (hospital, police station, market, telecom exchange, substation: their mazes, locks, collapses and stories)
- M10-40: key places on the map only as he learns of them (a note naming one, or walking in), Anna's word on each
- M10-38c: under the city made by hand (the air-raid shelter's hotpot, the metro's control room, the Grand Tunnel's cool room)
- M10-38 fix: a city with no house for the Li family's flat in Shibati puts it in the nearest round it (no crash on a new run)
- M10-49: many machines without the lag (a crowd's tick and frame cut), and the draw calls back under budget everywhere
- M10-38d, M6-16, M7-08, M7-09, M7-10: the cableway station by hand (its ropes on the real line), the pier and the site; Route C: the boat, the crossing and its route test; and the city built the same in the browser as in the tests
- M10-52, M10-53: the opening scene (waking in the blue light, Anna's first words, the laptop and the bag) and her line on each tab
- M7-05, M7-06, M7-07: Route B over the Yangtze (the cabin ride past the line drone, the haul-rope trolley) and its route tests
