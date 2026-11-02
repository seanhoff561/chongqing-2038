# Questions for the director

Each has the default I chose; I carry on with the default.

## Q-001 .claude/settings.json could not be written (open)
Phase 0 asks for `.claude/settings.json` with `"autoCompactWindow": 300000`, allow rules for npm, npx, node, git and rg, and a deny rule for force-pushes. The session's permission guard blocks the agent from writing its own settings file ("self-modification"), so it isn't in the repo. Default: carry on without it. To add it yourself, commit this as `.claude/settings.json`:

```json
{
  "autoCompactWindow": 300000,
  "permissions": {
    "allow": ["Bash(npm:*)", "Bash(npx:*)", "Bash(node:*)", "Bash(git:*)", "Bash(rg:*)"],
    "deny": ["Bash(git push --force:*)", "Bash(git push -f:*)", "Bash(git push --force-with-lease:*)"]
  }
}
```

## Q-002 GitHub Pages source (resolved: deploys succeed)
The deploy workflow publishes with GitHub Actions. If the Pages source in the repo settings isn't set to "GitHub Actions", the deploy job fails while tests and build still pass. Default: leave the workflow as is; set Settings > Pages > Source to GitHub Actions once.

## Q-003 Hand sprites (open)
The White Knuckle sprite sheets you shared are that game's copyrighted art, and images pasted in chat don't reach the cloud session as files. Default: original hand sprites drawn in code in the same dithered style (idle, readied, gripping, pulling, both hands). If you have rights to other art, commit the PNGs under public/hands/ and I'll use them.

## Q-004 Stamina (open)
You weren't sure about stamina. Default: no running stamina at all; only grip endurance while hanging (it refills as soon as the hands are free, and the hands shake as it runs low). Say if you want grip to be unlimited too, or a light running limit back.

## Q-005 Mouse pull direction while gripping (open)
Default: dragging the mouse down hauls him up toward the hands and sideways swings him that way, like White Knuckle. If you meant the body should follow the mouse (drag down to lower yourself), say so and it becomes the default; either way an invert option goes into settings.

## Q-006 Reference image file (resolved)
The director uploaded it; it now lives at `docs/reference/look-01.jpg`, described in DESIGN section 15.

## Q-007 Reference photo downloads blocked (resolved)
Resolved: the director opened the network; 42 freely licensed photos are in docs/reference/places/ (M3-24).

The session's network policy denies commons.wikimedia.org and upload.wikimedia.org (also Flickr, Unsplash, Openverse), so M3-24 has notes and links (docs/reference/PLACES.md) but no photos yet. To allow them: open the cloud environment menu in the session's title bar, then Edit, then Network access, and add those two hosts under Allowed domains (leave "Allow package managers" ticked). Steps: https://code.claude.com/docs/en/cloud-environments#network-access. You can also upload photos yourself like look-01 (docs/reference/places/). Default meanwhile: model places from the notes and look-01.

## Q-008 Which are the "parking lot style buildings"? (resolved: the empty open shells, replaced in M3-36)
U-034 asks to get rid of the parking-lot-style buildings. Default: the banded facades (long horizontal strips of concrete over dark slots, used for shops, offices and malls in the centres), which read like multi-storey car parks; they become window-grid facades like the rest. If you meant something else (the megastructures on columns, the blocks built over lanes, the factory halls), say which.

## Q-009 Your frame rate (M4-83b, U-061)
M4-83b asks for about 144 fps on your machine; only you can measure it. In this cloud session the browser draws with a software renderer, so its timings (and the perf smoke test's 5 ms CPU and 250-call budgets, now at 13-17 ms and 283-296 calls) say little about a real GPU. Default: M4-83b stays open until you report; I carry on with M5. To report: open the game with ?dev=1, stand in a busy street by day and at night, and note the dev panel's frame rate (and its bench), plus anywhere it stutters. If it's under 144, the next job is merging the city's per-chunk draws (the cell you stand in alone is ~130 draws: chunk meshes, room interiors, doors and windows).

## Q-010 M6 and the frozen map (U-053)
M6 builds the rest of the city (districts, the ten high-security sites, bridges, the border wall, the cableway, tunnels), but U-053 froze the map: no layout or geometry changes unless you ask. Default: M6's districts are the ones already standing (their streets and buildings as they are); the sites go into buildings and places already there (their insides, roofs and grounds: ways in, loot, hazards, machines), with no city blocks moved, reshaped or added. Pieces that can't be done without new big geometry (Dongshuimen's truss as a route, the western border wall, the cableway's towers and haul rope, the far banks) I'll build only where they don't disturb what's there, and list for you first. Say if you want M6 to reshape the city instead.

Found while building M6 (Nov 2): Hongyadong's real footprint (OSM, 200 x 70 m down the Jialing cliff) is today covered by 19 generated buildings and some stairways. Building the stilt complex (M6-03) means replacing them, so M6-03 waits on your answer. The same goes for The Crystal on the Raffles towers (M6-04, M6-18), Dongshuimen's truss (M6-07, M6-08) and the western wall (M6-09). Default meanwhile: Jiefangbei is done as it stands (its monument, which had been built as a block of flats, is fixed: D-124), and the work that fits inside the existing city goes ahead (streets, riverfronts, sites inside existing buildings, tunnels underground).
