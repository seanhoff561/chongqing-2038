# Making the Chongqing 2038 intro with AI video: a practical guide

Prepared 2026-11-02 for the director (also as a doc: https://claude.ai/artifact/YUWmihhzqRbdR1PenBPbGa). The script is `docs/cinematics/INTRO.md`, the look reference is
`docs/reference/look-01.jpg` (grey, wet, stacked concrete towers in fog), and the story comes from BRIEF.md.

**How the facts were checked.** All prices and features were checked on 2026-11-02 through web search. This
sandbox could not open vendor sites directly (kling.ai, help.openai.com and others are outside its network
allowlist), so most figures come from 2026 third-party pricing guides, not the vendors' own pricing pages.
Where sources disagreed I give the range and mark it **(unverified)**. Before you pay for anything, check each
vendor's live pricing page. Prices in this market change monthly.

---

## 0. Before you start: settle the look

INTRO.md's style bible (from your note U-018) asks for **stylised 3D Chinese donghua**: realistic proportions,
anime-clean faces, soft cel shading with fine ink outlines, painterly texture, and the photographic grey city
of look-01. It does not ask for photoreal. That choice changes which tool is best:

- **Donghua / stylised CG (what INTRO.md specifies):** the Chinese models (Kling, Seedance, Vidu, Hailuo) handle
  this look best, and they also speak Mandarin natively. **Kling** in particular tends toward polished 3D CG.
- **Photoreal (if you change your mind):** Google **Veo 3.1** and ByteDance **Seedance 2.5** lead on realism.

This guide recommends tools for the donghua look and notes where the answer would change for photoreal.

---

## 1. Which tools, and which to pick

### The field as of 2026-11-02

| Tool (maker) | Current model | Clip length | Strengths for this intro | Weaknesses | Status |
|---|---|---|---|---|---|
| **Kling** (Kuaishou) | **Kling 4.0** (general release 15 Oct 2026); Kling 3.0 / 3.0 Omni still offered | 4.0: 3-30 s; 3.0: up to 15 s | Up to 10 keyframes and 15 mixed references per generation (images, video, "Elements" = saved characters), multi-shot generation with cuts, native audio with Chinese dialogue, leans toward 3D CG (a good fit for donghua), cheap per second | 4.0 per-second credit cost not officially published; 4.0's 4K/HDR and API listed as "coming soon"; Chinese political content filter (see pitfalls) | Live |
| **Seedance 2.5** (ByteDance; via Dreamina / CapCut, also API hosts) | Seedance 2.5 | 4-30 s | Very heavy reference input (reported 30 images, 10 videos, 10 audio clips per generation), strong motion, native audio, lowest reported cost per second | Max resolution reported as 720p by some sources and 1080p by others **(unverified)**; commercial terms not confirmed; strict on real faces | Live |
| **Google Veo 3.1** (in Flow, the Gemini app, Gemini API / Vertex) | Veo 3.1 (Quality, Fast, Lite) | 4/6/8 s per generation, extendable | Best overall realism and native sound in most reviews; "Ingredients to Video" (reference images), "Frames to Video" (first/last frame), Extend; up to 4K | Pricey at Quality; audio and lip sync strongest in English; visible watermark except for AI Ultra subscribers generating in Flow; strict on minors in danger | Live |
| **Gemini Omni Flash** (Google) | Omni Flash (announced at I/O, 19 May 2026) | about 10 s | Unified "any input" model in Gemini and Flow; reported to keep one character and one voice across clips | New; little independent testing; not a replacement for Veo in the API | Live (consumer) |
| **Runway** | Gen-4.5 (Dec 2025; image-to-video and audio added Jan 2026) | about 5-10 s | Fine camera and motion control, References for characters and locations, good editing tools | Less strong on Mandarin; credits run out fast on smaller plans | Live |
| **Luma** Dream Machine | Ray3 / Ray3.2 | about 5-10 s | HDR output, good keyframe control, cheap credits | 720p at the cheap rate; weaker on character consistency | Live |
| **Hailuo** (MiniMax) | Hailuo 03 / "MiniMax H3" | about 6-10 s | Strong human motion and faces, cheap | Model naming and plans inconsistent across sources | Live |
| **Vidu** (ShengShu) | Vidu Q3; Q4 preview (7 Oct 2026) | about 8-16 s | Vidu's own tests claim the best anime-style consistency (a vendor claim) | Pricing not found **(unverified)** | Live / preview |
| **Open models** (Wan 2.x/3.0, LTX-2, Kandinsky 6.0, HunyuanVideo) | various | short | Free if you own a 24 GB+ GPU; no content filter beyond your own; full control | A lot of setup and tuning; quality a step behind | Open weights |
| **OpenAI Sora** | — | — | — | **Discontinued**: app closed 26 Apr 2026, Sora 2 API removed 24 Sep 2026 (several secondary sources agree). Don't plan around it. | Gone |

Aggregators (Higgsfield, Freepik, OpenArt, Krea and others) sell one subscription that reaches several of these
models. That is handy for the shoot-out in step 1 of the workflow. Their prices were not verified here.

### Recommendation

**Best result: Kling 4.0 on Kling's own site** (kling.ai), on a Premier-class plan for the month of production.
- It fits the donghua look and speaks Mandarin, and its reference system (Elements, up to 15 references,
  keyframes) is built for keeping Li Wei, his family and the machines the same across 53 shots.
- Use **Veo 3.1 Quality for 4-8 hero shots** if Kling's version disappoints. Good candidates are the
  atmospheric wides with no dialogue (S00-01 the skyline, S00-03 and S06-02 the grate POV, S04-01 the city
  turning red). You can reach Veo through the Gemini API with no subscription.
- **If you switch to photoreal:** use **Veo 3.1 for everything**, through **Google AI Ultra + Flow**. A month of
  Ultra covers the whole intro at Quality, removes the visible watermark in Flow, and includes Nano Banana Pro
  for keyframes.

**Cheaper alternative: Kling 3.0** (the same site and workflow, cheaper credits) at 1080p without native
audio, or **Seedance 2.5 on Dreamina** (reported at about $0.10 per second). Do the voices outside the video
tool. Check Seedance's commercial terms first.

**Do a shoot-out before you commit (about $30-50).** Generate the same three shots (S00-03 the grate POV,
S03-02 the father's word, S05-01 the stair chase) from the same keyframes in Kling 4.0, Seedance 2.5 and
Veo 3.1. Pick the tool by eye. No published head-to-head test covers 3D donghua specifically.

---

## 2. Pricing (checked 2026-11-02) and the cost of this intro

### What the intro needs

- **54 shot headings** in INTRO.md (the header says 53; S05-06a and S06-01a were added later). S00-04, the
  title card, is black with rain and the title set in the game's font, so it needs little or no generation.
  That leaves **53 shots to generate, about 362 s of footage** (the whole intro runs 366 s, about 6:06).
- **30 lines of dialogue.** About 14 are spoken on camera and need lip sync (the anchor, the lab director, the
  father, the mother, Xiaoyu, the foreman, the co-worker, Granny Wang). The rest are city speakers, phone calls,
  inner voice (内心) or Anna, so they need no lip sync.
- **3-4 generations per kept shot:** 362 s × 3.5 is about **1,270 s, call it 1,300 s of generated video**, plus
  the shoot-out.
- **Images:** about 15 reference sheets (Li Wei at 17 and 10, the father at 46 and 39, the mother, Xiaoyu,
  Granny Wang, the anchor, the lab director, the drone, the quadruped, the humanoid, the Siming ring mark, Anna's
  terminal, key props), about 8 location plates, and 53 keyframes plus about 30 end frames. With retries that
  is **about 600 image generations**.

### Video generators

| Tool | Plans (monthly) | Rate | ≈ Cost for 1,300 s | Source notes |
|---|---|---|---|---|
| **Kling 4.0** | Standard $8.80 (660 credits), Pro $32.56 (3,000), Premier $181.99 (18,000), Ultra+ $544.99 (57,000); the first month is discounted. Older guides list Premier at $64.99 for 8,000. | Not officially published: third parties say 10-15 or 31-47 credits/s at 1080p **(unverified)** | 19,500-61,000 credits, about **$200-620** | wireflow.ai, flick.art, kie.ai, imaginetovideo.com (Oct 2026) |
| **Kling 3.0** | same plans | 6 credits/s at 720p, 8 at 1080p, 12 at 1080p with native audio, 30 at 4K (citing Kling's own 3.0 guide) | 10,400-15,600 credits, about **$110-180** | kling.ai blog via aiarty / hooked.so |
| **Veo 3.1, Gemini API** | pay as you go; no free tier for Veo | Quality $0.40/s (720p/1080p), $0.60/s (4K); Fast $0.12/s at 1080p (since 7 Apr 2026); Lite $0.08/s at 1080p | Quality **$520**; Fast **$156**; Lite **$104** | the-decoder.com, benchlm.ai, layer3labs.io (Sep 2026) |
| **Veo 3.1, Flow** | AI Pro $19.99 (1,000 credits); AI Ultra $249.99 (25,000) (one source also lists $99.99/$199.99 Ultra tiers) | per 8 s generation: Quality 100 credits, Fast 20 (10 on Ultra), Lite 10 (5 on Ultra) | Quality is about 163 generations, about 16,300 credits: **one month of Ultra, $250** | hooked.so, mindstudio.ai, eesel.ai. Flow makes 2 videos per request by default, which doubles the cost; set it to 1. |
| **Seedance 2.5** | Dreamina / CapCut plans (third-party estimates of $15/$35/$70) | about $0.097/s on an annual Dreamina plan (Dreamina's own page); API about $0.21/s at 720p | **$126** (Dreamina); **$273** (API) | dreamina.capcut.com, atlascloud.ai |
| **Runway Gen-4.5** | Standard $15 (625 credits), Pro $35 (2,250); Unlimited replaced by "Max" in June 2026 | 12 credits/s (cut from 25 in June 2026) | 15,600 credits, about **$240** | flexprice.io, heygen.com, creatify.ai |
| **Luma Ray3.2** | Plus $30 (10k credits), Pro $90 (40k), Ultra $300 (150k) | about 300 credits per 10 s at 720p | about 39,000 credits: **one Pro month, $90**, at 720p | eesel.ai, hooked.so |
| **Hailuo 03** | from about $10-15/month | API $0.13/s at 2K | **$170** (API) | krater.ai (30 Oct 2026) |

### Images, voice, lip sync, music, finishing

| Need | Tool and price (checked 2026-11-02) | ≈ Cost |
|---|---|---|
| Reference sheets, plates, keyframes | **Nano Banana Pro** (Gemini 3 Pro Image): API about $0.13/image at 1-2K (another source says $0.09); also included in Google AI Pro/Ultra. **Midjourney** $10 / $30 / $60 / $120 per month (Pro is the cheapest plan with Stealth mode). **GPT Image 2** in ChatGPT Plus ($20/month; per-image price not verified). | **$20-80** |
| Voices | **ElevenLabs** Starter about $5-6 (30k credits; the cheapest plan with commercial rights), Creator $22 (about 100-121k credits) | **$6-22** |
| Chongqing-dialect voices (optional) | Human voice actors from Chongqing, hired through a freelance site. Not researched here; a rough guess. | **$100-300** (estimate) |
| Lip sync | Kling's lip sync (paid in credits), or sync.so (about $5/month + $0.05/s, single source). About 14 lines × 3 tries × 4 s is about 170 s. | **$10-25** |
| Music | **Suno** Pro $10/month (commercial rights; 20 downloads/month since 3 Sep 2026) or Premier $30. **ElevenLabs Music** is an alternative. | **$10-30** |
| Sound effects | ElevenLabs Sound Effects (inside the plan), Freesound (check each file's licence), the video model's own audio | **$0** |
| Editing | **DaVinci Resolve** (free); CapCut (free / Pro) | **$0** |
| Upscaling (only if you generate below 1080p) | **Topaz Video** (subscription only since Sep 2025; quoted at $25-67/month) or Resolve Studio's Super Scale ($295 one-off) | **$0-67** |

### Total estimate for the intro

| Path | What's in it | ≈ Total |
|---|---|---|
| **Recommended** | Shoot-out ($40) + Kling 4.0 for a month or two ($200-620) + Veo Quality for 6 hero shots via the API (6 × 4 × 8 s × $0.40, about $77) + images ($40) + ElevenLabs Creator ($22) + lip sync ($20) + Suno Pro ($10) + Resolve (free) | **about $410-830; plan on about $550** |
| Photoreal on Veo | Google AI Ultra for one month ($250, covers Veo Quality and Nano Banana Pro) + ElevenLabs ($22) + lip sync ($20) + Suno ($10) | **about $300-350** (more if you need a second month) |
| Cheaper | Kling 3.0 at 1080p without native audio, or Seedance 2.5 on Dreamina (about $110-180) + Gemini / Midjourney Basic ($10-20) + ElevenLabs Starter ($6) + Suno Pro ($10) + Resolve (free) | **about $140-220** |

Add about $100-300 if you hire Chongqing-dialect voice actors. Expect **roughly 40-80 hours of work** (my
estimate, not measured), most of it reviewing takes.

---

## 3. Workflow, step by step

### Step 1. Turn INTRO.md into a shot sheet

The shot sheet is already exported: [`shots.csv`](shots.csv) in this folder, one row per shot (made from
INTRO.md; open it in a spreadsheet). Its columns:

`shot_id, scene, duration_s, gen_length_s, tool, camera, action, light, prompt, negative, refs (character / location / props), lines (zh | en), on_camera_speech (y/n), keyframe_file, endframe_file, take_count, chosen_take, status`

Rules for the sheet:
- **gen_length_s:** generate the shot length plus about 1 s of handle at each end, for trims and cuts.
- **Split montage shots:** S01-03 ("three quick 3 s cuts") is three generations.
- **Chain the continuous shots:** S04-04 to S04-07 (the crane), S05-01 to S05-08 (the flight) and S06-01 to
  S06-07 (the hideout) run on from each other. Plan them so the last frame of one shot can be the first frame of
  the next.
- **Mark text shots:** these need text added in the edit (step 9): S01-04 (the LED board 司命 · 为您服务),
  S04-02 (the caller ID 老汉), S05-06 (Haozi's chalk mouse), S06-01a (the chalked rule 关好 · 盖好 · 别留痕迹),
  S06-05 (Anna's terminal text), and S00-04 (the title).

Keep a folder tree:

```
intro/
  refs/look/           style frames
  refs/characters/LI_WEI/  front.png 3q.png side.png back.png faces.png ...
  refs/locations/FLAT/ ...
  refs/props/          badge, red backpack with panda charm, laptop, hard hat, crane drawing
  keyframes/S03-02_start.png  S03-02_end.png
  takes/S03-02_t1_kling.mp4 ...
  audio/vo/  audio/music/  audio/sfx/
  edit/   (Resolve project)
  export/ (final mp4s)
```

### Step 2. Lock the look with 3-5 style frames

Before any character work, make the frames that define the film, in your image model (Nano Banana Pro or
Midjourney). Give it look-01.jpg and one or two place photos as references, with the style suffix from
INTRO.md. For example:

> Stylised 3D Chinese animation still, donghua cinematic CG, painterly textures, soft cel shading with fine ink
> outlines. Chongqing old residential towers stacked up a hillside, grey wet stained concrete, balconies, AC
> units, laundry, fig roots and cables, dense fog swallowing the distance, cold grey and blue-green palette,
> one calm cyan street light (#9FE8FF), low sun through fog, film grain, 16:9, 2K.

Pick one daytime and one night frame as the **master style references**. Attach them to every keyframe
generation from here on. This does more for consistency than any seed.

> **Licence note on the reference photos.** The photos in `docs/reference/places/` are Wikimedia Commons
> images under CC BY and CC BY-SA. Use them as visual guidance, or as one reference among several, not as the
> image you restyle directly. An image restyled straight from a CC BY-SA photo could count as a derivative work
> that carries the share-alike licence. look-01.jpg's source and licence aren't recorded in PLACES.md, so check
> it before using it as a direct input.

### Step 3. Character reference sheets

Make one sheet per character, and per age where the age changes: Li Wei at 17 and at 10, the father at 46
(glasses, grey hair, badge) and at 39 (no grey, no glasses), and Xiaoyu at 11 and as a toddler. Paste the
character's sheet text from INTRO.md word for word.

Prompt pattern (Nano Banana Pro or GPT Image 2 handle multi-panel sheets best; in Midjourney use `--cref`
or omni-reference, and a fixed `--seed`):

> Character turnaround reference sheet, stylised 3D Chinese donghua CG, soft cel shading with fine ink outlines,
> painterly texture, realistic proportions. Plain mid-grey background, even studio light. Full body front,
> three-quarter, side and back views, plus a row of 4 head close-ups (neutral, tired, frightened, determined).
> Subject: Li Wei, 17-year-old Chinese boy, lean, 172 cm, messy short black hair, tired dark eyes, a small scar
> through the left eyebrow, faded orange hi-vis vest over a charcoal hoodie, dark navy work trousers, worn white
> sneakers grey with dust, navy backpack, yellow hard hat. Same face and outfit in every panel, no text.

Then:
1. **Generate 8-20 candidates and choose one face.** Re-run until the sheet is clean: the scar on the left in
   every view, the vest's reflective strips the same.
2. **Cut the sheet into single images** (front, 3/4, side, back, face close-up), because video tools accept
   single images best. Upscale them to about 2K.
3. **Register each character in the video tool.** In Kling, create an **Element** for each character, machine
   and key prop from 3-4 of these images. In Veo/Flow, save them as **Ingredients**. In Runway, use
   **References** with @tags. In Seedance, attach them as reference images every time.
4. **Make prop and machine sheets the same way:** the father's badge on its red lanyard, the red backpack
   with the panda charm, Anna's laptop, the drone, the quadruped, the humanoid, and the Siming ring mark (a thin
   cyan ring cut by one horizontal line; draw it as flat vector art yourself so it never varies).
5. **Write down what worked:** the exact prompt, the seed (Midjourney / Flux), the model version and the files
   used, in the shot sheet. A seed only repeats within the same model and version. The reference images are
   what really carry a character across tools.

### Step 4. Location plates

Make empty, establishing-quality plates from the master style frames plus each location's reference photos:
- the Li family flat: kitchen, table and TV, balcony, front door
- the Shibati stairs, day and night
- the crane site by the Line 2 beam
- Jiefangbei
- the wall and the Dongshuimen Bridge
- the Jiaochangkou concourse under green emergency light
- the Grand Tunnel
- the vent chamber, with the ladder and the grate from below
- the alley above the grate: rubbish bags, neon in pink and cyan

Make day/dusk/night variants where the script needs them. The flat and the grate each appear 4-5 times, so lock
them early. S00-03 must match S06-02.

### Step 5. Keyframes (the most important step)

For each shot, compose a **start frame** at 16:9 and at least 1920×1080, by combining character images, the
location plate and the style frame in Nano Banana Pro (it takes up to 14 references) or GPT Image 2.

Add an **end frame** where the action must land exactly:
- S04-09: the window flashes and the backpack falls
- S05-04: the cleaning robot's eye switches on
- S06-01a: the bolts drawn
- S03-02: the father's tap on the chest
- S04-01: every screen red

Check each keyframe against its sheet before animating: the face, the scar's side, the vest, the hard hat
(he has it until S04-07, not after), the father's glasses (from S01-05 on). Fixing an image costs pennies;
fixing a video costs dollars.

### Step 6. Animate

Choose these settings in the generator:
- **Format:** 1080p, 16:9, 24 fps where it can be chosen.
- **Length:** the gen_length_s from your sheet.
- **Inputs:** the start frame, the end frame where you made one, and the character Elements/Ingredients. Even
  when the keyframe already shows the character, attach the references; it stops the face drifting during
  motion.
- **Negative prompt:** the default from INTRO.md, plus the shot's own. Veo through the API takes a
  `negativePrompt`; Flow has no field for it, so write "no text, no logos" into the prompt instead.

Make **2-4 takes** per shot and judge each one at full screen. Check:
- the hands
- whether the face holds through motion
- garbled text anywhere in frame
- the robots' faces (the machines must never show one)
- that no violence lands on a body

Log the take numbers in the sheet.

**Continuity tricks**
- **Chained shots:** export the last frame of the chosen take (`ffmpeg -sseof -0.05 -i take.mp4 -frames:v 1
  last.png`), touch it up if needed, and use it as the next shot's start frame.
- **Same phrasing for the same light:** reuse one fixed phrase for each lighting state, e.g. "warm tungsten
  kitchen light, TV blue on faces" for S01-01, S01-05 and S03-01.
- **Kling multi-shot:** for intercut moments (S04-02's ladder and control room), Kling's multi-shot mode can
  make both angles in one generation with matching light. Otherwise make two shots and cut them yourself.
- **Long shots:** for the 8-9 s shots on Veo (4/6/8 s clips), generate 8 s and use Extend, or plan the shot as
  two cuts.

**Prompt structure** (for image-to-video, describe the motion and camera; the image already shows the
content):

```
[Shot size + lens + camera move] [subject (sheet text) + what they do, beat by beat, with timing]
[setting] [light + palette] [sound / line, only if generating native audio] + style suffix
```

Camera words these models understand: *extreme wide, wide, medium, close-up, extreme close-up, over-the-
shoulder, POV, low angle, top-down; locked-off / static, slow push-in, pull-back, pan left, tilt up, handheld,
tracking shot following, crane up, rack focus; 24 mm / 35 mm / 50 mm / 85 mm / 135 mm; shallow depth of field.*
Light words: *volumetric fog, hard white searchlight cone, rim light, neon spill, practical light, motivated
light, low sun through fog, sodium vapour, screen glow on face.* State one camera move per shot; two moves in
8 s tends to warp the frame.

### Example prompts for shots from INTRO.md

Replace nothing here: the tokens are already expanded. Add the default negative from INTRO.md.

**S00-03 Feet over the grate (6 s, no dialogue in the image; the speaker's line is added in post)**

*Keyframe (image model; references: the grate/alley plate, the humanoid sheet, the night style frame):*
> Stylised 3D Chinese donghua CG, worm's-eye view from deep underground looking straight up through a rusted
> square iron grate, black plastic rubbish bags heaped over most of it, through the gaps a narrow alley at night
> between two old concrete blocks, pink and cyan neon signs on the alley walls bleeding into drifting fog, the
> graphite-plated feet of a tall slender faceless robot mid-stride beside the grate, black below, painterly
> textures, soft cel shading with fine ink outlines, wet surfaces, film grain, 16:9.

*Motion (video model, start frame = the keyframe):*
> Static camera, 24 mm, looking straight up. Through the gaps between the rubbish bags, two graphite robot feet
> step past the grate with slow, heavy, measured strides from left to right, never hurrying. A soft cyan light
> slides across the bars and away. Pink and cyan neon flickers in the fog above. Water drops gather on the bars
> and fall toward the lens. Sound: heavy footsteps on steel, a faint servo whine, a calm female Mandarin
> announcement echoing far off. 3D Chinese animation, donghua cinematic CG, painterly textures, soft cel shading
> with fine outlines, volumetric fog, wet surfaces, film grain, 24fps, 16:9, Chongqing.
> Negative: visible robot face, text, watermark, camera movement.

**S03-02 The father's word (5 s, line on camera: lip sync)**

*Keyframe (references: the father sheet at 46, Li Wei at 17, the flat's front door plate, the badge prop):*
> Stylised 3D Chinese donghua CG, 50 mm close two-shot at an apartment door in an old brick walk-up, warm
> morning kitchen light behind them, the open door showing a grey concrete stairwell. Li Guorong, 46, stocky
> Chinese electrician, close-cropped greying hair, deep smile lines, wire-rimmed glasses, navy work uniform
> with a reflective strip, substation badge on a red lanyard, faces his son Li Wei, 17, lean, messy short black
> hair, scar through the left eyebrow, faded orange hi-vis vest over a charcoal hoodie. Painterly textures, soft
> cel shading with fine ink outlines, film grain, 16:9.

*Motion:*
> 50 mm, locked off, very slight handheld drift. The father taps his own badge with two fingers, then taps his
> son's chest twice with the same two fingers, and holds his son's eyes a moment too long, serious and tender.
> The son looks back without speaking. The father says quietly in Sichuan-accented Mandarin: "有啥子事，先顾到你自己。"
> Stairwell echo. [style suffix]

If the tool's native Mandarin is poor, drop the line from the prompt, generate silent motion with the mouth
"speaking quietly", and lip sync the recorded line afterwards (step 7).

**S04-06 Holding his breath (7 s, no dialogue)**

*Motion (start frame: Li Wei pressed against the crane mast at dusk, hard hat on):*
> Tight 50 mm on a terrified teenage boy in a yellow hard hat and orange hi-vis vest, pressed flat against the
> steel lattice of a tower crane mast at dusk, foggy city far below. A matte graphite quad-rotor drone the size
> of a car door rises slowly past the mast behind him; its single hard white searchlight sweeps across the
> lattice and passes just over his hard hat, lighting it for a moment. He holds his breath, eyes shut, knuckles
> white on the steel. The drone drifts on and the light leaves him. Slow, quiet, tense; rotor hiss, wind on
> steel. [style suffix]
> Negative: drone with a face, the boy falling, fast motion, text.

**S06-05 Anna (6 s; the terminal text is added in post)**

*Motion (start frame: the laptop on a crate in the rock chamber, screen dark):*
> 50 mm, locked off, slow push-in. A scuffed laptop sitting on a wooden crate in a dark, damp rock chamber wakes
> by itself: its fan spins up, the screen lights amber on near-black, box-drawn panels appear and a single cursor
> blinks. Amber glow spills across the crate and the rough rock wall. No faces, no avatar. Sound: fan spin-up,
> one soft key tone. [style suffix]
> Negative: readable text, faces, avatars, logos.

Generate the screen glowing with plain panels, then put Anna's real text (安娜 Anna · 本地模型 · 离线, in amber
monospace) on the screen in the edit, tracked to the laptop (step 9). Generated lettering will be garbled.

### Step 7. Voices and lip sync

- **Who speaks what:**
  - City speakers, the news anchor and Anna speak **standard Mandarin**.
  - Li Wei, the father, Granny Wang, the foreman and the co-worker speak **Chongqing dialect** (啥子, 莫, 要得,
    老汉).
- **Options, best first:**
  1. **Human voice actors from Chongqing** for the dialect roles. This gives the most authentic result, and
     for about 30 short lines it's affordable.
  2. **ElevenLabs** (v3 / Multilingual) for the standard-Mandarin voices: the city speaker (calm, female,
     patient), the anchor, the lab director and Anna. Use Voice Design to make each voice once and reuse it.
     ElevenLabs reads the dialect words in Mandarin pronunciation, so the dialect is lost.
  3. **Dialect TTS** (Qwen3-TTS, or Sichuan voices on Fish Audio / SpeechGen) for the dialect roles if you
     don't hire actors. Quality is unverified; test it.
  4. **The video model's native audio** (Kling or Veo, with the line in the prompt). This is the fastest, and
     Kling's Mandarin is the stronger of the two. Use it for scratch tracks, and keep it only if it sounds right.
- **Record or generate every line as a separate file**, named by line (S04-03_father.wav), at 48 kHz. Make the
  phone lines in S04-02 and S04-03 sound like a phone in the edit with an EQ band-pass.
- **Lip sync only the lines spoken on camera** (about 14). Use Kling's lip sync, or sync.so (lipsync-2-pro) /
  HeyGen, on the chosen take. Close-ups show errors most, so lip sync close-ups and two-shots first. Wide
  shots can often stay as they are.

### Step 8. Music and sound

- **Score:** low strings and an erhu line, only in the family scenes and at the end. The erhu note in S00-04
  is cut off. Options:
  - **Suno** Pro/Premier: prompt with "slow, sparse cinematic score, low cello and double bass drones, a lone
    erhu melody, melancholy, no drums, no vocals". Generate stems or several variations.
  - **ElevenLabs Music:** trained on licensed music, which makes the rights cleaner.
  - A human composer, for the best result.

  Cut the music in the editor so it changes on the shot changes.
- **Sound effects:** build them in layers. Real ambience first (stairs, rain, mahjong tiles, the monorail hum;
  Freesound, checking each file's licence, or ElevenLabs Sound Effects), then the machines: servo whine and soft
  rotor hiss, the same samples every time so the machines sound consistent. The video model's native audio can
  serve as a base layer, but replace any speech in it that you didn't write.
- **Silence is a cue in the script:** S01-06 cuts to total silence, and the violence is heard but never shown.

### Step 9. Edit and assemble (DaVinci Resolve, free)

1. **New project:** timeline 1920×1080, 24 fps, Rec.709. Import the chosen takes and lay them in INTRO.md's
   order using the shot sheet.
2. **Trim to the INTRO.md durations,** using the handles. Make cuts on motion. For the violence, cut on the
   flash or the sound, as the style bible asks.
3. **Colour-grade the whole film as one piece:** this is how clips from different takes and tools come to look
   like one film.
   - Make one base node tree: contrast, the same black level, the same grain.
   - Make two looks: **warm before the takeover** (scene 1 and S03-01 to S03-02) and **cold grey/blue-green
     after**, with the cyan kept at #9FE8FF. Alarm red appears only on the night of the attack.
   - Use shot matching (Color > Shot Match) against your master style frame.
4. **Add text the generator can't write,** using Fusion / Text+ with a planar or point tracker:
   - the LED board in S01-04
   - the caller ID 老汉 on the phone in S04-02
   - the chalked rule in S06-01a
   - Anna's terminal in S06-05
   - Haozi's chalk mouse in S05-06, if the generator didn't draw it cleanly
   - the title card in S00-04, in the game's UI font

   **Don't burn in subtitles:** the game shows the zh/en subtitles itself (M8-05).
5. **Mix the sound:** dialogue around -12 dBFS peaks, music under it, ambience always present. Aim for about
   -16 LUFS integrated for the whole intro, a common target for web playback.
6. **Render a master:** ProRes 422 HQ or DNxHR HQ, 1080p24, with a timeline marker at the start of every shot.
   Note each shot's start and end time in the shot sheet.

CapCut works for a quicker edit, but Resolve gives you colour matching, tracking and a proper mix for free.

### Step 10. Upscaling (only if needed)

Generate at 1080p and you won't need it. If a tool only gave you 720p (Seedance 2.5 or Luma at the cheap rate),
upscale those clips to 1080p with Topaz Video (Proteus for clean CG; Starlight for heavy restoration) or
Resolve Studio's Super Scale, **before** grading. Don't interpolate frames to 60 fps. Keep 24 fps, which is
part of the film look.

### Step 11. Export for the game

INTRO.md asks for one file per shot: `public/cinematics/intro/<shot id>.mp4` (e.g. `S03-02.mp4`). The game
plays them in order and shows the subtitles. Its playback code (M8-05) isn't built yet, so tell Claude Code
which you're delivering (see the note after the commands).

**Format:** MP4, H.264 High profile, 1920×1080, 24 fps constant, yuv420p, AAC 48 kHz stereo at 160 kbps,
`+faststart`.
**Size target:** about 3 Mbps of video on average, so **about 2-3 MB per shot and about 130-150 MB for the whole
intro.** At 720p the intro would be about 80-90 MB, if you want a lighter build. Film grain costs a lot of
bitrate; if files come out large, use less grain or denoise slightly before encoding.

Encode each shot straight from the master, so every file starts on a clean keyframe:

```bash
# cuts.csv lines: id,start,end   (times in seconds from the master's start, e.g. S03-02,141.0,146.0)
mkdir -p export
while IFS=, read -r id start end; do
  ffmpeg -nostdin -y -ss "$start" -to "$end" -i master.mov \
    -c:v libx264 -preset slow -crf 21 -maxrate 4M -bufsize 8M \
    -profile:v high -level 4.1 -pix_fmt yuv420p -r 24 -g 48 \
    -c:a aac -b:a 160k -ar 48000 -ac 2 \
    -movflags +faststart "export/${id}.mp4"
done < cuts.csv
du -ch export/*.mp4 | tail -1     # check the total against the target
```

Also make one full file for the trailer and for review:

```bash
ffmpeg -i master.mov -c:v libx264 -preset slow -crf 20 -maxrate 6M -bufsize 12M -profile:v high \
  -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart intro_full.mp4
```

**A note to pass to Claude Code:** separate clips played back to back can leave a short gap or click at each
cut, especially where music runs across the cut. A single `intro_full.mp4` with a list of shot start times
plays seamlessly and still lets the game show subtitles per shot. When you hand over the files, say which you
want, so the player in M8-05 is built for it.

The total is about 150 MB of video. GitHub accepts files under 100 MB each, so per-shot files fit, but the repo
grows by that much with every re-export. Consider Git LFS, or hosting the clips outside the repo.

---

## 4. Licensing, commercial use and pitfalls

### Commercial use, tool by tool (checked 2026-11-02; read each tool's live terms before you ship)

| Tool | Commercial use | Watermark | Notes |
|---|---|---|---|
| **Kling** | Paid plans: commercial use allowed (paid-member terms effective 10 Oct 2026, per one source). Free plan: personal use only. | Visible on free; removed on paid | Kling's general terms (21 Apr 2026) reportedly ban commercial use without permission, and the paid terms grant it. **Make every clip you'll ship on a paid account**; upgrading may not license clips made earlier on a free account. |
| **Veo 3.1 / Flow / Gemini API** | Google's generative AI terms don't claim ownership of outputs; paid API use is the clearest commercial route. The exact consumer-plan wording wasn't verified. | **Visible Veo mark on everything except AI Ultra users generating in Flow**; invisible SynthID on every video | Through the API, check the current watermark rules. |
| **Seedance (Dreamina / CapCut)** | **Not verified.** Check Dreamina's and CapCut's terms. | Varies by plan | ByteDance's platforms restrict uploading real people's faces. |
| **Runway** | Paid plans: commercial use allowed, and you own the outputs (Runway's long-standing terms; not re-checked this session) | Free plan only | |
| **Luma** | Paid plans: commercial; free: none | Free plan watermarked | |
| **Hailuo / Vidu** | Generally paid plans only **(unverified)** | Free plans watermarked | |
| **Midjourney** | Paid plans include commercial use. Companies with over $1M a year in gross revenue need Pro or Mega **(from Midjourney's terms as I know them; recheck)**. | none | Without Stealth (Pro and up), your images are public on Midjourney's site, which would show the characters before launch. |
| **Nano Banana / Gemini images** | Under Google's generative AI terms | SynthID; a visible mark on some free outputs | |
| **ElevenLabs** | Starter and up: commercial. Free: none, and needs attribution. | none | Don't clone a real person's voice without their written consent. |
| **Suno** | Pro/Premier: commercial use for songs made while subscribed. Free: non-commercial, and upgrading later doesn't license old songs. | none | Download caps since 3 Sep 2026 (20/month on Pro, 60 on Premier); keep the files you'll use. |
| **Topaz / Resolve / CapCut** | Tools only; no claim on your footage. Check CapCut's template and music licences if you use its built-in assets. | | |

**Copyright in AI footage.** In the US, purely AI-generated material generally can't be copyrighted (US
Copyright Office guidance); your selection, arrangement, edit, writing and added human work can. That doesn't
stop you using the footage, but someone could reuse raw clips. Keep project files that show the human work.
Many storefronts (Steam, for one) ask you to disclose AI-generated content, so keep a list of the tools used
per shot.

### Pitfalls and how to avoid them

1. **Content filters (the biggest risk for this script).**
   - **Chinese tools** (Kling, Seedance, Hailuo, Vidu) apply PRC content rules. The State Council (国务院),
     a Chinese state takeover, soldiers, flags and government buildings can be refused or quietly altered.
     S01-06 and S02-01 to S02-08 are the risky shots. Write generic prompts ("a TV news announcement", "prefab
     concrete barrier walls with turrets") and put the political words only in the audio you add yourself. If
     a shot keeps being refused, make it on Veo or Runway.
   - **Veo / Google** is strict about **minors in danger**: Li Wei at 17, Xiaoyu at 11, and the children in
     scene 1. Describe him as "a young man in his late teens", keep the children out of the danger shots (the
     script already only shows Xiaoyu's backpack in S04-09), and never show harm. The script's rule of never
     showing violence on a body (cut on the flash) also keeps you inside every tool's filter.
2. **Text in frame comes out garbled.** Every model mangles Chinese characters. Prompt for "no text", generate
   blank screens, signs and chalk, and add the real text in the edit (step 9). Ask for "illegible shop signs"
   in street shots, or the model writes fake English. INTRO.md's negative prompt already bans English signage.
3. **Hands and small actions:** the father's two-finger tap, Li Wei answering a phone one-handed on a ladder,
   tying boots. Put the action into the keyframe, keep the hands large in frame or out of it, and generate more
   takes for these shots.
4. **Faces drifting in motion and turns.** Always attach the character references, not only the keyframe.
   Prefer 5-8 s shots to 15-30 s ones; consistency drops over long takes. Fix the remaining drift with a final
   pass: re-generate from a corrected frame.
5. **Wardrobe and continuity:** the hard hat leaves in S04-07; the father's glasses appear from S01-05;
   Xiaoyu's backpack has its panda charm; the vest is the only warm colour after the takeover. Check each take
   against a continuity list in the shot sheet.
6. **Machines that show a face.** Models love to give robots eyes and mouths. Write "smooth faceless head with
   one horizontal cyan light" every time, and keep "face, eyes, mouth" in the negative for the machine shots.
7. **Clip length limits:** Veo 4/6/8 s (extend for longer), Kling 3.0 up to 15 s, Kling 4.0 and Seedance 2.5 up
   to 30 s. Every shot in INTRO.md is 4-9 s, so this rarely matters. Generate a little long and trim.
8. **Motion artefacts:** warping on fast camera moves, rubbery legs on the quadruped, rotor blades that blur
   wrongly, water running backwards. Use one camera move per shot, slower moves, and "physically accurate
   motion"; if the stair chase (S05-01) won't come out clean, cut it as two shorter shots.
9. **Style drift between tools and takes:** one take looks photoreal, the next flat anime. Keep the style
   suffix word for word and attach the master style frame, and let the grade (step 9) do the rest. Mixing tools
   is fine if the grade is shared.
10. **Credits burned on bad takes:** do the cheap tests (draft mode, Fast or Lite tier, 720p) to check motion,
    then regenerate the take you want at full quality. On Flow, set the outputs per request to 1.
11. **Plan details change monthly.** Credits expire monthly on Kling and on Runway's Standard/Pro (they don't
    roll over), so buy one big month for the production push rather than several small ones.

---

## Sources (searched 2026-11-02)

Pricing and features (mostly third-party; vendor sites could not be opened from this sandbox):
- Overviews: [Higgsfield](https://higgsfield.ai/blog/best-ai-video-generators-2026), [fal.ai](https://fal.ai/learn/tools/ai-video-generators), [pinggy.io](https://pinggy.io/blog/best_video_generation_ai_models/), [kombitz Oct 2026 roundup](https://www.kombitz.com/2026/10/24/ai-image-video-model-news-roundup-october-24-2026/), [Vidu press release 27 Oct 2026](https://www.globenewswire.com/news-release/2026/10/27/3389469/0/en/vidu-powers-china-s-first-ai-feature-length-film-demonstrating-its-full-cinematic-potential.html)
- Sora's shutdown: [zilliz](https://zilliz.com/ai-faq/what-is-the-sora-shutdown-timeline), [Neowin](https://www.neowin.net/amp/openai-to-shut-down-sora-app-and-apis-as-it-shifts-focus-to-coding-ai/), [CBS News](https://www.cbsnews.com/amp/news/sora-ai-openai-discontinues), [pasqualepillitteri.it](https://pasqualepillitteri.it/en/news/18764/openai-sora2-api-dismessa-en)
- Veo: [The Decoder (Veo 3.1 Lite and Fast price cut)](https://the-decoder.com/googles-veo-3-1-lite-cuts-video-generation-costs-by-more-than-half/), [benchlm.ai](https://benchlm.ai/media-pricing/veo), [layer3labs (Sep 2026)](https://www.layer3labs.io/guides/veo-3-pricing), [hooked.so Flow credits](https://www.hooked.so/compare/veo-3-pricing), [mindstudio Flow tiers](https://www.mindstudio.ai/blog/google-flow-pricing-credits-tiers-explained), [Google blog: Veo 3.1 in Flow](https://blog.google/technology/ai/veo-updates-flow/), [Google blog: watermarks](https://blog.google/products-and-platforms/products/gemini/veo-3-expansion-mobile/), [Flow FAQ](https://labs.google/fx/sv/tools/flow/faq)
- Gemini Omni: [Zapier](https://zapier.com/blog/gemini-omni/), [mindstudio](https://www.mindstudio.ai/blog/what-is-google-gemini-omni-multimodal-video-model)
- Kling: [Kling 3.0 credit guide (kling.ai)](https://kling.ai/blog/kling-video-3-0-credit-cost-guide), [aiarty](https://www.aiarty.com/ai-video-generator/kling-ai-pricing.htm), [wireflow Kling 4.0 pricing](https://www.wireflow.ai/blog/kling-4-0-pricing), [flick.art](https://flick.art/blog/kling-4-guide), [kie.ai](https://kie.ai/blog/kling-4-0-release-analysis-30-second-clips-keyframes-pricing), [imaginetovideo](https://imaginetovideo.com/blog/kling-4-0-now-live-specs-pricing-how-to-use), [gaga.art Kling 3.0](https://gaga.art/blog/kling-3-0/), [novoads (terms)](https://novoads.ai/en/blog/is-kling-ai-free), [flexprice](https://flexprice.io/pricing-index/kling-ai)
- Seedance: [Dreamina 2.5 pricing](https://dreamina.capcut.com/seedance/seedance-2-5-pricing-2026), [Atlas Cloud](https://www.atlascloud.ai/blog/guides/seedance-2.5-pricing-guide), [fal 2.5 vs 2.0](https://fal.ai/learn/devs/seedance-2-5-vs-seedance-2-0), [Scenario](https://www.scenario.com/blog/seedance-2-5-4k-ai-video-generator-scenario)
- Runway: [flexprice](https://flexprice.io/pricing-index/runway), [HeyGen](https://www.heygen.com/blog/runway-pricing), [creatify](https://creatify.ai/blog/runway-pricing-(2026)-plans-credits-and-what-you-ll-actually-pay)
- Luma: [eesel](https://eesel.ai/blog/luma-ai-pricing), [hooked.so](https://www.hooked.so/compare/luma-ai-pricing)
- Hailuo: [krater.ai](https://krater.ai/pricing/hailuo)
- Anime / donghua fit: [Vidu comparison (vendor)](https://www.vidu.com/vidu-q3-vs-seedance-2-0-vs-kling-3-0), [Vondy test](https://vondy.com/learn/best-ai-video-generator), [OpenArt](https://openart.ai/es-es/blog/best-ai-video-generators-for-anime/)
- Images: [rangy (MJ vs Nano Banana Pro)](https://rangy.ai/blog/midjourney-vs-nano-banana-pro), [tech-insider](https://tech-insider.org/fr/nano-banana-pro-vs-gpt-image-2-vs-midjourney-2026/), [eesel Midjourney pricing](https://www.eesel.ai/en/blog/midjourney-pricing), [fluxnote Midjourney](https://fluxnote.io/guides/midjourney-pricing-2026)
- Voice and lip sync: [smallest.ai ElevenLabs pricing](https://smallest.ai/blog/elevenlabs-pricing-plans-cost-what-you-get-in-2026), [bigvu](https://bigvu.tv/blog/elevenlabs-pricing-2026-plans-credits-commercial-rights-api-costs/), [dupple lip sync](https://dupple.com/learn/best-ai-lip-sync-tools), [SpeechGen Sichuan](https://speechgen.io/en/tts-chinese-southwestern-mandarin), [Qwen3-TTS](https://www.promptzone.com/prompt2tool/qwen3-tts-high-speed-dialect-rich-text-to-speech-2j53.md)
- Music: [diyai Suno pricing](https://diyai.io/ai-tools/audio-generation/suno-pricing/), [dynamoi Suno rights](https://dynamoi.com/learn/ai-music-distribution/suno-commercial-rights-explained), [usagepricing Suno download caps](https://www.usagepricing.com/blueprint/activity/suno-2026-09-03-commercial-use-download-cap)
- Upscaling: [myarchitectai Topaz pricing](https://www.myarchitectai.com/blog/topaz-ai-pricing), [okmiku Starlight 2.5](https://okmiku.com/blog/topaz-labs-starlight-2-5-upscale)
