# Build Fix Round 2 — Apply These Changes

Two build attempts (commits 9d1e6e7 and f8e8fcf) surfaced real bugs beyond the
first hotfix. This package fixes everything found across a full manual audit,
not just what the compiler caught — the compiler only flags what it can prove
at compile time; several of these were silent runtime bugs.

---

## Build-Breaking Errors (what your last two logs showed)

1. **`cannon-es` missing** — still needs `npm install cannon-es@^0.20.0` on your end.
2. **`CameraRig` not exported** — `camera-rigs.ts` imported the `CameraRig` type
   from `environment.models.ts` but never re-exported it, so
   `environment.service.ts` (which imports `CameraRig` FROM `camera-rigs.ts`)
   couldn't resolve it. Fixed with an explicit `export type { CameraRig, ... }`.
3. **`body.shape` doesn't exist** — cannon-es's `Body` class exposes `shapes`
   (plural, an array), not `shape`. Fixed both call sites to `body.shapes[0]`.

## Additional Bugs Found in Full Audit (not yet caught by the compiler, but real)

4. **`world.step()` called with the wrong arguments** — was passing
   `Date.now() / 1000` (an absolute timestamp) as the "time since last call"
   parameter, which is nonsense; fixed to `world.step(1/60, dt, 10)` — the
   physics tick rate, the real per-frame delta, and max substeps, matching
   cannon-es's actual signature.
5. **Camera rig output was computed and discarded** — `environment.service.ts`
   called `cameraRig.update()`, stored the result in a local `output` variable,
   and never applied it to the actual `THREE.PerspectiveCamera`. The camera
   would never have moved. Now wired through properly (`applyCameraOutput()`),
   and Director View's output is applied too.
6. **`setCameraRigMode()` built a rig against a throwaway camera** — it created
   a brand-new `THREE.PerspectiveCamera` that was never attached to the scene,
   so switching Selfie ↔ Placed after initial setup would silently break.
   Fixed to reuse the live camera reference.
7. **`exitDirectorView()` didn't exist** — the integration guide's recording
   example calls `environmentService.exitDirectorView()` before starting a
   take (Director View must never be recorded, per spec §19.4), but the method
   was never implemented. Added.
8. **Keyboard listener `dispose()` was a no-op** — `removeEventListener` was
   called with a *new* arrow function, which never matches the original
   listener reference, so it never actually unregistered. Same bug existed in
   `DirectorCam`'s document-level listeners (mousemove/keydown/pointerlockchange),
   which is a real memory leak on repeated scene teardown. Both fixed with
   stored bound handler references.
9. **IndexedDB `'blobs'` object store was never created** — `importEnvironment()`
   and `exportEnvironment()` open a transaction against a `blobs` store that
   `onupgradeneeded` never creates, so importing a custom environment would
   throw `NotFoundError` at runtime. Fixed by creating it alongside the
   `environments` store.
10. **Walk animation's vertical bob was computed and thrown away** — `bob` was
    calculated but assigned to an unused `bodyOffset` variable and never
    applied. Now wired to the hip bone's Y position (with idle-easing so it
    doesn't pop when you stop walking).
11. **Unused imports/vars removed** — `Vec3` in apartment-builder.ts,
    `MarkerPoint` in environment.store.ts, dead `WALK_SPEED`/`RUN_SPEED`
    constants duplicated in physics-world.service.ts. These risk failing the
    build outright if your tsconfig has `noUnusedLocals`/`noUnusedParameters`
    on (common in Angular strict mode) — better to remove them than find out
    on attempt 3.
12. **Typo**: `physicsBodiess` → `physicsBodies` in the device-tier budget
    interface (cosmetic, but would confuse anyone wiring tier gating to it).

---

## How to Apply

### Step 1 — Overwrite these 6 files (same paths as before)
```
src/app/environment/01-environment.models.ts
src/app/environment/02-apartment-builder.ts
src/app/environment/03-physics-world.service.ts
src/app/environment/06-environment.store.ts
src/app/environment/09-environment.service.ts
src/app/movement/04-movement.controller.ts
src/app/camera-rig/05-camera-rigs.ts
```

### Step 2 — Install the missing dependency (still required)
```bash
npm install cannon-es@^0.20.0
```

### Step 3 — Commit and push
```bash
git add src/app/environment src/app/movement src/app/camera-rig package.json package-lock.json
git commit -m "fix: resolve remaining build errors and silent runtime bugs

- Fix body.shapes (cannon-es API) and world.step() argument order
- Re-export CameraRig from camera-rigs.ts
- Wire camera rig output to the actual THREE.PerspectiveCamera (was discarded)
- Fix setCameraRigMode using a throwaway unattached camera
- Add missing exitDirectorView() used by the recording integration
- Fix dispose() methods that never actually removed their listeners
- Create missing IndexedDB blobs store for environment import/export
- Wire vertical walk bob to the hip bone (was computed, never applied)
- Remove unused imports/consts; fix physicsBodiess typo

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01EmvkUE9UdWVJYzJmndszrW"
git push
```

---

## Note on Verification

I do not have push access to `github.com/gdongorere/v_me` (private repo, no
credentials in this environment), so I can't verify against your exact
Angular/tsconfig setup directly. I also could not run a live `tsc` type-check
in this sandbox — outbound npm registry access is blocked here — so this pass
is a rigorous manual line-by-line audit (import resolution, brace/paren
balance, cannon-es API surface cross-checked against your actual error logs,
unused-symbol scan) rather than a compiler-verified one. If a fourth round
surfaces anything, paste the log and I'll fix it immediately — but this round
went well past just the two reported errors specifically to reduce that odds.
