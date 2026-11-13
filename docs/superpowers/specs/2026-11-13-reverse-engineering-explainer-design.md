# How mods work: a 3D explainer (design)

Date: 2026-11-13. Status: revised after the builder check, for owner approval.

Decisions marked **(owner)** were made by the owner. **(my call)** marks a default set during brainstorming or the builder check, which the owner can still overturn. Everything else is left to the builder (§11).

## 1. Intent

A short, vertical 3D film that explains how reverse engineering and game mods work, through a technical lens **(owner)**:

- how a CPU steps through machine code
- how pointers and the heap work
- how code is read back (disassembly, decompilation, stripping)
- the difference between a **patch** and a **hook**
- how mods find code again with wildcard patterns

It is an ethical, educational piece that explains concepts. It is **not** a tutorial on making mods. **(owner)**

**Audience:** developers and CS students who code but have never read assembly **(owner)**. They see real x86-64 bytes and instruction names, each explained on screen as it appears. Success means a viewer can afterwards explain:

- how a CPU steps through instructions
- what a pointer and the heap are
- what an offset is: a distance from a base, like on a ruler **(owner)**
- what disassembly and decompilation recover, and what stripping takes away
- why offsets can be dumped automatically when an engine keeps metadata (Unity), but must be inferred by hand in stripped custom C++ **(owner)**
- patch vs hook
- prologue and epilogue
- why hard-coded offsets break after game updates while wildcard patterns usually survive **(owner)**

## 2. Goals, non-goals, anti-goals

**Goals**

- 9:16 at 1080×1920, at most 3 minutes. **(owner)**
- Dark-ish, modern, neon glows, with occasional camera repositions and rotations. **(owner)**
- Every 3D object is a physical body. Nothing passes through anything, and motion follows real-world physics, proven by automated collision and physics tests across the whole film. **(owner)** The only exception is the declared hover of tools (§6).
- Cameras can be mocked and tested throughout. **(owner)**
- Real lights and shadows interacting with objects and textures. No black cartoon outlines; it is not a cartoon. **(owner)**
- Framerate independence: timing is authored in seconds, and FPS only samples it (a "film clock"). **(owner)**
- A CONTINUITY document and an AGENTS/CLAUDE.md, both enforced. **(owner)**

**Non-goals (for now)**

- Voice-over. The production order is picture first, then SFX, then voice last; voice specifics are decided later. **(owner)**
- Captions (they may come with the voice).
- A German edition. English now, German later if needed. **(owner)**

**Anti-goals** (failure even if it technically works)

- Anything usable as a how-to: no real game, no real game's addresses or signatures, no tool walkthroughs, no step lists. The game is a fictional `game.exe`.
- Wrong bytes, addresses or mnemonics.
- Visible clipping, teleporting, or motion that contradicts physics.
- Two renders, or two frame rates, disagreeing.
- A cartoon look.
- Showing or shipping Dobby or shadowhook code (§9).

## 3. Constraints

- **Stack (already scaffolded):**
  - Remotion 4.0.543
  - `@remotion/three` with `@react-three/fiber` 9.2.0 and `three` 0.178.0
  - `@remotion/media` and `@remotion/sfx`
  - TypeScript
- **No state across frames.** Remotion renders frames in parallel browser tabs and allows random access to any frame. So:
  - Everything shown at time *t* is a pure function of *t* plus fixed, deterministic data.
  - R3F's `useFrame()` is forbidden.
  - No `Math.random`, `Date` or `performance.now` in world code; all randomness is seeded.
- **Film clock** (already in `src/config.ts`):
  - Timings are written as `seconds * fps`.
  - The render rate changes only via `--props '{"fps":N}'`, for any N.
  - Never use the CLI `--fps` flag: it keeps the frame count, so it changes the duration.
- **Length:** 3:00 is a ceiling. **(my call: the owner said "up to 3 minutes".)**
  - The picture-first cut targets about **165 s**.
  - That leaves about 15 s for voice holds and the optional teaser.
- **Layout** (Remotion video-layout rules, at 1080 px width):
  - Key text stays at least 80 px from the sides and 100 px from the top and bottom.
  - Headlines are at least 84 px; important supporting text at least 44 px.
  - The bottom band stays free for future captions. **(my call)**
- **Headless Three.js renders use `--gl=angle`** (already set in `remotion.config.ts`).
- **Resolution independence (owner, 2026-11-13, as in the owner's previous film).** The film is authored once, at 1080×1920.
  - 4K (2160×3840) and 8K (4320×7680) are the same compositions rendered with Remotion's output scaling, `--scale=2` and `--scale=4` (or Studio's render scale). Nothing is authored in output pixels.
  - The 3D canvas renders at the render's own pixel density, up to `FINEST_PIXEL_RATIO = 4`. R3F's default device-pixel-ratio range of [1, 2] would cap at 4K and enlarge the picture at 8K.
  - Anything measured in pixels (bloom spread, reflection blur, glow and line widths) is defined in 1080p pixels and multiplied by the render's pixel ratio. The picture therefore looks the same at every scale, only finer.
  - Textures read up close (the hex glyphs) are painted at a base density at 1080p, twice that at 4K and four times at 8K, so type stays crisp.
  - No buffer may exceed the GPU's largest texture size.
- **The process is iterative:** prototype, owner comments, refine. **(owner)**

## 4. Approaches considered (how motion is produced)

1. **Hand-written formulas only.** Every motion is an analytic function of time.
   - Exact at any fps, with full art control.
   - But the violent and dynamic moments each need hand-derived physics. A wrong formula looks plausible, and tests built on the same formulas cannot catch it.
2. **Tick grid plus blend** (the owner's previous film, `tibik-papiertonne`). Solve everything at 30 fps and blend the in-between frames.
   - Proven.
   - But 30 Hz is too coarse for impacts: a stamp at 3 m/s moves 10 cm per tick, so clipping between ticks goes unchecked. Blended frames of a tumbling piece can also intersect something even when both ticks are clean.
3. **Hybrid: authored motion plus a baked simulation. Chosen by the owner.**
   - **Authored:** things that move with intent are kinematic formulas of time. These are the cameras, the CPU sled, the hovering stencils and stamp, and pin flips.
   - **Simulated:** their consequences (name tags falling off, things settling) run in **Rapier's cross-platform deterministic build** (`@dimforge/rapier3d-deterministic-compat`, 0.21.0). It steps at a fixed **960 Hz**, once, in Node. This was raised from 240 Hz after measuring it during planning: a 44 mm drop sank 1.6 mm into the floor on impact at 240 Hz, but only 0.11 mm at 960 Hz with continuous collision detection.
   - **Baked:** the result is written to a file that the film samples at any fps, so every render tab sees identical motion.
   - **Costs accepted:**
     - a WebAssembly dependency and a bake step
     - dynamic outcomes are steered by initial conditions, not keyframes
     - an explicit contact tolerance, because the solver allows a small penetration

## 5. The film

Nine chapters, about 166 s in total (budgets rebalanced for the offset material: my call), in the owner's order plus the owner's added chapter 5. **Each chapter starts fresh from a declared state and is joined to the next by a cut (owner).** For example, the hook (ch 7) works on the original function, not the patched one, and the game update (ch 8) is a cut to a new build. Holds (§7.4) stretch chapters when the voice arrives.

| # | Chapter | ≈ s | What it shows |
|---|---|---|---|
| 1 | The CPU steps | 16 | The CPU sled rides the tape at `game.exe+12A30`. It fetches and decodes **variable-length** instructions: `48 83 EC 28` becomes `sub rsp, 28h`, shown as a light plate above the tiles, then the sled advances 4 bytes. Then it executes. |
| 2 | Pointers and offsets | 18 | **An offset is a distance from a base, counted in bytes, and a hovering ruler measures it (owner, §5.3).** The ruler measures a pointer slot from the module's start: `game.exe+…`, with the offset chosen by the builder. The slot holds 8 bytes stored **little-endian**. `0x000001F46A3C2E10` sits as `10 2E 3C 6A F4 01 00 00`. A light beam runs from the pointer to its target. |
| 3 | The heap | 18 | The player object is allocated at runtime; the region is marked in use with light, and the constructor's writes flip pins. The ruler, laid from the object's start, shows energy at `+0x10` as the float 100.0 (`00 00 C8 42`). Cut to a second run: **ASLR** moves both the module and the heap, so the player's address and the pointer's value change, but the pointer slot keeps its module offset. That is how a mod finds the player: follow the pointer from `game.exe+offset`. **(my call: accuracy fix from the builder check)** |
| 4 | The energy-drain function | 16 | Load, subtract, store, then refresh the HUD. The energy tiles' pins flip as it drains. **Prologue and epilogue are introduced here**, because the hook needs them. **(my call)** The toy character's energy bar drains (see open item 1). |
| 5 | Reading it back: names and offsets | 28 | **(owner)** **Disassembly**: light plates appear above the unchanged tiles, because reading never changes memory. It is nearly one-to-one. **Decompilation**: the plates merge into a light pseudocode line; this is lossy. **Stripping**: physical name tags peel off and fall (symbols are data too). Then what survives, what is lost and what is partly recoverable (§5.2). **Dumping offsets, easy vs hard (owner, §5.3)**: when an engine keeps metadata (Unity), the tags stay on and every offset can be read off automatically. In stripped custom C++ there are no tags, so an offset like `+0x10` is inferred by hand from the code that touches it, e.g. `[rcx+10h]`. |
| 6 | Patch | 12 | The four `subss` tiles' pins flip to `90 90 90 90`. It is quiet and precise, and energy stops dropping. |
| 7 | Hook | 23 | First, the trampoline tiles' pins flip to copy the 9 stolen bytes, and the detour's code is written the same way. Then the hovering stamp **slams** `E9`+rel32 into the prologue, **driving the old pins hard into the new pattern**. **(owner: a violent clobber, not a gentle lift-and-replace)** The 4 orphaned bytes after it stay intact. The sled now jumps to the detour, runs the trampoline, and returns. |
| 8 | Finding it again | 25 | Cut to the updated build. **Offsets break (owner):** the function's offset has changed, and the struct gained a field. The old ruler reading `+0x10` now lands on the wrong field, and stripping (ch 5) left no name to look up. The **hovering stencil** lowers at each offset and settles only where every bit fits. **Patterns usually survive (owner):** the byte showing through the `??` hole in `F3 0F 11 41 ??` is the new offset, `14`, read straight off the stencil. The ruler re-measures it. Then a **second, short stencil** slides backwards until it seats at the function start. **(owner)** |
| 9 | Close | 10 | Patch vs hook side by side, plus an ethics card: understand software, don't cheat other players. **(my call)** |

An optional 5-second teaser of the energy freeze before chapter 1 fits inside the 15 s headroom; the owner decides (open item 4).

### 5.1 The bytes (Windows x64 calling convention throughout)

`rcx` holds the first argument and `xmm1` the second float argument. **(my call)**

The toy function is `Player::drainEnergy(Player* player, float drain)`, aligned to 16 bytes and preceded by `CC` (int3) padding. It is shown at the module's preferred base `0x140000000`, as a disassembler shows it. At runtime, ASLR rebases it, so runtime views say `game.exe+12A30`. **(my call)**

```
140012A30  48 83 EC 28      sub   rsp, 28h              ; prologue
140012A34  F3 0F 10 41 10   movss xmm0, [rcx+10h]       ; load energy
140012A39  F3 0F 5C C1      subss xmm0, xmm1            ; minus drain
140012A3D  F3 0F 11 41 10   movss [rcx+10h], xmm0       ; store energy
140012A42  E8 B9 2B 00 00   call  updateHud (140015600) ; rcx still = player
140012A47  48 83 C4 28      add   rsp, 28h              ; epilogue
140012A4B  C3               ret
```

**Patch.** `F3 0F 5C C1` becomes `90 90 90 90`: four one-byte NOPs, one tile each.

**Hook.**

- The stamp writes `E9 rel32` (5 bytes) at `140012A30`. That covers the 4-byte prologue plus the first byte of the following `movss`.
- The **stolen** whole instructions are `48 83 EC 28 F3 0F 10 41 10` (9 bytes). They are copied to the trampoline, followed by a jump back to `140012A39`.
- The **orphaned** bytes at `140012A35`–`A38` (`0F 10 41 10`) stay intact in memory and are never executed. **(my call)** Decoded on their own they would read `movups xmm0, [rcx+10h]`, a different valid instruction, because the `F3` prefix was overwritten. This is the visual reason hooks steal whole instructions.
- The detour calls the original through the trampoline, then writes 100.0 back to `[player+10h]`. It runs new code and still runs the original, which a patch cannot do.
- None of the stolen instructions are RIP-relative, so they move unchanged. Relocation exists, and the reference repos implement it, but it is not shown.
- All bytes in this section were checked with `iced-x86` 1.22.0 during brainstorming. The detour sat at `140090000` for that check.

**Patterns.**

- **Scan pattern (14 cells):** `F3 0F 5C C1 F3 0F 11 41 ?? E8 ?? ?? ?? ??`. The struct offset and the call's relative target are wildcards, because they change between builds.
- **Backward-scan pattern (second, short stencil):** `CC 48 83 EC ??`, i.e. int3 padding then `sub rsp, imm8`. This is a heuristic, and the film can say so.

**Addresses.**

- Addresses on screen must be consistent with instruction lengths (ACC-02).
- Code at `0x140012A30` and the heap at `0x1F46A3C2E10` are trillions of bytes apart. They are separate rail segments joined by an **axis break**, and the camera never travels continuously across one. **(my call)**

### 5.2 Reading it back (chapter 5)

- **With symbols:** `void Player::drainEnergy(Player* this, float drain) { this->energy -= drain; updateHud(this); }`
- **Stripped:** `void sub_140012A30(__int64 a1, float a2) { *(float *)(a1 + 16) = *(float *)(a1 + 16) - a2; sub_140015600(a1); }`. This is typical decompiler style, and no tool is named on screen.
- **Kept:** arithmetic, control flow and constants.
- **Lost:** names, types, struct layout and comments.
- **Partly recoverable:**
  - strings
  - exports, because a name the loader needs survives stripping
  - MSVC RTTI type names such as `.?AVPlayer@@`, for classes with virtual functions
- **On-screen wording:** "symbols removed (stripped)". On Windows, stripping in practice means the PDB isn't shipped.

### 5.3 Offsets (owner)

**What an offset is.** A distance from a base, counted in bytes. The film uses two kinds:

- **Module offsets (RVAs):** `game.exe+12A30` is `0x12A30` bytes from where the module starts.
- **Struct offsets:** energy at `player+0x10` is 16 bytes from the start of the player object.

The **ruler** (§6) makes both literal.

**Dumping offsets: why it's easy in some games and hard in others.**

- **Engines that keep metadata.** In Unity, the Mono backend ships managed assemblies, and IL2CPP ships a metadata file. Class, field and method names survive the build, so every offset can be listed automatically. The exception is a game that deliberately obfuscates or encrypts that metadata, which the film can mention in one line.
- **Stripped custom C++.** There are no names. An offset is inferred by hand: for example, the drain function writes `[rcx+10h]`, so `+0x10` is probably energy, which is then confirmed by watching the value change.
- **No tool is named on screen** (anti-goals). "Unity" is named as the example engine. **(owner)**

**How offsets connect to patterns.**

- Hard-coded offsets almost never survive an update, because code moves and struct layouts change.
- A pattern finds the code by its shape, so it usually survives. It breaks only if the function's own code changes, and the film says so in a single line. **(my call: accuracy)**
- In chapter 8, the updated build has energy at `+0x14`: the struct gained a field. The seated stencil's `??` hole over `F3 0F 11 41 14` shows the new offset `14` directly. The stencil recovers the offset that the ruler lost.
- `F3 0F 11 41 14` decodes to `movss [rcx+14h], xmm0`. ACC-01 covers it.

## 6. The world and look

### Memory: "The Tape" (owner, chosen over a hex wall and a helix)

- One endless rail of smoked-glass byte tiles, with addresses rising left to right.

### Bits as pins (owner)

- Inside each smoked-glass tile, the byte's **8 bits are visible as pins**. The lit hex glyph is light, and it always shows the value of the pins.
  - It sits on the tile's **front face**, facing the camera (owner, at the look checkpoint). The pins protrude through the top for keying, and a glyph on top was hidden by them.
- **Look (owner, picked from the look spike): "hybrid".**
  - Emissive neon tile edges with a light bloom, plus a real neon tube under the rail and the CPU sled's shadow-casting light.
  - Fixes on top: brighter smoked glass so the pins read, a truly reflective floor (deterministic, re-rendered per frame), and a monospace glyph font loaded before its textures are drawn.
- Every write flips pins with real motion. That covers energy draining, constructor writes, the patch, the trampoline copy and the detour's code. No exceptions are needed.
- **Keying requirement:** a wrong bit must block the stencil in either direction. A single up/down pin only blocks a 1 where a 0 was expected, so each bit needs, for example, a pin that sits in one of two positions. The builder designs the exact geometry. **(my call)**

### Matter and meaning (my call, following "bits as pins")

- **Matter never appears or vanishes in shot.** Each body exists from its chapter's declared start state, enters or leaves by moving from or to outside the camera's view, or changes across a cut.
- **Meaning is light:** instruction plates, pseudocode, labels, the pointer beam, and "allocated" outlines.
- **The name tags in ch 5 are matter**, because symbols are real data, so they fall physically.

### The CPU

- An amber sled riding the rail. It is a real light, so its shadows sweep across the tiles.

### Hovering tools (owner: "it just hovers, no apparatus"; my call: the stamp hovers too)

- The scan stencil, the short backward-scan stencil, the hook's stamp and the ruler hover with no support.
- This is the film's one declared exception to gravity:
  - Hovering tools ignore gravity while they hover.
  - They never ignore collisions.
  - They move smoothly, within PHYS-04's limits.
  - Once released, they fall under gravity.

### The stencils (owner: holes for wildcards)

- Wildcard cells are holes. Solid cells carry the expected byte, printed on top for the viewer, and are keyed underneath to that byte's bit pattern.
- **It snaps byte by byte (owner).** A pattern can't match half a byte, so the stencil only ever rests exactly over whole tiles. It steps one tile pitch at a time with a brief dwell, never as a smooth ride, and the camera pans smoothly underneath the snaps.
- At each offset the hovering stencil lowers to test. It is blocked by the first wrong bit.
- Where every bit fits, it is released and drops the last few millimetres flush, with a clack. The wildcard tiles show through the holes.
- **The collision tests therefore prove the match.** The matte surface and the tightening shadow show the fit.

### The stamp

- A hovering press whose face carries `E9`+rel32 as a bit pattern. It slams down, and the impact drives the old pins into the new pattern.

### The ruler (owner: offsets as distances on a visualized ruler)

- A hovering tool (my call), and matter.
- Its graduations are one per byte, labelled in hex.
- It is laid from a base (module start, object start) to a target. The reading is the offset.
- In chapter 8 its old reading visibly misses the moved field, and it is re-laid at the stencil's revealed offset.

### Framing for 9:16

- Wide shots angle the rail away into depth.
- Close-ups face the tiles square-on, so bytes are readable on a phone.
- A 14-cell stencil fits the 1080 px width in a close-up.

### Neon glow

- Glow is light, not matter: the tube is a body, and the halo is a screen effect, exempt from collision.
- The look is found by trial and error in a spike. **(owner)**
- three.js `RectAreaLight` cannot cast shadows, so tubes that must cast shadows need another light type.

### Scale and slow motion (my call)

- Tabletop scale (tiles about 4 cm), so gravity reads at true speed.
- Slow motion only as a declared clock warp. Story-time physics stays correct, and the tests run in story time.

### Colours

- Cyan for memory, amber for the CPU, cardboard for the stencils, magenta for warnings and orphaned bytes, and a dark reflective floor.

### Open: the owner decides during prototyping

1. **The toy game view:** how the character and energy bar appear (a physical diorama, an in-world monitor, or something else).
2. **The neon look** (spike).
3. **Voice specifics** (later).
4. **The teaser:** yes or no.

## 7. Architecture

### 7.1 Layout (a starting point; the builder may adjust)

```
src/
  config.ts            film clock (exists)
  world/               plain TS, no React: bodies, colliders, pins, kinematic tracks, baked-track sampling
  physics/             independent checker: collision, plausibility, seeded RNG
  bake/                Rapier setups per chapter (Node only)
  chapters/NN-name/    initialState.ts, choreography.ts, cameras.ts, sim.ts, Scene.tsx, *.test.ts
  render/              Stage, CameraRig, materials, tile/pin/sled/stencil/stamp components
  text/strings.ts      every on-screen string (English); German later = a second table
  Main.tsx, Root.tsx   Main plus one connected composition per chapter (Folder "Chapters")
src/bakes/             one bake per chapter + manifest with an input hash (committed (my call): renders need no bake step)
scripts/bake.(m)ts
docs/CONTINUITY.md, AGENTS.md, CLAUDE.md
```

- **Fresh sets per chapter (owner):** each chapter has its own declared initial state, story clock, bake and checker run, so changing one chapter never invalidates another.
- The `ClockTest` placeholder is removed once chapter 1 exists.

### 7.2 Motion

- **Kinematic bodies** are `(t) => pose`. This includes pins during writes, hovering tools and the sled.
- **Dynamic bodies** live in `bake/`. Kinematic tracks drive them as kinematic Rapier bodies. They are stepped at 960 Hz and stored as position and quaternion per step, from release onwards.
- **Sampling:** at any *t*, lerp positions and slerp rotations between neighbouring samples.
- Bakes are JSON files under `src/bakes/`. The renderer and the tests import them statically, so nothing loads asynchronously.

### 7.3 Cameras

- A shot list of pure functions: `cameraAt(t) → {position, target, fov, roll}`.
- `CameraRig` (in `src/lib/Stage.tsx`) renders exactly that.
- A test asserts that the render's camera equals the camera the checks measure, frame for frame.

### 7.4 Time

- Film time maps to story time through holds (the story stops while the film runs, as in `tibik-papiertonne/src/sceneClock.ts`) and declared warps.
- Physics and checks run in story time, so retiming for the voice never touches physics.

### 7.5 Studio editing

- 3D choreography lives in TypeScript data, not in Studio-draggable markup. Iteration happens through owner comments on prototypes.
- HTML overlay text stays Studio-editable.

### 7.6 Reuse

- The owner's previous film is the owner's own code. Its collision checker, scene clock, camera-equality test and CONTINUITY conventions **may be ported and adapted**. **(my call)**
- Dobby and shadowhook are informational only.

## 8. Enforcement

- **`docs/CONTINUITY.md`:**
  - Every rule has an ID. Rules enforced by tests are tagged **(test)**.
  - A meta-test fails if a tagged rule has no test citing its ID, or if a test cites an unknown ID.
  - Test titles carry the ID, e.g. `"[PHYS-01] …"`.
- **`AGENTS.md`** holds the working rules: the film clock, no self-running animation, seeded randomness, bake freshness, matter vs light, keeping Dobby and shadowhook out of the film and out of commits, and checking CONTINUITY before changing a chapter.
- **`CLAUDE.md`** contains `@AGENTS.md`.

**Initial CONTINUITY rules.** Each is tagged test. The builder writes the tests and may refine thresholds marked "builder to confirm".

| ID | Rule |
|---|---|
| PHYS-01 | Nothing passes through anything. An independent collision checker (spheres, OBBs, half-spaces) sweeps every pair at 960 Hz in story time. Tolerance is 0.5 mm for simulated resting contacts and 0 for everything else. |
| PHYS-02 | Nothing teleports. No body moves further between samples than its declared maximum speed allows. |
| PHYS-03 | Gravity is 9.81 m/s² at true scale for every body, except hovering tools while they hover. Hovering tools still collide, and fall once released. |
| PHYS-04 | Kinematic motion is smooth. Position and velocity are continuous within a shot except at declared impacts, and acceleration stays within declared limits. |
| PHYS-05 | Matter never appears or vanishes in shot. A body's lifetime starts or ends only at its chapter's start or end, at a cut, or outside the camera's view. |
| CAM-01 | Cameras never enter a body. A clearance sphere of 3 cm around the camera stays clear of every collider, and the near plane lies inside that sphere. |
| CAM-02 | Within a shot, camera motion meets PHYS-04's limits. Cuts happen only at declared instants, on whole frames at the base rate. |
| CAM-03 | The camera the render uses is the camera the checks measure. |
| TIME-01 | The world state at time *t* is identical at every fps (30, 60, 24 and 50 are tested). |
| TIME-02 | No unseeded randomness or wall-clock reads in world, bake or render code. |
| BAKE-01 | Every bake matches its inputs (hash in the manifest), and re-simulating its scene reproduces it exactly, so a change to the simulator cannot leave it stale. |
| ACC-01 | Every byte string shown decodes, with `iced-x86` in 64-bit mode, to exactly the mnemonic shown with it. |
| ACC-02 | Every address shown is consistent with the instruction lengths and with the module-base model (preferred base in disassembler views, `game.exe+RVA` at runtime). |
| ACC-03 | Each pattern seats exactly once in the tape shown with it, and the backward scan stops at the function start. |
| ACC-04 | Pseudocode and stripped names agree with §5 (call target, offset, argument types). |
| ACC-05 | At every moment, each tile's pins equal its byte, and its glyph shows the pins. |
| ACC-06 | Stencil keying is exact. For every expected byte and every actual byte (all 256 × 256 pairs), a cell fits only when they are equal. |
| ACC-07 | Every ruler reading equals the byte distance it spans, and every offset named on screen matches the bytes and addresses (e.g. `+0x10` in the original build, `+0x14` after the update). |
| SND-01 | A sound starts on the frame its motion first shows, or up to one frame later, never earlier. This is measured from the audible onset, after the file's lead-in silence (the stock `ding` has about 100 ms). |
| TXT-01 | On-screen text stays inside the safe area and meets the minimum sizes. |
| REF-01 | No file under `src/`, `public/` or `docs/` names Dobby or shadowhook or embeds their code, except this spec and the plan. |
| RES-01 | The 3D canvas renders at the render's pixel ratio for every ratio from 1 to 4. 4K and 8K draw real pixels, not an enlargement; RES-04 checks this on rendered stills. |
| RES-02 | Every pixel-measured effect parameter is defined in 1080p pixels and scales with the pixel ratio. Its extent, as a fraction of the frame, is identical at ratios 1, 2 and 4. |
| RES-03 | At every scale (ratio 1, 2 and 4) and in every shot, the glyph textures keep at least one texel per output pixel at the closest framing of any tile face, and no texture exceeds the GPU's maximum texture size. |
| RES-04 | A still rendered at `--scale=2` or `--scale=4`, box-downsampled to 1080×1920, matches the `--scale=1` still: mean absolute difference ≤ 2/255 per channel, and no 64×64 block above 8/255 (builder to confirm). Inside the tile glyphs, projected with the render's camera, the same stills draw real detail, not an enlargement: their energy finer than the 1080p pixel grid (squared steps between neighbouring pixels within each 2×2 or 4×4 block) is at least 1.5× (4K) and 3.5× (8K) that of the `--scale=1` still enlarged bilinearly (builder to confirm). It runs with `npm run test:render`. |
| DOC-01 | The meta-test linking CONTINUITY IDs to tests. |

- Not testable, so untagged: no black outlines, and the neon look.
- Visual checks: stills via `npx remotion still` at the timestamps the owner comments on.

## 9. References (informational only)

- **Cloned into `reference/`**, which is git-ignored, never shown, and never committed:
  - `reference/Dobby`: instruction relocation and trampolines (`source/InstructionRelocation/x64`, `source/TrampolineBridge`).
  - `reference/android-inline-hook`: now shadowhook. `doc/manual.md` covers hook flow, trampolines, and hook vs intercept.
  - `reference/tibik-papiertonne`: the owner's previous film. Its code may be ported (§7.6).
- **Remotion docs:** remotion.dev (add `.md` to a URL for Markdown). `ThreeCanvas` forces `frameloop="never"` while rendering and renders on demand.

## 10. Process

Iterative, in this order. Each step ends with a prototype the owner reviews before refining.

1. **Look spike (throwaway).** A tape segment with pin tiles, the CPU sled as a light, real shadows, and 2–3 neon-glow variants, as stills. The owner picks the look.
2. **Foundation:**
   - the world model with pins, the independent checker and the bake pipeline
   - CONTINUITY.md, AGENTS.md and CLAUDE.md, with the meta-test
   - one real physics moment end to end: the hovering stencil testing offsets and seating (ACC-03 and ACC-06 included)
   - resolution independence with pixel tests (RES-01 to RES-04), so later 4K and 8K renders need nothing but `--scale` **(owner)**
3. **Chapters one by one**, each as stills or a short clip, then owner comments, then refinement. The hook (7) and the stencils (8) carry the most physics risk and should come early.
4. **SFX pass** after picture lock, applying SND-01.
5. **Voice** later, with holds retiming chapters within the 3:00 ceiling.

## 11. Left to the builder

- tile, pin and rail dimensions, and the exact two-position pin geometry
- material parameters
- exact camera paths
- simulation parameters, masses and restitution
- the bake file format
- timing inside each chapter's budget
- SFX choices
- the exact detour code shown
- the detour address and the pointer slot's module offset
- the runtime module base used on screen
- thresholds marked "builder to confirm"
