# Credits

Chongqing 2038 is coded entirely by Claude (Anthropic) from the director's prompts. Nearly all of it is made in code: the city's geometry, its textures (drawn on canvases) and most of its sound (Web Audio synthesis). Signs use the player's system Chinese fonts. These are the things it uses from others.

## Shipped with the game

| What | Files | Source | Author | Licence |
|---|---|---|---|---|
| His hands (posed and recoloured in code) | public/models/hands/left.glb, right.glb | `generic-hand` from WebXR Input Profiles (`@webxr-input-profiles/assets`) | © 2019 Amazon | MIT |
| His hands taking hold of a ledge or a bar | public/audio/sfx/handleSmallLeather.ogg, handleSmallLeather2.ogg | [RPG Audio](https://kenney.nl/assets/rpg-audio) | Kenney | CC0 |
| The street speakers' voice (lines from src/data/announce.ts) | public/audio/pa/*.ogg | [Kokoro-82M v1.1-zh](https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh) (ONNX build: onnx-community), voice zf_001 | hexgrad | Apache-2.0 |
| Streets, buildings, parks, rail, bridges, the cableway, the river banks | src/data/geo/osm.json | © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors | | ODbL 1.0 (the extract is a derivative database) |
| The ground's height | src/data/geo/ground.ts | Terrain Tiles on AWS Open Data (Mapzen / Tilezen) from SRTM (NASA/USGS, public domain), GMTED2010 and ETOPO1, smoothed by tools/geo-fetch.mjs | | public domain |
| The city's quiet music (eight pieces, and the pursuit pulse) | src/audio/music.ts | composed for the game and played by Web Audio synthesis | Claude (Anthropic) | the game's own |
| The main menu's music | src/audio/menu.ts | composed for the game and played by Web Audio synthesis | Claude (Anthropic) | the game's own |
| The trailer's music (90 s, A minor: cold open 0-12 s, introduction 12-35, escalation 35-65, climax 65-85, button 85-90) | public/audio/trailer.ogg | composed for the game and synthesised sample by sample by tools/trailer.mjs | Claude (Anthropic) | the game's own |
| Rendering | three.js | [threejs.org](https://threejs.org) | three.js authors | MIT |

## Used to make it, not shipped

- Vite (MIT), TypeScript (Apache-2.0), Vitest (MIT), Puppeteer (Apache-2.0).
- Photos of the real places, kept as modelling references in docs/reference/places: from Wikimedia Commons, each with its author and licence in docs/reference/PLACES.md.
