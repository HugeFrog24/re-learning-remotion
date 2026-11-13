# Continuity rules

Rules tagged `(test)` are enforced by `npm test`. A `(planned)` rule becomes `(test)` in the commit that adds its test. Test titles carry the rule ID, for example `"[PHYS-01] …"`, and the meta-test DOC-01 fails if a `(test)` rule has no citing test or a test cites an unknown ID.

- **PHYS-01** (test) Nothing passes through anything. An independent collision checker (spheres, OBBs, half-spaces) sweeps every pair at 960 Hz in story time. Tolerance is 0.5 mm for simulated resting contacts and 0 for everything else.
- **PHYS-02** (test) Nothing teleports. No body moves further between samples than its declared maximum speed allows.
- **PHYS-03** (test) Gravity is 9.81 m/s² at true scale for every body, except hovering tools while they hover. Hovering tools still collide, and fall once released.
- **PHYS-04** (test) Kinematic motion is smooth. Position and velocity are continuous within a shot except at declared impacts, and acceleration stays within declared limits.
- **PHYS-05** (planned) Matter never appears or vanishes in shot. A body's lifetime starts or ends only at its chapter's start or end, at a cut, or outside the camera's view.
- **CAM-01** (test) Cameras never enter a body. The near plane and a clearance sphere (≥ 3 cm, builder to confirm) stay clear of every collider.
- **CAM-02** (test) Within a shot, camera motion meets PHYS-04's limits. Cuts happen only at declared instants, on whole frames at the base rate.
- **CAM-03** (planned) The camera the render uses is the camera the checks measure.
- **TIME-01** (test) The world state at time t is identical at every fps (30, 60, 24 and 50 are tested).
- **TIME-02** (test) No unseeded randomness or wall-clock reads in world, bake or render code.
- **BAKE-01** (test) Every bake matches its inputs (hash in the manifest).
- **ACC-01** (test) Every byte string shown decodes, with iced-x86 in 64-bit mode, to exactly the mnemonic shown with it.
- **ACC-02** (test) Every address shown is consistent with the instruction lengths and with the module-base model (preferred base in disassembler views, game.exe+RVA at runtime).
- **ACC-03** (test) Each pattern seats exactly once in the tape shown with it, and the backward scan stops at the function start.
- **ACC-04** (planned) Pseudocode and stripped names agree with §5 (call target, offset, argument types).
- **ACC-05** (test) At every moment, each tile's pins equal its byte, and its glyph shows the pins.
- **ACC-06** (test) Stencil keying is exact. For every expected byte and every actual byte (all 256 × 256 pairs), a cell fits only when they are equal.
- **ACC-07** (planned) Every ruler reading equals the byte distance it spans, and every offset named on screen matches the bytes and addresses (e.g. +0x10 in the original build, +0x14 after the update).
- **SND-01** (planned) A sound starts on the frame its motion first shows, or up to one frame later, never earlier. This is measured from the audible onset, after the file's lead-in silence (the stock ding has about 100 ms).
- **TXT-01** (planned) On-screen text stays inside the safe area and meets the minimum sizes.
- **REF-01** (test) No file under src/, public/ or docs/ (specs and plans excepted) names a reference hooking library listed in AGENTS.md.
- **RES-01** (planned) The 3D canvas renders at the render's pixel ratio for every ratio from 1 to 4. 4K (`--scale=2`) and 8K (`--scale=4`) draw real pixels, not an enlargement.
- **RES-02** (planned) Every pixel-measured effect parameter is defined in 1080p pixels and scales with the pixel ratio. Its extent, as a fraction of the frame, is identical at ratios 1, 2 and 4.
- **RES-03** (planned) At every scale (ratio 1, 2 and 4) and in every shot, the glyph textures keep at least one texel per output pixel at the closest framing of any tile face, and no texture exceeds the GPU's maximum texture size.
- **RES-04** (planned) A still rendered at --scale=2 or --scale=4, box-downsampled to 1080×1920, matches the --scale=1 still: mean absolute difference ≤ 2/255 per channel, and no 64×64 block above 8/255. It runs with `npm run test:render`, not `npm test`.
- **DOC-01** (test) The meta-test linking CONTINUITY IDs to tests.
