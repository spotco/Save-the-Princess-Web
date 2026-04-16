# Save the Princess - Active Development Plan

**Last Updated**: 2026-04-13 (editor skeleton continued after partial run)

Human TODO, add to plan:
cannot place wizard tileset in level 1, fix this
pointers not visible when zoomed out, fix
level 6 to ending tileset in 0,1 doesn't look right

---

## Active Focus

Build an in-browser **Level Editor** addition and add **mouse/touch support**
throughout — menus, gameplay, and the editor. Both are non-source features
tracked in `ADDITIONS_FROM_SOURCE.md`. The Java-faithful port itself is
complete — new code must live beside the port without altering gameplay behavior.

For completed port details, see `PLAN_COMPLETED.md`.
For other non-source features, see `ADDITIONS_FROM_SOURCE.md`.

---

## Feature Goals

1. New **Level Editor** entry on the main menu.
2. A tile-based editor scene that can view/edit any screen of a level.
3. A human-readable level file format (`.stplevel.json`) that bundles all
   screens of a multi-screen level into one file.
4. Ability to import the existing Level 1–6 TMX data into the editor and
   export it as `.stplevel.json`.
5. Ability to download edited levels and load them back into the game at
   runtime (playable custom levels).

## Design Decisions (locked unless user says otherwise)

- **Menu refactor**: convert `Menu.js` loader cursor from a hard-coded
  `[147, 230, 309]` Y-table into a list-driven menu. The list has N entries
  with a scrollable window (even if items still fit on screen for now, the
  infrastructure must support scrolling for future entries). Entries:
  `New Game`, `Load Game`, `Times`, `Level Editor`.
- **Menu text rendering**: replace `space2start.png` and the baked-in
  text on `loader.png` with `scene.add.text()`. The loader background
  image stays (frame / decoration), but every label — including
  `PRESS SPACE TO START`, `NEW GAME`, `LOAD GAME`, `TIMES`, and the new
  `LEVEL EDITOR` — is a Phaser text object. The code must make the
  button→label mapping obvious: a single `entries` array of
  `{ label, action }` objects drives both rendering and input. No
  numeric-index lookups sprinkled across helpers.
- **File format**: `.stplevel.json`. Single file per level. Shape:
  ```json
  {
    "format": "stplevel",
    "version": 1,
    "name": "maximum security",
    "mapsong": "main1",
    "tileset": "tileset1",
    "screensX": 2,
    "screensY": 2,
    "spawnScreen": [0, 0],
    "screens": [
      {
        "sx": 0, "sy": 0,
        "width": 25, "height": 25,
        "tiles": [[0, 0, ...], ...],          // row-major, width*height GIDs
        "tileProps": {                         // per-GID property overrides
          "3": { "dog": "left" },
          "17": { "wall": "true" }
        }
      }
    ]
  }
  ```
  `tileProps` mirrors the `<tile id="N"><properties>…</properties></tile>`
  blocks in the original TMX. The runtime `Level._tileProp()` already reads
  from a `Map<gid, propObj>`, so this maps 1:1.
- **No zip / no binary / no base64**. JSON arrays only. Keeps diffs sane.
- **Runtime**: add `src/levels/CustomLevel.js` that accepts a parsed
  `.stplevel.json` object and builds `this.storedmap` in the same shape
  `Level._parseTMXInto()` produces, then reuses `Level`'s statics / enemies
  / objects pipeline unchanged.
- **Default levels migrate to `.stplevel.json`**: Level 1–6 TMX files
  become `data/stplevels/level1.stplevel.json` … `level6.stplevel.json`.
  `Level1..Level6` keep their classes (so gameplay code stays
  Java-recognizable) but their `init()` loads the JSON file instead of
  calling `_parseTMXInto` on a TMX cache key. The original TMX files
  stay in the repo under `data/` as historical reference, but the game
  no longer reads them at runtime.
- **No undo stack in v1.** Stretch goal only.
- **No object-layer support.** All gameplay entities live in tile properties
  in the original TMX; we match that.

---

## Implementation Phases

### Phase 1 — Menu list refactor (Phaser text only) ✓ DONE
- [x] Refactor `Menu.js` loader state to be driven by a single
      `this.entries` array: each row is
      `{ label: 'NEW GAME', action: () => this._actionNewGame() }`. Keep
      `loaderImgMenuStatus` as the selected index (don't rename it —
      style-neutral edit).
- [x] Add a scroll window (`visibleStart`, `visibleCount`) so more entries
      than fit on screen would scroll. For now `visibleCount` covers all
      entries; keep the mechanism in place.
- [x] Render every label with `scene.add.text()`. No more
      `space2start.png`; the `PRESS SPACE TO START` prompt is also a
      Phaser text object that blinks via its `visible` flag. The loader
      background image stays, but any text baked into it is covered /
      replaced by the Phaser text layer so the code is the source of
      truth for what each button says.
- [x] The cursor graphic (`loadercursor`) still follows the selected
      entry, with its Y computed from the entry's text Y — not a hard
      coded table.
- [x] Wire the `LEVEL EDITOR` entry's action to
      `scene.scene.start('LevelEditorScene')`.
- [x] `LevelEditorScene` stub registered in `Main.js`; shows placeholder
      with ESC-to-menu. Full implementation in Phase 3.
- [x] `inTimesScreen` boolean sub-state replaces the old index-3 hack;
      ESC from loader now always returns to title menu cleanly.

### Phase 1.5 — Menu pointer / touch support ✓ DONE
- [x] Make every interactive element in `Menu.js` respond to pointer input
      (mouse click and finger tap — Phaser treats them identically via its
      pointer event system):
  - [x] Title screen: `menuImg.setInteractive()` + `pointerdown` advances to loader.
  - [x] Loader entries: `setInteractive({ useHandCursor: true })` on each
        `entry.textObj`; `pointerover` hover-selects (sound only on change);
        `pointerdown` fires `entry.action()`.
  - [x] Times sub-screen: `timesmenuImg.setInteractive()` + `pointerdown`
        calls `_dismissTimesScreen()` (shared with keyboard path).
  - [x] `LevelEditorScene` stub: `input.once('pointerdown')` + ESC both call
        the same `goBack` closure.
- [x] No separate touch-only code path — one handler covers both.
- [x] Decorative loaderPanel graphics object has no `setInteractive()` call.

### Phase 2 — Level file format + import/export library ✓ DONE
- [x] `src/editor/TmxParser.js` — static class; extracted from Level.js.
      `parseTMX(scene, cacheKey)` is the public entry point. Level.js
      `_parseTMXInto` is now a thin wrapper calling it.
- [x] `src/editor/StpLevelFormat.js` — pure functions:
      `fromStoredMap`, `fromTmxCacheKeys`, `toJsonString`,
      `fromJsonString`, `validate`, `toStoredMap`.
- [x] `migrate_tmx.py` (Python, no external deps) generated
      `data/stplevels/level1–6.stplevel.json` from the original TMX files.
      Per-screen tilesets are stored because different screens in the
      same level use different firstgid mappings.
- [x] `Level._loadStpLevelInto(path)` added to the base class; sets
      `this.storedmap` and `this.mapsong` from a fetched stplevel file.
- [x] `Level1–Level6.init()` updated to call `_loadStpLevelInto`.
      Class names, `createMasterList`, and the overall Java shape unchanged.
- [x] TMX `load.xml` calls removed from BootScene; runtime no longer
      reads TMX files. Legacy `.tmx` files kept in `data/` as reference.

### Phase 3 — Editor scene skeleton
- [x] Create `src/editor/LevelEditorScene.js`, registered in `Main.js`
      alongside `GameScene` / `MenuScene`.
- [x] Layout (625×625 canvas, same as game):
  - [x] Left: tile canvas, 25×25 tiles, drawn from the bundled tilesets.
  - [x] Right: tile palette with selection highlight and drag / wheel scroll.
  - [x] Top: screen tab bar `(0,0) (1,0) …` plus working
        `+col`, `+row`, `-col`, `-row` grid resize buttons.
  - [x] Bottom: action bar with Paint / Erase / Fill / Rect / Picker, plus
        `Save`, `Load`, `Import`, `New`, `Menu`.
- [x] Rendering: draw the current screen's GID grid using
      `scene.add.image()` per tile and redraw on edit.
- [x] Input: Phaser pointer events (unified mouse + touch) for the current editor
      shell — paint, erase, picker, palette tap, palette drag-scroll, tab clicks,
      resize buttons, and action-bar buttons. Keyboard shortcuts `B/E/F/R/I` for tools;
      arrow keys pan between screens; `Ctrl+S` saves. Touch-specific notes:
  - Drag on the tile canvas paints/erases continuously (same as mouse drag).
  - Tap palette tile to select it; palette scrolls with swipe (pointer drag
    within the palette column).
  - No pinch-zoom in v1 — the canvas is fixed 625×625; stretch goal only.
- [ ] Remaining Phase 3 cleanup:
  - [ ] Replace the current bundled-level import modal with the planned
        default-level / TMX import flow chosen for Phase 5.
  - [ ] Add a clearer status / error surface if the file load or import fails.

### Phase 3.5 — Editor pointer-marker overlay
- [x] Add an editor-only pointer overlay mode that visualizes the original
      marker tiles from the historical `pointers` tileset on top of the
      current screen without changing gameplay tile data.
- [x] Default state: pointer markers visible whenever `LevelEditorScene`
      opens. This default applies only inside the editor and must never
      affect `GameScene` rendering.
- [x] Add an editor toggle control for pointer-marker visibility:
  - [x] UI button in the editor chrome (`PTR:ON` / `PTR:OFF`)
  - [x] Keyboard shortcut `P`
- [x] Rendering approach:
  - [x] Load / register the `pointers` marker art for editor use only.
  - [x] Use the original pointer-marked tileset variants in
        `LevelEditorScene` for the map canvas and palette when enabled.
  - [x] Redraw pointer-marked tiles when switching screens, editing tiles,
        loading levels, or toggling pointer visibility.
- [x] Scope rules:
  - [x] Pointer markers are a visualization aid only; they do not modify
        saved `.stplevel.json` structure beyond existing tile property data.
  - [x] Pointer markers must not appear in normal gameplay scenes.
- [x] Initial marker coverage:
  - [x] Coverage matches the original pointer-marked `tileset1`,
        `guard1set`, and `wizard1set` art used by the Java workflow.
  - [x] No separate synthetic marker rendering layer is needed in v1.

### Phase 4 — Editing operations
- [x] **Paint**: left-click sets tile to selected GID.
- [x] **Erase**: sets tile to 0 (empty).
- [x] **Fill**: flood-fill by current GID.
- [x] **Rect**: drag to set a rectangle region.
- [x] **Picker**: right-click or `I` copies the GID under cursor to the
      current selection.
- [ ] **Property inspector**: when the current selected GID has tile
      properties in `tileProps`, show them in a side panel. Allow
      editing the value (string field) and adding/removing entries.
      Property list suggestions come from the known keys in
      `Level.createStatics/Enemies/Objects` (`wall`, `player`, `dog`,
      `guardspawn`, `wizard`, `knightboss`, `door`, `doorbutton`, `key`,
      `keydoor`, `exit`, `direction`, `window`, `torch`, `tracker`,
      `bossactivate`, `bossactivatespawn`, `final`, `cratespawn`,
      `princess`, `guardpoint`, `stop`).

### Phase 5 — Save / load / play custom levels
- [ ] **Save**: serialize current editor state via
      `StpLevelFormat.toJsonString`, trigger download via `Blob` +
      anchor click. File name `<name>.stplevel.json`.
- [ ] **Load**: `<input type="file" accept=".json,.stplevel.json">`
      invisible element; on change, parse + validate, replace editor
      state.
- [ ] **Import existing**: menu button per level (1–6) that reuses the
      game's XML cache to build a `.stplevel.json` and loads it into
      the editor.
- [ ] **Play**: add a `Play` button in the editor that jumps to
      `GameScene` with the in-memory `.stplevel.json` as scene data.
- [ ] `GameScene` must accept either `{ levelName }` (existing path) or
      `{ customLevel: <parsed object> }`; the latter instantiates
      `CustomLevel` instead of `LevelN`.

### Phase 6 — `CustomLevel` runtime
- [ ] Create `src/levels/CustomLevel.js` extending `Level`. Its `init()`
      populates `this.storedmap` directly from the parsed JSON instead
      of hitting the XML cache. `createMasterList()` passes the stored
      `screensX, screensY`.
- [ ] Verify all entity spawns work unchanged (since tileProps keys
      match the existing strings the base `Level` methods check).
- [ ] Do NOT touch the existing `Level1..6` classes — they remain the
      Java-faithful reference path.

### Phase 6.5 — In-game virtual controls (touch / mouse)
Touch devices and users who prefer not to use a keyboard need on-screen
controls. This phase adds a virtual D-pad overlay that maps to the same
key flags `STPView` already polls, so zero gameplay logic changes.

- [ ] **Detection**: show the overlay when `'ontouchstart' in window` OR
      when the game URL has `?controls=virtual`. Always hidden on desktop
      unless forced. Store the preference in `localStorage` so it persists.
- [ ] **Overlay layout** (drawn on top of the game canvas, outside Phaser):
  - Left side: D-pad (four arrow buttons in a cross — up/down/left/right).
  - Right side: two action buttons — Jump (maps to `space` / `up`) and
    Attack (maps to `z` / the attack key).
  - Semi-transparent so the game tiles beneath remain readable.
  - Fixed position; does not scroll with the level.
- [ ] **Implementation approach**: inject a `<div>` overlay over the Phaser
      `<canvas>`. Each virtual button fires `keydown`/`keyup` synthetic
      events (or sets a shared `VirtualInput` flags object that `STPView`
      reads alongside `Phaser.Input.Keyboard`). Synthetic keyboard events
      keep `STPView` / `Player` untouched.
- [ ] **Multi-touch**: pressing D-pad left and Jump simultaneously must work.
      Use `touchstart` / `touchend` per-button element so each button
      tracks its own touch point independently.
- [ ] **Mouse fallback**: the same overlay buttons respond to `mousedown` /
      `mouseup` so desktop users can click them if desired.
- [ ] **Hide in editor**: the overlay must not appear while `LevelEditorScene`
      is active — pointer events there belong to the editor canvas, not
      virtual controls.
- [ ] Add a small toggle button (gamepad icon or "⌨" / "🕹" label) in a
      corner of the game canvas to show/hide the overlay at any time.

### Phase 7 — Polish / stretch (optional, do not start without user ok)
- [ ] Undo / redo stack.
- [ ] Multi-tile brush / stamp.
- [ ] Show property overlays (tiny icons) on tiles that have non-wall
      properties so the editor view matches gameplay intent.
- [ ] Editor button to "Open default Level N" — loads the bundled
      `.stplevel.json` directly so users can edit the shipped levels
      without a file-picker.

---

## Risks & Watch-outs

- The menu refactor and the Level 1–6 data-source switch both touch
  ported code. Per updated `AGENTS.md`, new features are allowed, but
  these files must stay Java-recognizable: don't rename
  `loaderImgMenuStatus`, don't drop existing methods, don't rewrite
  `Level.js` into idiomatic modern JS. Change as little structure as
  possible while swapping the data source / adding entries.
- `Level._parseTMXInto()` stores `tileProps` as a `Map`. When serializing
  to JSON, convert to a plain object and convert back on load.
- `Level.js` files are style-referenced when editing — inspect nearby
  methods first per `AGENTS.md` rules.
- No new dependencies. JSON + Blob + File API are all built-in. Virtual
  controls use the DOM overlay approach (a `<div>` over the canvas) rather
  than adding Phaser UI objects to every scene — this keeps gameplay scenes
  untouched and makes show/hide trivial across scene transitions.

---

## Known Notes (read before editing)

1. **Startup/menu flow now matches Java.** Fresh boot enters
   `TitleScreenAnimation`, returns to the static title menu, and only
   then does SPACE/ENTER advance to the loader.
2. **GameScene scene data remains the level handoff path.**
   `Menu._loadGame()` calls
   `this.scene.scene.start('GameScene', { levelName })`. `GameScene`
   receives the level name via `this.scene.settings.data.levelName` in
   `create()`. The editor adds a second shape: `{ customLevel }`.

---

## Key Implementation Notes

- **Tile size**: 25x25 pixels everywhere (grid unit)
- **Game canvas**: 625x625 (25 tiles x 25 tiles per screen)
- **Coordinate system**: top-left origin; hitboxes `{x, y, width, height}`
- **Player hitbox**: 15x15, offset 10px down from sprite top-left
- **Animation timing**: frame counters (decrement each `update()`)
- **Entity removal**: iterate a copy of lists when items remove themselves
- **Multi-screen levels**: `locationX/locationY` index into
  `level.masterList[x][y]`; `Exit` objects trigger `changeloc()`
- **Pathfinding (KnightBoss)**: breadcrumb heatmap via `Tracker`; no A*
- **Audio**: Phaser `scene.sound.add()` for music loop; `play()` for SFX
- **Gameplay entities = tile properties**, not a separate object layer.
  The editor edits tile GIDs and their property maps, nothing else.

---

**Instructions for all agents**:
Always check this file before starting work. Keep `PLAN.md` focused on
active work only. Record completed implementation details in
`PLAN_COMPLETED.md`, and record non-source feature ideas in
`ADDITIONS_FROM_SOURCE.md`.
