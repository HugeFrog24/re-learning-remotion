# Look Spike and Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** First, show the owner the look as throwaway stills. Then build the tested foundation:
- a world model of byte tiles with pins
- an independent collision checker
- a deterministic 960 Hz bake
- the story and camera clocks
- enforcement of the CONTINUITY rules

It ends with the stencil-seating moment rendered end to end.

**Architecture:**
- `src/world` is plain TypeScript. It describes every body as a pure function of story time *t*.
- `src/physics` is an independent checker, ported from the owner's previous film. It sweeps the world at 960 Hz.
- Rapier's deterministic build simulates only released bodies, at 960 Hz, in Node. The result is committed as JSON under `src/bakes/`, which both the renderer and the tests import.
- `src/render` only draws the world at `t = frame / fps`. Tiles, pins and stencils are drawn from the same boxes the checker tests.

**Tech Stack:**
- Remotion 4.0.543 and `@remotion/three`
- `@react-three/fiber` 9.8.2 and `three` 0.187.0
- `@react-three/postprocessing` 3.2.2 and `postprocessing` 6.39.6
- `@dimforge/rapier3d-deterministic-compat` 0.21.0
- `iced-x86` 1.22.0 (tests only)
- vitest 5.1.0 and TypeScript 5.9.3

**Spec:** `docs/superpowers/specs/2026-11-13-reverse-engineering-explainer-design.md`. This plan implements §10 steps 1–2 and uses §3, §5.1, §6, §7 and §8. Chapters get their own plans after the look is chosen.

## Global Constraints

- Animations never use R3F `useFrame()`. Every pose is a pure function of story time *t*, where `t = storyTimeOfFrame(frame, fps, clock)`.
- No `Math.random`, `Date.now`, `new Date(` or `performance.now` anywhere in `src/` outside tests and `src/tooling/` (TIME-02). Use `seeded()`.
- Timing is authored in seconds. The render rate changes only via `--props '{"fps":N}'`, never the CLI `--fps` flag.
- Every composition is 1080×1920, with `fps={getFps()}` and `durationInFrames={secondsToFrames(seconds, fps)}` (from `src/config.ts`).
- Units are metres, seconds and kg. +y is up. The tape runs along +x, so addresses rise left to right.
- `SIM_HZ = 960` and `CHECK_HZ = 960`. The tolerance is 0.0005 m when either body in a pair is simulated, and 1e-7 m for every other pair.
- A test that enforces a CONTINUITY rule has the rule's ID in its title, e.g. `test("[PHYS-01] …")`. In the same commit, flip that rule from `(planned)` to `(test)` in `docs/CONTINUITY.md`.
- Never name the reference hooking libraries listed in `AGENTS.md` under `src/`, `public/` or `docs/` (specs and plans excepted). Code from `reference/tibik-papiertonne` may be ported.
- Commits are authored by the configured identity (HugeFrog24). Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Before each commit, `npm run lint` (eslint + tsc) and `npx vitest run` must pass.

## Review Focus

1. **The same picture at any frame rate.** Rendering at 24, 50 or 60 fps must give pixel-identical stills to 30 fps at shared instants, bloom included. Checked by the still-hash comparison in Task 10, Step 5.
2. **The same frames under parallel rendering.** `--concurrency=4` must render byte-identical frames to `--concurrency=1`, so no module-level cache may depend on render order. Checked in Task 10, Step 6.
3. **Scrubbing backwards in Studio.** Sampling *t* = 5 then *t* = 1 must equal sampling *t* = 1 fresh, for choreography, tracks and cameras alike. Tested in Task 8 (`track.test.ts`) and Task 9.
4. **Segment boundaries.** Exactly at a choreography segment boundary, poses must be finite and continuous (no NaN, no jump), and sweeps include the exact end time. Tested in Task 6 (sweep samples) and Task 9.
5. **Stale bakes.** Editing the choreography without re-baking must fail the tests. A shifted release time must change the input hash. Tested in Task 8.

---

### Task 1: Look spike (throwaway) and owner checkpoint

**Files:**
- Modify: `package.json` (dependency upgrades)
- Create: `src/spikes/LookSpike.tsx` (throwaway; deleted in Task 10)
- Modify: `src/Root.tsx` (register `LookSpike` in `<Folder name="Spikes">`)

**Interfaces:**
- Produces: `LookSpike: React.FC<{ variant: "bloom" | "lights" | "hybrid" }>`, plus the owner's pick, recorded for Task 10's `look.ts`.

- [ ] **Step 1: Upgrade the 3D stack to the combination the owner's previous film rendered with, and add postprocessing**

Run:
`npm i --save-exact @react-three/fiber@9.8.2 three@0.187.0 @react-three/postprocessing@3.2.2 postprocessing@6.39.6 && npm i -D --save-exact @types/three@0.187.0`

Then run `npm run lint` and `npx remotion still ClockTest out/sanity.png --frame=60`.
Expected: lint passes, and the still shows the torus knot as before.

- [ ] **Step 2: Build `LookSpike`**

Composition: id `LookSpike`, 1080×1920, 4 s, `defaultProps={{ variant: "bloom" }}`.

Scene, all static except one moving light:
- **Tiles:** ten tiles with bytes `CC CC 48 83 EC 28 F3 0F 10 41`, along +x at pitch 0.044 m.
  - Each tile is a 0.04 × 0.012 × 0.04 box of smoked glass: `MeshPhysicalMaterial`, color `#0b1a22`, transmission 0.6, roughness 0.15.
  - Each tile has 8 pins visible inside, with the geometry from Task 5's constants. The spike may hard-code these.
  - Each tile has a hex glyph on top, drawn into a `CanvasTexture` inside `useMemo` (synchronous, cyan `#c8fbff`).
- **Floor:** reflective, `#05060b`, roughness 0.35, metalness 0.2. It receives shadows.
- **CPU sled:** an amber mesh above tiles 2–5, carrying a shadow-casting `pointLight` (`#ffb43f`). It slides +0.044 m over 4 s, so its shadows visibly move.
- **Camera:** a 3/4 close-up framing tiles 2–7. `shadows` is on.

Variants:

| Variant | Glow setup |
|---|---|
| `bloom` | Emissive tile edges `#46f0ff`, plus `<EffectComposer><Bloom luminanceThreshold={0.6} intensity={1.2} mipmapBlur /></EffectComposer>` |
| `lights` | No postprocessing. A thin emissive tube under the rail plus a `RectAreaLight` (it can't cast shadows), plus the sled's shadow-casting light |
| `hybrid` | Both of the above, with bloom intensity 0.6 |

- [ ] **Step 3: Render one still per variant**

Run, for each of `bloom`, `lights` and `hybrid`:
`npx remotion still LookSpike out/look-<variant>.png --frame=45 --props='{"variant":"<variant>"}'`

Expected: three PNGs. `bloom` and `hybrid` show halos, and `lights` shows none.

- [ ] **Step 4: Determinism probe**

1. Render `bloom` at frame 45 a second time, then compare SHA-256 hashes.
2. Render `--frame=90 --props='{"variant":"bloom","fps":60}'`. This is the same instant, *t* = 1.5 s.

Expected: all three hashes are identical. If any differ, record which variant broke and report it at the checkpoint, because it decides whether TIME-01 can hold at render level.

- [ ] **Step 5: Commit**

`git add package.json package-lock.json src/spikes/LookSpike.tsx src/Root.tsx && git commit` with the message `spike: look variants (throwaway)` plus the trailer.

- [ ] **Step 6: CHECKPOINT. The owner picks the look.**

Show the three stills and the probe result. Record the pick and any adjustments verbatim in the task notes for Task 10. Tasks 2–9 may proceed meanwhile. Task 10 waits for the pick.

---

### Task 2: Test runner, CONTINUITY, AGENTS and CLAUDE, plus the meta-tests (DOC-01, TIME-02, REF-01)

**Files:**
- Modify: `package.json`, adding the script `"test": "vitest run"`. Install `vitest@5.1.0` and `@types/node`, both exact and dev-only.
- Create: `vitest.config.mts` with `include: ["src/**/*.test.ts"]` and `testTimeout: 60_000`.
- Modify: `tsconfig.json`: set `"target": "ES2020"` and `"lib": ["ES2020"]` (the tests need BigInt literals), and add `"resolveJsonModule": true`. Do **not** add a `types` restriction. Without one, `@types/node` and `@types/web` both load automatically, as in the owner's previous film.
- Create: `docs/CONTINUITY.md`, `AGENTS.md`, `CLAUDE.md`
- Create: `src/tooling/continuity.ts`, `src/tooling/continuity.test.ts`, `src/tooling/sourceScan.test.ts`

**Interfaces:**
- Produces:
  - `parseContinuity(markdown: string): readonly { id: string; status: "test" | "planned" }[]`
  - `citedIds(testSource: string): readonly string[]`

**File contents (exact formats):**
- **`docs/CONTINUITY.md`:**
  - It has one line per rule, matching `/^- \*\*([A-Z]+-\d{2})\*\* \((test|planned)\) (.+)$/`.
  - Rule texts are copied from spec §8, except REF-01, which reads: "No file under src/, public/ or docs/ (specs and plans excepted) names a reference hooking library listed in AGENTS.md."
  - DOC-01, TIME-02 and REF-01 start as `(test)`; every other rule starts as `(planned)`.
  - The header states that `(test)` rules are enforced by `npm test`, and that `(planned)` rules become `(test)` in the commit that adds their test.
- **`AGENTS.md`** holds the working rules from spec §8 (film clock, no self-running animation, seeded randomness, bake freshness, matter vs light, read CONTINUITY before changing a chapter). It contains exactly this line:
  `Reference repositories (never named under src/, public/ or docs/): Dobby, shadowhook, android-inline-hook`
- **`CLAUDE.md`** is a single line: `@AGENTS.md`

- [ ] **Step 1: Write the failing tests**

`continuity.test.ts`:
- **`parses rule lines`:**
  `parseContinuity("- **PHYS-01** (test) A\n- **CAM-01** (planned) B\nnoise")` equals `[{id:"PHYS-01",status:"test"},{id:"CAM-01",status:"planned"}]`.
- **`finds IDs in test titles`:**
  `citedIds('test("[PHYS-01] a", f); describe("[CAM-02] b", f)')` equals `["PHYS-01","CAM-02"]`.
- **`[DOC-01] every (test) rule is cited by a test and every cited ID exists`:**
  - Read `docs/CONTINUITY.md` and every `src/**/*.test.ts`, using `readdirSync(..., { recursive: true })`.
  - Assert that the rule IDs are unique.
  - Assert that every `test` ID is cited by at least one file.
  - Assert that every cited ID is a rule.

`sourceScan.test.ts`:
- **`[TIME-02] no unseeded randomness or wall-clock reads`:**
  - Scope: every `src/**/*.{ts,tsx}` except `*.test.ts` and `src/tooling/**`.
  - Assert that nothing matches `/Math\.random|Date\.now|new Date\(|performance\.now/`.
- **`[REF-01] reference hooking libraries are never named`:**
  - Take the names from the `AGENTS.md` line above.
  - Scan every `.ts`, `.tsx`, `.md`, `.json`, `.mjs` and `.html` file under `src/`, `public/` and `docs/`, except `docs/superpowers/specs/**` and `docs/superpowers/plans/**`.
  - Assert that no file contains any name (case-insensitive).

- [ ] **Step 2: Run them to check they fail**

Run `npx vitest run src/tooling`.
Expected: FAIL, because `continuity.ts` doesn't exist yet.

- [ ] **Step 3: Implement `continuity.ts`, and write the three documents**

- [ ] **Step 4: Run the tests and lint**

Run `npx vitest run src/tooling && npm run lint`.
Expected: PASS.

- [ ] **Step 5: Commit**

Message: `feat: CONTINUITY enforcement, AGENTS/CLAUDE docs, vitest`.

---

### Task 3: Byte listings (ACC-01, ACC-02)

**Files:**
- Create: `src/world/listing.ts`, `src/world/listing.test.ts`
- Modify: `package.json`, adding `iced-x86@1.22.0` (dev, exact)

**Interfaces:**
- Produces:
  - `type ListingLine = { readonly address: bigint; readonly bytes: readonly number[]; readonly text: string }`
  - `DEMO_TAPE`, `PATCHED_SUBSS`, `HOOKED_ENTRY`, `UPDATED_STORE`: `readonly ListingLine[]`
  - `FUNCTION_START = 0x140012A30n`
  - `SCAN_MATCH = 0x140012A39n`
  - `tapeBytes(lines: readonly ListingLine[]): number[]`

**Values** (verified with iced-x86 during planning; `text` is the exact formatter output):

```
DEMO_TAPE
0x140012A20  48 8B CB        mov rcx, rbx
0x140012A23  48 83 C4 20     add rsp, 20h
0x140012A27  5B              pop rbx
0x140012A28  C3              ret
0x140012A29…0x140012A2F  CC (×7, one line each)   int 3
0x140012A30  48 83 EC 28     sub rsp, 28h
0x140012A34  F3 0F 10 41 10  movss xmm0, [rcx+10h]
0x140012A39  F3 0F 5C C1     subss xmm0, xmm1
0x140012A3D  F3 0F 11 41 10  movss [rcx+10h], xmm0
0x140012A42  E8 B9 2B 00 00  call 140015600h
0x140012A47  48 83 C4 28     add rsp, 28h
0x140012A4B  C3              ret
0x140012A4C…0x140012A4F  CC (×4)                  int 3
PATCHED_SUBSS   0x140012A39…3C  90 (×4)            nop
HOOKED_ENTRY    0x140012A30  E9 CB D5 07 00        jmp near ptr 140090000h
                0x140012A35  0F 10 41 10           movups xmm0, [rcx+10h]
UPDATED_STORE   0x140012A3D  F3 0F 11 41 14        movss [rcx+14h], xmm0
```

- [ ] **Step 1: Write the failing tests**

- **`[ACC-01] every listed byte string decodes to exactly its text`:**
  - For every line of every listing: `new Decoder(64, Uint8Array.from(bytes), DecoderOptions.None)`, then set `decoder.ip = address`.
  - Decode exactly one instruction. Its `length === bytes.length`.
  - With a `Formatter(FormatterSyntax.Masm)` configured as `uppercaseHex = true`, `hexPrefix = ""`, `hexSuffix = "h"`, `spaceAfterOperandSeparator = true`, `memorySizeOptions = MemorySizeOptions.Never` and `branchLeadingZeros = false`, assert `format(ins) === text`.
- **`[ACC-02] addresses follow instruction lengths`:**
  - In each listing, `lines[i+1].address === lines[i].address + BigInt(lines[i].bytes.length)`.
  - `DEMO_TAPE` starts at `0x140012A20n`, and `tapeBytes(DEMO_TAPE).length === 48`.

- [ ] **Step 2: Run them to check they fail**

Run `npx vitest run src/world/listing.test.ts`.
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `listing.ts`, with the values above as data**

- [ ] **Step 4: Run the tests**

Expected: PASS. Then flip ACC-01 and ACC-02 to `(test)`.

- [ ] **Step 5: Commit**

Message: `feat: verified byte listings`.

---

### Task 4: Port the collision checker and seeded RNG

**Files:**
- Create: `src/physics/collision.ts` and `src/physics/collision.test.ts`. These are ports of `reference/tibik-papiertonne/src/physics/collision.ts` and its test, with the API unchanged.
- Create: `src/physics/seeded.ts` (port) and `src/physics/seeded.test.ts` (new)

**Interfaces:**
- Produces the types `Sphere`, `Obb`, `HalfSpace`, `Solid` and `Contact`, and these functions:
  - `sphere(name, center, radius)`
  - `obb(name, matrix, size, localCenter?)`
  - `halfSpace(name, normal, offset)`
  - `frame(parent, position, rotation?)`
  - `collide(a, b): Contact | null`. Touching is not a collision.
  - `contacts(shapes, solids): Contact[]`
  - `deepest(found): number`
  - `smallestClearing(penetration, max, scanStep?)`
  - `nearby(solids, point, reach)`
  - `seeded(seed: number): () => number`

- [ ] **Step 1: Copy both files and their tests, fixing import paths only**

- [ ] **Step 2: Write the `seeded` test**

- The same seed gives the same first 1000 values.
- Every value lies in `[0, 1)`.
- Seeds 1 and 2 give different first values.

- [ ] **Step 3: Run the tests and lint**

Run `npx vitest run src/physics && npm run lint`.
Expected: PASS. Fix only typing or lint issues the stricter config raises, never behaviour.

- [ ] **Step 4: Commit**

Message: `feat: port collision checker and seeded RNG`.

---

### Task 5: Geometry of tiles, pins and stencils (ACC-03, ACC-05, ACC-06)

**Files:**
- Create in `src/world/`: `units.ts`, `geometry.ts`, `bytes.ts`, `tape.ts`, `pins.ts`, `stencil.ts`, `fit.ts`, `scan.ts`
- Tests: `bytes.test.ts`, `pins.test.ts`, `stencil.test.ts`

**Interfaces:**
- Consumes: `collision.ts` (Task 4); `DEMO_TAPE`, `tapeBytes`, `FUNCTION_START` and `SCAN_MATCH` (Task 3).
- Produces:
  - `units.ts`:
    - `TILE_SIZE = 0.04`, `TILE_HEIGHT = 0.012`, `TILE_PITCH = 0.044`
    - `PIN_SIZE = 0.003`, `PIN_PROTRUSION = 0.004`, `PIN_ROW_PITCH = 0.0045`, `PIN_SLOT_OFFSET = 0.006`
    - `BLOCKER_SIZE = 0.0036`, `STENCIL_PLATE_THICKNESS = 0.003`
  - `geometry.ts`:
    - `type Vec3 = readonly [number, number, number]` and `type Quat = readonly [number, number, number, number]`
    - `type Pose = { readonly position: Vec3; readonly quaternion: Quat }` and `IDENTITY_POSE`
    - `type LocalBox = { readonly name: string; readonly center: Vec3; readonly size: Vec3 }`
    - `toObb(box: LocalBox, pose: Pose): Obb`
  - `bytes.ts`:
    - `bitsOf(byte: number): readonly (0 | 1)[]`: most significant bit first. Throws `RangeError` outside the integers 0–255.
    - `byteOfBits(bits): number`
    - `hex2(byte): string`
    - `parsePattern(text: string): readonly (number | null)[]`
  - `tape.ts`:
    - `type Tape = { readonly base: bigint; readonly bytes: readonly number[]; readonly origin: Vec3 }`
    - `tilePose(tape, index): Pose`, `tileTop(tape): number`
    - `indexOf(tape, address: bigint): number`, `addressOf(tape, index): bigint`
  - `pins.ts`:
    - `tileBoxes(byte): readonly LocalBox[]`: the tile box first, then 8 pins.
    - `pinBit(box: LocalBox): 0 | 1`
    - `glyphOf(byte): string`
  - `stencil.ts`:
    - `type Stencil = readonly (number | null)[]`
    - `stencilBoxes(stencil): readonly LocalBox[]`
  - `fit.ts`:
    - `seatedBottom(tape): number`
    - `fitsAt(tape, stencil, index): boolean`
    - `restBottom(tape, stencil, index): number`
    - `stencilPose(tape, index, bottomY: number): Pose`
  - `scan.ts`:
    - `matchOffsets(bytes: readonly number[], pattern: Stencil): number[]`

**Geometry** (this is what is drawn and what is tested):
- **Tile frame:** x and z are centred on the tile, and y = 0 is the tile's bottom. Tiles sit on the rail at `origin.y`, and the tile centre's x is `origin.x + index * TILE_PITCH`.
- **Pins:** bit row `r` (r = 0 is bit 7) sits at `z = (r - 3.5) * PIN_ROW_PITCH` and `x = bit ? +PIN_SLOT_OFFSET : -PIN_SLOT_OFFSET`.
  - Each pin is a `PIN_SIZE` square.
  - It spans y from `TILE_HEIGHT * 0.25` to `TILE_HEIGHT + PIN_PROTRUSION`, so it stays inside the glass and protrudes above it.
  - Pins and their own tile belong to one body, so they never collide with each other.
- **Stencil frame:** x and z are centred on cell 0, and y = 0 is the plate's underside.
  - **Solid cell:** a plate box `TILE_SIZE × STENCIL_PLATE_THICKNESS × TILE_SIZE` at y ∈ [0, thickness], plus 8 blockers.
    - Each blocker is `BLOCKER_SIZE` square and spans y ∈ [−`PIN_PROTRUSION`, 0].
    - It sits at the slot *opposite* the expected bit, so a wrong bit in either direction meets a blocker.
  - **Wildcard cell:** two rim bars along x at |z| ∈ [0.018, 0.020], with no blockers, which leaves the hole.
- **Seated** means the plate underside is at `tileTop + PIN_PROTRUSION`.
- **`fitsAt`** is true when there are no contacts between the stencil boxes at the seated pose and the tile boxes of the tiles `index … index+len-1`. It throws `RangeError` if the stencil would overhang the tape.
- **`restBottom`** is `seatedBottom + smallestClearing(a => deepest(contacts(stencil at seated + a, tiles)), 2 * PIN_PROTRUSION, PIN_PROTRUSION / 4)`.

- [ ] **Step 1: Write the failing tests**

`bytes.test.ts`:
- `bitsOf(0xF3)` equals `[1,1,1,1,0,0,1,1]`.
- `byteOfBits(bitsOf(b)) === b` for every b in 0–255.
- `hex2(0x0F) === "0F"`.
- `parsePattern("F3 0F 5C C1 F3 0F 11 41 ?? E8 ?? ?? ?? ??")` equals `[0xF3,0x0F,0x5C,0xC1,0xF3,0x0F,0x11,0x41,null,0xE8,null,null,null,null]`.
- `parsePattern("F3 G0")` throws.
- `bitsOf(256)` throws `RangeError`.

`pins.test.ts`:
- **`[ACC-05] pins encode exactly the tile's byte`:** for every b in 0–255, `byteOfBits(tileBoxes(b).slice(1).map(pinBit)) === b`, and `glyphOf(b) === hex2(b)`.
- **`neighbouring tiles' pins never touch`:** for every byte pair taken from `DEMO_TAPE`, there are no contacts between tile i's pins and tile i+1's.

`stencil.test.ts`:
- **`[ACC-06] a cell fits only its own byte (all 256 × 256 pairs)`:** for a one-tile tape `[a]` and stencil `[e]`, `fitsAt === (a === e)`.
- **`a wildcard cell fits every byte`:** for every a, `fitsAt(tape [a], [null], 0)` is true.
- **`rest height: seated on a match, one pin higher on a mismatch`:**
  - `restBottom([0xF3], [0xF3])` is within 1e-6 of `seatedBottom`.
  - `restBottom([0xF2], [0xF3])` is within 1e-6 of `seatedBottom + PIN_PROTRUSION`.
- **`[ACC-03] the scan pattern seats exactly once on the demo tape, at the subss; the short stencil seats once, before the function`:**
  - The tape is `{ base: 0x140012A20n, bytes: tapeBytes(DEMO_TAPE), origin: [0,0,0] }`.
  - The indices where the scan pattern fits are exactly `[indexOf(tape, SCAN_MATCH)]`, and they equal `matchOffsets(...)`.
  - `CC 48 83 EC ??` fits exactly once, at index `i`, with `addressOf(tape, i + 1) === FUNCTION_START`.

- [ ] **Step 2: Run them to check they fail**

Run `npx vitest run src/world`.
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement the modules to the geometry above**

`fitsAt` must decide through the collision boxes, never by comparing bytes.

- [ ] **Step 4: Run the tests**

Expected: PASS. ACC-06 must finish in under 30 s. If it is slower, prefilter by `nearby`, never by byte comparison. Then flip ACC-03, ACC-05 and ACC-06 to `(test)`.

- [ ] **Step 5: Commit**

Message: `feat: tiles with pins, keyed stencils, exact fit`.

---

### Task 6: Bodies, scenes, sweep and plausibility checks

**Files:**
- Create: `src/world/body.ts`, `src/physics/sweep.ts`, `src/physics/plausibility.ts`
- Tests: `src/physics/sweep.test.ts`, `src/physics/plausibility.test.ts`

**Interfaces:**
- Consumes: `geometry.ts` (Task 5) and `collision.ts` (Task 4).
- Produces:
  - `type Material = { readonly density: number; readonly friction: number; readonly restitution: number }`
  - `type Body`:
    ```
    { readonly id: string;
      readonly motion: "static" | "kinematic" | "simulated";
      readonly hovering: boolean;
      readonly maxSpeed: number;
      readonly maxAccel: number;
      readonly impacts: readonly number[];
      readonly localBoxes: readonly LocalBox[];
      readonly poseAt: (t: number) => Pose;
      readonly release?: { readonly at: number; readonly material: Material; readonly hoverAt: (t: number) => Pose } }
    ```
  - `solidsAt(body, t): readonly Obb[]`
  - `type Scene = { readonly id: string; readonly duration: number; readonly bodies: readonly Body[]; readonly shots: readonly Shot[] }`. `Shot` comes from Task 7. Until then, declare `shots` as `readonly unknown[]`.
  - `CHECK_HZ = 960`, `RESTING_TOLERANCE = 0.0005`, `KINEMATIC_EPSILON = 1e-7`
  - `sweep(scene, opts: { hz: number; from?: number; to?: number }): Violation[]`, where `Violation = { t: number; a: string; b: string; depth: number }`, and `a` and `b` are `"<bodyId>/<boxName>"`.
  - `teleports(body, opts): { t: number; distance: number }[]`
  - `roughMotion(body, opts): { t: number; accel: number }[]`

**Behaviour:**
- **Samples:** `sweep` samples `from + k/hz` and always includes the exact `to`. It skips pairs within the same body and static–static pairs.
- **Broadphase:** body bounding boxes, then box bounding boxes, then `collide`.
- **Depth limit:** `RESTING_TOLERANCE` when either body is simulated, `KINEMATIC_EPSILON` otherwise.
- **`teleports`** flags any step longer than `maxSpeed / hz + 1e-9`.
- **`roughMotion`** applies to kinematic and hovering bodies. It flags any `|p(t+dt) − 2p(t) + p(t−dt)| / dt²` above `maxAccel × (1 + 1e-6)`, except within `2/hz` of a declared impact.

- [ ] **Step 1: Write the failing tests** (synthetic scenes, no rule IDs)
  - Two 2 cm boxes, one moving through the other at 0.1 m/s along x. The first violation's `t` is within `1/CHECK_HZ` of the analytic first-overlap time.
  - Two boxes touching face to face give `[]`.
  - A simulated box overlapping a static one by 0.4 mm gives `[]`; by 0.6 mm, one violation.
  - The sample set includes `to` exactly. Use `to = 1/3`.
  - A body that jumps 5 cm in one sample is flagged by `teleports`.
  - Moving 0.044 m in 0.25 s with smoothstep `u²(3−2u)` and `maxAccel = 5` passes `roughMotion`.
  - Constant velocity followed by a stop is flagged by `roughMotion`, unless the stop time is in `impacts`.

- [ ] **Step 2: Run them to check they fail**, then **Step 3: implement**, then **Step 4: run them to check they pass**, along with `npm run lint`.

- [ ] **Step 5: Commit**

Message: `feat: world bodies, sweep and plausibility checks`.

---

### Task 7: Story clock and cameras (helpers for TIME-01, CAM-02 and CAM-03)

**Files:**
- Create: `src/world/clock.ts`, `src/world/camera.ts`, `src/physics/cameraChecks.ts`
- Modify: `src/world/body.ts`, changing `Scene.shots` to `readonly Shot[]`
- Tests: `src/world/clock.test.ts`, `src/world/camera.test.ts`

**Interfaces:**
- Produces:
  - `type Hold = { readonly at: number; readonly seconds: number }`
  - `type StoryClock = { storyAt(filmT: number): number; filmAt(storyT: number): number; readonly held: number }`
  - `heldClock(holds: readonly Hold[]): StoryClock`, `STEADY`
  - `storyTimeOfFrame(frame: number, fps: number, clock: StoryClock): number`, which returns `clock.storyAt(frame / fps)`
  - `type CameraSetup = { readonly position: Vec3; readonly target: Vec3; readonly fov: number; readonly roll: number }`
  - `type Shot = { readonly name: string; readonly from: number; readonly to: number; readonly at: (t: number) => CameraSetup }`
  - `cameraAt(shots, t): CameraSetup`: the shot with `from ≤ t < to`; at or after the last `to`, the last shot evaluated at its `to`.
  - `validateShots(shots, duration): string[]`: reports gaps, overlaps, a first `from` other than 0, a last `to` other than `duration`, and any cut where `|x*30 − round(x*30)| > 1e-9`.
  - `cameraForFrame(shots, frame, fps, clock): CameraSetup`. This is the only camera path the renderer may use.
  - In `cameraChecks.ts`: `CAMERA_CLEARANCE = 0.03`, `CAMERA_MAX_SPEED = 0.5`, `CAMERA_MAX_ACCEL = 2`, and `cameraClearance(scene, opts: { hz }): { t: number; against: string; depth: number }[]`. That function places a sphere of radius `CAMERA_CLEARANCE` at the camera position, using `sphere` and `contacts`.

The clock is a port of `reference/tibik-papiertonne/src/sceneClock.ts`, with holds measured in seconds instead of frames.

- [ ] **Step 1: Write the failing tests**
  - Port tibik's three `sceneClock` tests, converting to seconds.
  - **`storyTimeOfFrame agrees at 24/30/50/60 fps at every half second`:** for t = 0, 0.5, …, 10, `storyTimeOfFrame(t*fps, fps, clock)` is identical across all four rates, for `STEADY` and for `heldClock([{at:2, seconds:0.5}])`. Use exact `toBe`.
  - `cameraAt` picks the right shot, including exactly at a cut.
  - `validateShots` reports a gap, an overlap, and a cut at 1.01 s.
  - `cameraForFrame` equals `cameraAt(shots, frame/fps)` for frames 0–299 at 30 fps and 0–599 at 60 fps.

- [ ] **Steps 2–4: Run them to check they fail, implement, then run them to check they pass** (plus lint)

- [ ] **Step 5: Commit**

Message: `feat: story clock and camera model`.

---

### Task 8: Bake pipeline (BAKE-01 is wired up but flipped in Task 9)

**Files:**
- Modify: `package.json`, adding `@dimforge/rapier3d-deterministic-compat@0.21.0` (exact)
- Create: `src/bake/simulate.ts`, `src/bake/inputs.ts`, `src/bake/registry.ts`, `src/world/track.ts`, `src/bakes/manifest.json` (`{}`)
- Tests: `src/bake/simulate.test.ts`, `src/bake/bakes.test.ts`, `src/world/track.test.ts`

**Interfaces:**
- Consumes: `Body` and `Scene` (Task 6).
- Produces:
  - `SIM_HZ = 960`
  - `type BakeTrack = { readonly id: string; readonly hz: number; readonly from: number; readonly poses: Readonly<Record<string, readonly number[]>> }`, with 7 numbers per step (`x y z qx qy qz qw`), rounded to 1e-7.
  - `simulate(scene: Scene): Promise<BakeTrack>`: Node only, and it awaits `RAPIER.init()`.
  - `inputHash(scene): string`: a SHA-256 hex digest of `bakeInputs(scene)`.
  - `sampleTrack(track, id, t): Pose`
  - `releasedPose(id: string, release: { at: number; hoverAt: (t: number) => Pose }, track: BakeTrack | null): (t: number) => Pose`: `hoverAt(t)` before `release.at`, and `sampleTrack(track, id, t)` from then on. It throws if `track` is null after release. A simulated body's `poseAt` is built with it, while `simulate` drives the body kinematically from `release.hoverAt` until release.
  - `BAKES: readonly { id: string; scene: () => Scene }[]`: empty until Task 9.

**Simulation:**
- **World:** gravity `(0, −9.81, 0)` and `timestep = 1 / SIM_HZ`.
- **Bodies:**
  - Static bodies become `RigidBodyDesc.fixed()`.
  - Kinematic bodies become `kinematicPositionBased()`, driven each step with `setNextKinematicTranslation` and `setNextKinematicRotation` from `poseAt(t_next)`.
  - Simulated bodies start kinematic. At `release.at` they call `setBodyType(RAPIER.RigidBodyType.Dynamic, true)` and `setLinvel` with the hover velocity (finite difference at 1/SIM_HZ).
- **Colliders:** one `ColliderDesc.cuboid` per `LocalBox`, with the body's material on simulated bodies, and CCD enabled on simulated bodies.
- **Recorded:** simulated bodies from `release.at` to `duration`.
- **Bake inputs:** `SIM_HZ`, the Rapier version `"0.21.0"`, and every body's id, motion, boxes, material and release. Non-static bodies also include their poses sampled at `SIM_HZ` over `[0, duration]`; static bodies include one pose.

- [ ] **Step 1: Write the failing tests**

`simulate.test.ts`, on a synthetic floor plus a 4 × 1.2 × 4 cm box released at t = 0 with its bottom 44 mm above the floor:
- Before contact, `y(t)` matches `y0 − 9.81·t²/2` to within 2e-4 m.
- The maximum penetration over the whole track is at most `RESTING_TOLERANCE`. This proves the SIM_HZ choice; 240 Hz measured 1.6 mm.
- A hovering kinematic body in the same world follows `poseAt` exactly, so gravity has no effect on it.
- `simulate` run twice gives deep-equal tracks.

`track.test.ts`:
- Sampling at step times returns the stored pose.
- At a half step it returns the lerped midpoint and a normalised slerp.
- Before `from` it clamps to the first pose; after the end, to the last.
- **`random access order doesn't matter`:** sample(5) then sample(1) equals a fresh sample(1).

`bakes.test.ts`:
- **`[BAKE-01] every bake matches its inputs`:** for each `BAKES` entry, `manifest[id].inputHash === inputHash(scene())` and `src/bakes/<id>.json` exists. When `process.env.UPDATE_BAKES === "1"`, it simulates first and writes the file and the manifest entry.
- **`moving the release time changes the hash`:** use a synthetic scene and shift `release.at` by 1/960 s.

- [ ] **Steps 2–4: Run them to check they fail, implement, then run them to check they pass** (plus lint)

- [ ] **Step 5: Commit**

Message: `feat: deterministic 960 Hz bake pipeline`.

---

### Task 9: The stencil-seating scene, with the real-scene rules (PHYS-01–04, CAM-01, CAM-02, TIME-01, BAKE-01)

**Files:**
- Create in `src/chapters/00-stencil-seat/`: `initialState.ts`, `choreography.ts`, `cameras.ts`, `scene.ts`, `scene.test.ts`
- Modify: `src/bake/registry.ts`, registering `{ id: "stencil-seat", scene: stencilSeatScene }`
- Create (generated): `src/bakes/stencil-seat.json`, plus a `src/bakes/manifest.json` entry

**Interfaces:**
- Consumes: Tasks 3 to 8.
- Produces:
  - `stencilSeatScene(track: BakeTrack | null): Scene`
  - `STENCIL_SEAT_SECONDS: number`
  - `RELEASE_AT: number`
  - `MATCH_INDEX = 25`, `START_INDEX = 17`

**Initial state:**
- **Tape:** `{ base: 0x140012A20n, bytes: tapeBytes(DEMO_TAPE), origin: [0, 0, 0] }`. Each tile is a static body `tile-<hex address>`.
- **Rail:** a static box spanning x ∈ [−0.02, 48·0.044], y ∈ [−0.01, 0], z ∈ [−0.03, 0.03].
- **Floor:** a static box spanning x and z ∈ [−3, 3] and y ∈ [−0.11, −0.01].
- **Stencil:** the scan pattern, as a simulated body with `hovering: true`, `maxSpeed: 0.3`, `maxAccel: 5` and material `{ density: 600, friction: 0.6, restitution: 0.05 }`.

**Choreography** (story seconds; every move uses smoothstep):
- **Hover height:** the hover underside is `seatedBottom + 0.02`.
- **0–1.0 s:** hold over index 17.
- **For each k from 17 to 24:**
  1. Lower in 0.20 s to `restBottom(k) + 1e-6`. The 1 µm margin keeps the bisection's error from becoming a penetration.
  2. Hold for 0.10 s.
  3. Raise in 0.15 s.
  4. Slide one pitch in 0.25 s.
- **At k = 25:** lower in 0.30 s to `seatedBottom + 0.003`. `RELEASE_AT` is the end of that lowering, where velocity is 0.
- **Duration:** `STENCIL_SEAT_SECONDS = RELEASE_AT + 2.0`.

**Cameras:**
- **`wide` (0 to 1.0 s):** static, with the whole stencil plus 4 tiles on each side in frame.
- **`follow` (1.0 s to the end):** the camera tracks the stencil centre's x as it was 0.15 s earlier (a pure lag), with `fov = 30`.
  - It sits at the distance where the 0.616 m stencil fills 90 % of the 9:16 width: about 2.27 m. The horizontal half-angle is `atan(tan(15°)·9/16)`.
  - It is slightly above, at y + 0.35 m, looking at the stencil.

- [ ] **Step 1: Write the failing tests** (`scene.test.ts`, with the scene built from the committed bake)
  - `[PHYS-01] nothing passes through anything`: `sweep(scene, { hz: CHECK_HZ })` equals `[]`.
  - `[PHYS-02] nothing teleports`: `teleports` is `[]` for every body.
  - `[PHYS-03] gravity acts only after release`:
    - Before `RELEASE_AT`, the stencil's pose equals the hover track exactly.
    - Between release and first contact, the vertical acceleration (second difference at 960 Hz) is −9.81 ± 0.05.
  - `[PHYS-04] kinematic motion is smooth`: `roughMotion` is `[]` for every kinematic or hovering body before release.
  - `[CAM-01] cameras never enter a body`: `cameraClearance` is `[]`.
  - `[CAM-02] camera motion is smooth and cuts land on whole frames`:
    - `validateShots` is `[]`.
    - The camera position passes `teleports` and `roughMotion` using `CAMERA_MAX_SPEED` and `CAMERA_MAX_ACCEL`.
  - `[TIME-01] the world is identical at every fps`: at 24, 30, 50 and 60 fps, every half second, all body poses and the camera at `storyTimeOfFrame(...)` are deep-equal across rates.
  - `the stencil is blocked at every mismatch and comes to rest seated at the subss`:
    - At each k from 17 to 24, the lowest underside during the dip is `restBottom(k) + 1e-6`, which is greater than `seatedBottom`.
    - At the end, the underside is within `RESTING_TOLERANCE` of `seatedBottom`, and cell 0's x is within 0.5 mm of tile 25's centre.
  - `poses are finite and continuous at every segment boundary`: at each boundary ±1e-9, there is no NaN and the jump is under 1e-6 m.
  - `sampling backwards equals sampling forwards` (Review Focus 3): every body pose and the camera at the 960 Hz grid, evaluated in descending order, deep-equals the same grid evaluated in ascending order.
  - Extend `bakes.test.ts`'s registry coverage. No new test is needed; `[BAKE-01]` now covers `stencil-seat`.

- [ ] **Step 2: Implement the scene, then bake**

Run `UPDATE_BAKES=1 npx vitest run src/bake/bakes.test.ts`.
Expected: it writes `src/bakes/stencil-seat.json` and its manifest entry.

- [ ] **Step 3: Run the whole suite**

Run `npx vitest run && npm run lint`.
Expected: PASS, with `scene.test.ts` under 60 s. If the sweep is slower than that, tighten the broadphase; never lower `CHECK_HZ`.

- [ ] **Step 4: Flip the rules**

Flip PHYS-01, PHYS-02, PHYS-03, PHYS-04, CAM-01, CAM-02, TIME-01 and BAKE-01 to `(test)`.

- [ ] **Step 5: Commit**

Message: `feat: stencil-seat scene with physics, camera and time checks`.

---

### Task 10: Render the stencil-seat scene (CAM-03), remove the placeholders, owner checkpoint

**Files:**
- Create in `src/render/`:
  - `look.ts`: the values from the owner's Task 1 pick
  - `glyphTexture.ts`
  - `BoxesMesh.tsx`: draws `LocalBox` lists with a given material at a pose
  - `TileMesh.tsx`, `StencilMesh.tsx`
  - `SceneView.tsx`, plus `sceneView.test.ts`
- Create: `src/chapters/00-stencil-seat/StencilSeat.tsx`
- Modify: `src/lib/Stage.tsx` (shadows on, and the look's postprocessing if it was picked), `src/Root.tsx`, `src/Main.tsx`
- Delete: `src/scenes/ClockTest.tsx`, `src/spikes/LookSpike.tsx`, and their registrations

**Interfaces:**
- Consumes: Tasks 5 to 9, and the Task 1 pick.
- Produces:
  - `cameraPropsAt(scene, clock, frame, fps): CameraSetup`: pure, built only on `cameraForFrame`.
  - `SceneView: React.FC<{ scene: Scene; clock: StoryClock }>`. It draws every body's `localBoxes` at `poseAt(t)`, and the camera through `<CameraRig>` from `cameraPropsAt`.
  - The `StencilSeat` composition, in `<Folder name="Chapters">`: 1080×1920, `fps={getFps()}`, `durationInFrames={secondsToFrames(STENCIL_SEAT_SECONDS, fps)}`.

What is drawn must be what is tested: `TileMesh` and `StencilMesh` render exactly the `LocalBox`es from `tileBoxes` and `stencilBoxes`, with materials from `look.ts` and glyphs from `glyphOf`.

- [ ] **Step 1: Write the failing test**

`[CAM-03] the camera the render uses is the camera the checks measure`: `cameraPropsAt(stencilSeatScene(track), STEADY, f, fps)` deep-equals `cameraAt(scene.shots, f / fps)`, for every frame at 30 and 60 fps.

- [ ] **Step 2: Implement the render components and the composition**

Point `Main` at the stencil-seat scene and delete both placeholders. Then run `npx vitest run && npm run lint`.
Expected: PASS. Flip CAM-03 to `(test)`.

- [ ] **Step 3: Render the stills**

At *t* = 0.5 s (wide), *t* = 1.25 s (first blocked dip) and *t* = `STENCIL_SEAT_SECONDS − 0.5` (seated), run:
`npx remotion still StencilSeat out/seat-<n>.png --frame=<round(t*30)> --image-format=png`

Expected: the pins are readable inside the glass, the stencil visibly rides one pin higher at the dip, and it sits flush at the end.

- [ ] **Step 4: Commit**

Message: `feat: render stencil-seat scene; remove placeholders`.

- [ ] **Step 5: Check the same instant at another frame rate (Review Focus 1)**

Repeat Step 3's stills with `--frame=<t*60> --props='{"fps":60}'`.
Expected: SHA-256 identical to the 30 fps stills.

- [ ] **Step 6: Check parallel rendering (Review Focus 2)**

Run:
- `npx remotion render StencilSeat out/c1 --sequence --image-format=png --frames=0-59 --concurrency=1`
- the same with `out/c4` and `--concurrency=4`

Expected: every frame's hash is identical between the two folders.

- [ ] **Step 7: CHECKPOINT. The owner reviews the stills.**

Show the stills and the results of Steps 5 and 6. The owner's comments feed the first chapter plan.
