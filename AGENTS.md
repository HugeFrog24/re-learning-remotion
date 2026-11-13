# Working rules

## Owner's standing rules (always apply)

- **Docs before code.** Before implementing anything, read current documentation instead of relying on remembered APIs.
  - Remotion: use the `remotion:remotion-docs` skill (Algolia search, then fetch the page with `.md` appended).
  - Every other library: its official online docs or the installed `.d.ts` files.
  - Cite the pages you used.
- **jscpd after every step.** Run `npm run dupes`. It covers five detection levels: exact, renamed (Type-2), near-miss (Type-3), structural similarity, and semantic (Type-4). Remove each clone it reports, or justify it.
- **No code comments.** Source files carry no comments, except tool directives (`eslint…`, `@ts-…`, `prettier-ignore`, `@jsx`, `global`, `///`). Explanations belong in `docs/`. Strip comments with `npm run strip`; a test fails if any remain.
- **Commit messages are one word.** No body and no trailer. Examples: `spike`, `listing`, `bake`.
- **Push `main` to `origin`** (github.com/HugeFrog24/re-learning-remotion) after each completed task. Never force-push.
- **Recommendations go through AskUserQuestion,** with the recommended option first.

## Project rules

- The spec is the authority: `docs/superpowers/specs/2026-11-13-reverse-engineering-explainer-design.md`.
- The current plan is `docs/superpowers/plans/2026-11-13-look-spike-and-foundation.md`. Its build ledger, the place to resume after context loss, is `.superpowers/sdd/2026-11-13-look-spike-and-foundation/progress.md`. Trust the ledger and `git log` over recollection.
- **Film clock.** All timing is authored in seconds; FPS only samples it.
  - Write `from={2.5 * fps}`, and compute poses from `t = frame / fps`.
  - Change the render rate with `--props '{"fps":N}'`, never the CLI `--fps` flag.
- **No self-running animation.** Never use R3F `useFrame()`. Every pose is a pure function of story time.
- **Seeded randomness only.** No `Math.random`, `Date.now`, `new Date(` or `performance.now` in `src/`.
- **Every 3D object is physical.**
  - Nothing passes through anything; motion follows real physics.
  - Hovering tools are the only declared exception to gravity.
  - Matter never appears or vanishes in shot. Meaning (labels, plates, beams) is light.
- **Bakes must match their inputs.** After changing choreography, re-bake with `UPDATE_BAKES=1 npx vitest run src/bake/bakes.test.ts`.
- **Before changing a chapter, read `docs/CONTINUITY.md`.** Rules tagged `(test)` are enforced by `npm test`, except RES-04, which renders stills and runs with `npm run test:render`.
- **The reference clones under `reference/`** are informational only. They are never committed, never shown on screen, and never named in project files.

## Adding a chapter

1. Make `src/chapters/NN-name/`, following `00-stencil-seat`:
   - `initialState.ts`: the bodies at t = 0. Body ids must be unique; they key the React meshes, the bake tracks and the sweep's reports.
   - `choreography.ts`: kinematic and hover paths as pure functions of story time, authored in seconds. Releases fall on the 1/960 s step grid.
   - `cameras.ts`: the shot list. Cuts land on whole frames at 30 fps.
   - `scene.ts`: `xScene(track: BakeTrack | null): Scene`, which assembles the bodies and the shots.
   - The Composition component: it imports the committed bake JSON, builds the scene once, and renders `<SceneView scene={…} clock={…} />`.
2. Register the scene in `BAKES` (`src/bake/registry.ts`). Bake it with `UPDATE_BAKES=1 npx vitest run src/bake/bakes.test.ts`, and commit `src/bakes/<id>.json` with the manifest. BAKE-01 re-simulates every registered bake in `npm test`.
3. Add the Composition to `src/Root.tsx` through `Film`, in the "Chapters" folder, and to `Main`.
4. Give every new kind of body a look in `SceneView`'s `BodyMesh`, which throws on a body it cannot draw.
5. Test it: a `scene.test.ts` that runs `validateScene` (`src/bake/inputs.ts`) and the PHYS, CAM and TIME rules on the scene, and a `framing.test.ts` for the chapter's framing targets.
6. Before committing, run `npm run strip`, `npm run lint`, `npm test` and `npm run dupes`, and `npm run test:render` when render code or framing changed.

Reference repositories (never named under src/, public/ or docs/): Dobby, shadowhook, android-inline-hook
