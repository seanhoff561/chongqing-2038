# Progress

<!-- status -->
**Status:** building M10. Next: M10-07 Prompts say just the thing (U-104).
Features done: 334 / 424 | Last done: M10-06
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
