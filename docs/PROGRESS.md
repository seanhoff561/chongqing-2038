# Progress

<!-- status -->
**Status:** building M10. Next: M10-19 Ice blue (U-104).
Features done: 350 / 429 | Last done: M10-59
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
