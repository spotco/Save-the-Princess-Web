# Save the Princess - Active Development Plan

**Last Updated**: 2026-04-26

---

## Active Focus

Implement a hybrid **Phaser + Three.js** gameplay renderer so the game defaults
to a 3D isometric-style presentation while preserving the existing 2D gameplay
logic, controls, timing, collisions, and screen flow.

The new rendering work should follow these boundaries:

- [ ] Add a webpage render-mode toggle with **3D as the default** and a
      persistent saved preference.
- [ ] Keep the **level editor fully 2D** regardless of the gameplay render mode.
- [ ] Touch as little existing gameplay logic as possible by treating current
      level data, object state, hitboxes, and `x/y` positions as authoritative.
- [ ] Keep the existing Phaser menu/UI/cutscene pipeline working while the
      gameplay world gets a new 3D path.

---

## Planned Phases

### 1. Render mode infrastructure
- [x] Add a shared render-mode setting/helper that stores the current mode in
      `localStorage` and exposes `2d` / `3d` state to webpage UI and scenes.
- [x] Add a DOM toggle in `index.html` for switching render modes without
      disturbing the rest of the page layout.
- [x] Define scene rules:
      gameplay scenes may use either mode, the editor always uses 2D, and the
      existing menu/cutscene flow remains on the current Phaser path unless a
      later phase explicitly opts it into 3D.

### 2. Hybrid Phaser + Three.js bootstrap
- [x] Integrate Three.js in the no-build workflow in a way that fits the
      project's current static-file setup.
- [x] Add a second gameplay render surface layered with the Phaser canvas so
      Three.js can draw the world while Phaser still handles scenes, input,
      audio, text, and overlays.
- [x] Handle creation, resize, visibility, and teardown cleanly on scene start,
      scene shutdown, and browser resize.

### 3. Renderer abstraction seam
- [x] Introduce a small gameplay renderer abstraction so `STPView` can target
      either the existing 2D tilemap path or the new 3D path.
- [x] Move screen rebuild responsibility behind that abstraction instead of
      spreading `if 3d` checks through enemy/object/gameplay logic.
- [x] Keep `Level`, `Player`, enemies, objects, save points, and collision code
      authoritative; the renderer should observe state rather than own it.

### 4. 3D tile world
- [x] Build the active screen's floor from the existing tile textures.
- [x] Build wall geometry from the same tile data, using the current tile
      textures for visible wall surfaces.
- [x] Rebuild or swap only the active screen when `changeloc()` runs so
      multi-screen levels continue to work exactly like the current game.
- [x] Use a fixed isometric-style camera that preserves gameplay readability and
      keeps sprite billboards legible at the current 25 px tile scale.

### 5. Billboarded entity bridge
- [x] Render the player, enemies, and interactive objects as camera-facing 3D
      billboards using the existing sprite textures.
- [x] Reuse the current animation/state outputs where possible so entity logic
      does not need to be rewritten for Three.js.
- [x] Support world-space indicators that are part of gameplay readability, such
      as exit arrows, enemy emotes, and object visibility changes.
- [x] Keep HUD-style overlays such as timer/best time/pause UI on the existing
      Phaser layer unless a clear 3D need appears.

### 6. Runtime mode switching
- [ ] Allow switching between 2D and 3D rendering while preserving current game
      state, current screen, and active level/editor session data.
- [ ] Ensure switching modes does not reset campaign progress, save-point state,
      or editor-play return data.
- [ ] Keep the editor on the current 2D rendering path even when the global
      webpage preference is 3D.

### 7. Verification and cleanup
- [ ] Verify campaign levels, multi-screen transitions, pause/reset/exit flow,
      save points, death/crush animations, boss flow, custom editor play, and
      title/menu return paths in both render modes.
- [ ] Verify webpage toggle persistence, resize behavior, and layered-canvas
      cleanup so mode switching does not leak display objects or orphan canvases.
- [ ] Record the finished 3D rendering implementation in
      `PLAN_COMPLETED.md` and keep any future non-source follow-ups in
      `ADDITIONS_FROM_SOURCE.md`.

---

## Current Notes

1. `.stplevel.json` no longer stores `tileProps`. Runtime/editor load rebuild
   canonical tile properties from each screen's `tilesets`.
2. Editor sessions persist across title/menu exits and editor-play round trips
   until explicitly replaced by `New`, `Load`, `Import`, or a full page reload.
3. The safest low-touch approach is a **renderer adapter** layered on top of the
   current gameplay model, not a rewrite of the current Phaser gameplay classes.
4. The current editor scene is already isolated enough to remain 2D while the
   gameplay scene gains a new 3D renderer.
5. Existing full-screen/menu/cutscene animations can remain 2D in the first pass
   unless gameplay-only 3D proves insufficient for the desired presentation.

---

**Instructions for all agents**:
Always check this file before starting work. Keep `PLAN.md` focused on active
work only. Record completed implementation details in `PLAN_COMPLETED.md`, and
record non-source feature ideas in `ADDITIONS_FROM_SOURCE.md`.
