# Chongqing 2038

A first-person survival and parkour game: Li Wei wakes in a hideout under machine-occupied Chongqing in 2038 and has to get out of the city. A 1:1 Yuzhong peninsula built from the real map, machines on learnable patrols that hunt as one mind, four ways out, and a sister to find on the way.

Repository: https://github.com/seanhoff561/chongqing-2038 \
Browser: https://seanhoff561.github.io/chongqing-2038/ \
Installer (Windows, updates itself): https://github.com/seanhoff561/chongqing-2038/releases/latest/download/Chongqing-2038-Setup.exe \
Discord: https://discord.gg/MfQhmwQcp \
X: https://x.com/seanryanhoffman \
Support (I'm a student): bc1pzld427zjykqtpse877h5yf9sklm32z4dt38k496sujegu8jq9cqx8pxyu (BTC)

## Install and update

Windows: run the installer above. Updating it: nothing to do. Each time the game starts it checks for a new version and downloads it in the background (a notification says when one's ready); it installs when you close the game, so the next time you open it you're on the new version. To update by hand, run the installer again: your save, songs and maps are kept.

A new version is published by raising `version` in package.json on main: the release workflow (.github/workflows/release.yml) sees that version has no GitHub Release yet, builds the game into the desktop app (desktop/, Electron) and publishes the installer as release v<version>. Every push to main also puts the browser version up on GitHub Pages.

Your folders (desktop game): Documents/Chongqing 2038/songs (your music, for the laptop's Songs app: mp3, ogg, wav, m4a, flac, opus) and Documents/Chongqing 2038/maps (maps from the editor, one .json each). Updates never touch them. In the browser, Songs plays a folder you pick and maps are kept in the browser's storage.

## Run it locally

- `npm install`, then `npm run dev` and open the address it prints (add `?dev=1` for the dev tools)
- `npm run check`: typecheck and fast tests
- `npm run verify`: typecheck, all tests, production build, browser smoke test
- `npm run build` / `npm run preview`: the production build and a server for it
- `npm run typecheck`, `npm test`: each on its own
- `npm run status` / `npm run next`: the work list's counts per milestone and the next features

Flags: `?dev=1` (dev mode: teleports, time and weather, overlays, item spawner, god mode, noclip, frame costs), `?seed=<n>` (the run's seed), `?scenario=<name>` (a set-up situation, below).

## Controls

Fixed: W A S D move, the mouse looks, Space jumps, the left and right mouse buttons are the left and right hand (and use what's held), 1 to 5 the hotbar, 0 or ` empty hands, Esc settings (and closes any menu), F11 fullscreen. The rest can be rebound in Settings, to any key or mouse button 4 or 5:

| Action | Key |
|---|---|
| 冲刺 Sprint | Shift |
| 蹲下 Crouch (slide while sprinting) | Ctrl |
| 爬行 Crawl | C |
| 互动 Interact (hold for timed actions) | E |
| 左探/左页 Lean/Tab Left (laptop out: the app before) | Mouse4 |
| 右探/右页 Lean/Tab Right (laptop out: the app after) | Mouse5 |
| 装弹 Reload (and rotate an item while dragging it) | R |
| 头灯/专注 Headlamp/Focus Laptop (laptop out: sit down at it, and stand up) | Q |
| 撑墙 Chimney | X |
| 露宿 Sleep Rough (hold) | Z |
| 笔记本 Laptop | Tab |
| 背包 Backpack | Alt |

- Sitting at the laptop: the mouse moves a cursor; click the taskbar's icons to open apps, drag windows by their title bar; Q or Esc stands up. Standing, the lean keys (or the arrow keys) turn its four apps.
- Drone (the laptop's Drone app, with a salvaged drone and its controller): Launch (sitting) or Enter (standing); flying, W A S D, Space up, Ctrl down, Shift faster, Tab brings it back.
- Cams (with a camera tap): Enter loops the feed shown, the up and down arrows change camera.
- Patrol boat: W and S throttle ahead and astern, A and D the rudder, E starts and stops the engine, Space steps off.
- Cable cabin: Ctrl keeps low, Z lies down. Haul-rope trolley: Ctrl lets go.
- Map editor: click selects, drag moves, the handles size, lift and turn it; R turns, Delete removes; right drag looks, W A S D and Q E fly, Shift faster, the wheel forward and back.

## Scenarios

Open the game with `?scenario=<name>`:

| Name | What |
|---|---|
| run | a new run: day 1 in the friends' hideout (the default) |
| shibati | Shibati and Jiaochangkou: the top of the Eighteen Stairs |
| hideout | the furnished air-raid shelter (test scene) |
| yuzhong | Yuzhong at 1:1, from Jiefangbei |
| tunnels | the Grand Tunnel, at the junction of its north passage |
| pursuit-drone | a drone tailing him at the top of the Eighteen Stairs: get away |
| pursuit-dog | a quadruped coming for him by the alleys there: get away |
| pursuit-camera | a camera has him at Jiaochangkou: get out of sight before they come |
| ending-bridge | Beneath the Bridge: the rail-deck route's ending |
| ending-cable | The Cable: the cableway route's ending |
| ending-boat | Into the Fog: the river route's ending |
| ending-tunnel | Tunnel's End: the underground route's ending |
| jiaochangkou | Jiaochangkou junction |
| hongyadong | Hongyadong on the Jialing cliff |
| xiaoshizi | Xiaoshizi and Xinhua Road, toward the Dongshuimen Bridge |
| chaotianmen | Chaotianmen at the tip, where the rivers meet |
| site-construction | the construction site and its tower crane |
| site-hospital | the hospital, at its ambulance-bay door |
| site-police | the police station, at its front door |
| site-market | the electronics market, at its loading door |
| site-telecom | the telecom exchange, at its front gate |
| site-substation | the Xinhua Road substation, at its gate |
| site-cableway | the cableway's north station, at its street door |
| site-pier | the river-police pier, at its gangway |
| snow | a snowy winter morning at the top of the Eighteen Stairs |
| units | the machines' lineup: every kind on a plaza at noon |
| map | a map made in the editor (empty if none) |
| reference | the reference hillside (docs/reference/look-01.jpg) from the vantage roof |

## Key files

- README.md
- BRIEF.md (initial prompt)
- CREDITS.md (credits)
- features.json (work list)
- docs/DECISIONS.md (user prompts in order and claude decisions)
- docs/DESIGN.md (exactly how everything in the game works/should work)
- docs/PROGRESS.md (what's done)

Disclaimer: I did not personally create any code or assets for this game (I am not a skilled individual). The only thing I did was prompt claude and playtest, a lot. You can see all of my prompts and the entire process in the repository. This game takes inspiration from other games (white knuckle) but no direct reverse engineering.
