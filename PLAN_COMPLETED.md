# Save the Princess - Completed Implementation Notes

**Last Updated**: 2026-04-26

---

This file tracks completed implementation work for the Java-faithful port.

Active and upcoming work belongs in `PLAN.md`.
Features not present in the original Java source belong in `ADDITIONS_FROM_SOURCE.md`.

---

## Phase 0: Project Setup
- [x] Clone original Save-the-Princess Java source
- [x] Initialize Save-the-Princess-Web repo
- [x] Create index.html, CLAUDE.md, PLAN.md, .gitignore
- [x] Copy assets from original repo:
  - [x] `art/` -> `img/` (all subdirs: guy, guard, dog, wizard, knight, princess, menu, misc, final, tiles, pointers, nopointers)
  - [x] `art/tileset1.png`, `art/guard1set.png`, `art/wizard1set.png` -> `img/`
  - [x] `snd/` -> `snd/` (all .ogg and .wav files)
  - [x] `data/` -> `data/` (all .tmx level files + levels.dat)
- [x] Create placeholder JS files for all source modules (see Phase 1+)

---

## Phase 1: Boot & Scaffolding

### 1a. Main.js - Phaser 3 config + scene list
Mirrors `STPGame.java` / `STPView.java`.
- [x] Create Phaser.Game config: 625x625, WebGL, backgroundColor #000
- [x] Register scenes: BootScene, MenuScene, GameScene, AnimationScene
- [x] BootScene: preload ALL assets (images, audio, tilemaps), then start MenuScene
  - [x] Load all guy sprites (standdown/up/left/right, walk variants)
  - [x] Load all guard sprites (8 directions x 2 walk frames + 4 stand)
  - [x] Load all dog sprites (4 directions x up-to-3 frames)
  - [x] Load all wizard sprites (8 directional shoot/stand frames)
  - [x] Load knight sprites (4 directions x up-to-3 frames)
  - [x] Load princess sprites (princess1.png, princess2.png from art/princess/)
  - [x] Load misc sprites (crate, bars, keydoor, key frames, torch frames, window frames, etc.)
  - [x] Load menu images (menu.png, loader.png, loadercursor.png, etc.)
  - [x] Load final/cutscene images (creditscreen, creditslist, firstend2, firstview, etc.)
  - [x] Load tileset image for tilemaps (tileset1.png)
  - [x] Load all audio: music (menu1, main1, boss, wind, credits) + SFX
  - [x] Load all TMX tilemaps as raw XML (parsed in Level.js, Phase 2a)
- [x] Show simple progress bar during preload (mirrors original loading bar)

### 1b. SoundManager.js
Mirrors `SoundManager.java`.
- [x] `play(id)` - stop current music, start looping new track
- [x] `stop()` - stop current music
- [x] `sfx(id)` - play one-shot sound effect
- [x] Music IDs: menu1, main1, boss, wind, credits (main2 not present in assets)
- [x] SFX IDs: win1, die1, dogbark, menuchange, hey, gate, getkey, unlockdoor, fireball, standandfight

### 1c. TimerCounter.js
Mirrors `TimerCounter.java`.
- [x] Fields: `tenms`, `sec`, `min`, `abs` (centiseconds total)
- [x] `start()` / `stop()` / `reset()`
- [x] `tick(delta)` - increment using Phaser delta time (call from update loop)
- [x] `getCurTime()` -> "min:sec:tenms" string
- [x] `getRecTime(levelName)` -> developer record in centiseconds (hardcoded per level)
- [x] `gettime(levelName)` / `writetime(levelName, time)` via localStorage
  - [x] Only update if new time < existing best

### 1d. SaveReader.js
Mirrors `SaveReader.java`.
- [x] Level sequence: ['Level1','Level2','Level3','Level4','Level5','Level6','End']
- [x] `newGame()` -> reset to Level1, write to localStorage
- [x] `loadGame()` -> read current level from localStorage
- [x] `nextLevel()` -> advance index, write to localStorage
- [x] `writeSaveCurrent(levelName)` -> persist current level
- [x] Use localStorage key "stpsave" (replaces save.dat)

### 1e. ListContainer.js
Mirrors `ListContainer.java`.
- [x] Simple container: `{ staticslist: [], enemylist: [], objectlist: [] }`

### 1f. Menu.js - title screen + level loader
Mirrors `Menu.java`.
- [x] Sub-states: `inmenuimg` (title), `inloaderimg` (new/load/times)
- [x] `inmenuimg` state:
  - [x] Display menu.png fullscreen (uses `menunew` key)
  - [x] Fresh boot auto-plays `TitleScreenAnimation`, then SPACE advances from the title menu to the loader
- [x] `inloaderimg` state:
  - [x] Display loader.png with cursor (loadercursor.png)
  - [x] Cursor positions: 0=New Game, 1=Load Game, 2=Times, 3=Times display
  - [x] UP/DOWN arrow keys move cursor
  - [x] ENTER/SPACE selects
  - [x] Times display: show all 6 level best times, highlight green if beat dev record
  - [x] New Game -> `save.newGame()` -> start Level1
  - [x] Load Game -> `save.loadGame()` -> start saved level
  - [x] ESC goes back from loader to menu image
- [x] `menuchange` SFX on cursor move
- [x] Integration:
  - [x] Added `import SoundManager`, `SaveReader`, `Menu` to `Main.js`
  - [x] Added `export default` to `SaveReader.js` and `ListContainer.js` (were missing)
  - [x] Added `import TimerCounter` to `Menu.js` (was missing, caused ReferenceError)
  - [x] Added `space2start` and `timesmenu` preloads to `BootScene`
  - [x] Replaced placeholder `MenuScene` class with real implementation that instantiates `Menu`, calls `menu.create()` / `menu.update()`, starts music

---

## Phase 2: Core Game Loop

### 2a. Level.js base class
Mirrors `Level.java`.
- [x] `constructor(scene)` - set scene ref, init screen grid
- [x] `async init()` - TMX files parsed via `_parseTMXInto(cacheKey, x, y)` in subclasses
  - [x] TMX data read from Phaser XML cache (`scene.cache.xml.get(key)`)
  - [x] Tile properties parsed from `<tileset><tile>` elements
  - [x] Layer data decoded: base64+gzip -> uint32 GID array via `DecompressionStream`
- [x] `createMasterList(sx, sy)` - for each screen, builds `masterList[x][y]` (`ListContainer`)
- [x] `createStatics(mapX, mapY)` - `{x,y,width:25,height:25}` rects for `wall=true` tiles
- [x] `createEnemies(mapX, mapY)` - Dog, Guard, Wizard, KnightBoss
- [x] `createObjects(mapX, mapY)` - all interactive objects (GuardPath, Princess, Crate, Door, DoorButton, Key, KeyDoor, Exit, Window, Torch, Tracker, KnightBossInitialActivate, KnightBossSpawn, FinalCutscene)
- [x] `createPlayer(mapX, mapY)` -> `{x, y}` spawn (separate from createObjects, mirrors Java)
- [x] `getActiveList(x, y)` -> `masterList[x][y]`
- [x] `mapsong` property set in each subclass
- [x] Level6 mapsong is `main1` (matches Java source); boss music starts via KnightBossInitAnimation

### 2b. Level1-Level6 subclasses
- [x] Level1.js: 1x1, `data/level1.tmx`, music: main1
- [x] Level2.js: 1x1, `data/level2.tmx`, music: main1
- [x] Level3.js: 1x1, `data/level3.tmx`, music: main1
- [x] Level4.js: 2x2, `data/level4(X-Y).tmx` grid, music: main1
- [x] Level5.js: 1x3, `data/level5(0-Y).tmx` vertical stack, music: main1
- [x] Level6.js: 2x2, `data/level6(X-Y).tmx` grid, music: main1
- [x] `createLevel(scene, levelName)` factory function in Main.js
- [x] All enemy/other placeholder files given `export default class` stubs so imports resolve

### 2c. Player.js
Mirrors `Player.java`.
- [x] Fields: `x, y` (spawn+6, spawn-2), `hitbox` (15x15 at XCOMP=0, YCOMP=10), `lastdirection` (1=down,2=right,3=left,4=up)
- [x] Fields: `haskey: boolean`
- [x] `imageinit(scene)` - create 8 Phaser animations (stand: 1 frame; walk: 4 frames at 4fps mirroring Java's {walk,stand,walk2,stand} at 250ms)
- [x] `update(game)`: arrow+WASD, 1px/frame, collision revert, `game.seeme=false` on move, animation switching
- [x] `render()`: `sprite.setPosition()`, haskeySprite show/position
- [x] `_staticCollision(list)`: AABB rect intersection

### 2d. STPView.js - main GameScene
Mirrors `STPGame.java`.
- [x] `async loadlevel()`: `await level.init()`, createPlayer, imageinit, createMasterList, changeloc, play music, seeme=true/seemecounter=26, start timer, create UI sprites
- [x] `changeloc()`: loads staticsList/enemyList/objectList from masterList, rebuilds tilemap
- [x] `update(delta)`: player, enemy, object updates; hitbox collision checks; seeme blink counter; timer tick; _render()
- [x] `_render()`: player.render(), enemy/object render(), seeme arrow (blink: visible when seemecounter<25), timer HUD text
- [x] `_rebuildTilemap(mapX, mapY)`: destroys old Phaser Tilemap, builds new one from 2D tile-index array using `scene.make.tilemap()` + `addTilesetImage` + `createLayer`
- [x] GameScene in Main.js: async create(), `await stpview.loadlevel()`, `isReady` guard, `stpview.update(delta)` each frame

---

## Phase 3: Enemies & Objects

### 3a. Enemy.js base class
- [x] Base enemy LOS, collision, render, hide, and subclass update hooks implemented

### 3b. Dog.js
- [x] Detection, bark, chase, collision bounce-back, and notice emote behavior implemented

### 3c. Guard.js
- [x] Patrol, LOS chase, question search state, stuck handling, and GuardPath support implemented

### 3d. Wizard.js
- [x] LOS-based firing state, wizard animations, and fireball spawn timing implemented

### 3e. Fireball.js
- [x] Projectile movement, animation, collision cleanup, and player kill behavior implemented

### 3f. KnightBoss.js
- [x] Tracker-driven pursuit, movement, activation, and emote cycle implemented

### 3g. Other objects
- [x] Door, DoorButton, Key, KeyDoor, Exit, GuardPath, Crate, Princess, Torch, Window, Tracker, KnightBossInitialActivate, KnightBossSpawn, and FinalCutscene implemented

---

## Phase 4: Cutscenes & End Sequences

- [x] `AnimationManager.js` implemented
- [x] `TitleScreenAnimation.js` implemented
- [x] `DeathAnimation.js` implemented
- [x] `CrushedAnimation.js` implemented
- [x] `WinAnimation.js` implemented
- [x] `KnightBossInitAnimation.js` implemented
- [x] `FinalTowerLedgeActiveAnimation.js` implemented
- [x] `CreditScrollAnimation.js` implemented

---

## Phase 5: Polish & Final Integration

### 5a. Controls
- [x] Keyboard: arrow keys + WASD for movement, SPACE/ENTER for confirm/skip
- [x] Pause support (ESC)

### 5b. Screen management
- [x] `seeme` indicator on level start
- [x] Timer display in-game
- [x] Key indicator overlay on player when `hasKey=true`

### 5c. Debug / Dev tools
- [x] Optional hitbox rendering toggle
- [x] Level skip shortcut for testing

---

## Completed Notes

Update 2026-04-12: Fixed `Level.createObjects()` to pass `this.scene` into interactive object constructors that create Phaser display objects immediately. This resolves the `Torch.js:16` `scene.add` crash and prevents the same failure in `Window`, `Door`, `DoorButton`, `Key`, `KeyDoor`, `Exit`, `Crate`, and `Princess`.

Update 2026-04-12: Phase 5 audit confirmed keyboard controls plus the `seeme`, timer, and key overlays were already live. Added the remaining 5a-5c items in `STPView`: `ESC` pause, `H` hitbox toggle, and `N` level skip.

Update 2026-04-12: Added boot-time trimmed tilemap textures for `tileset1`, `guard1set`, and `wizard1set`, and routed TMX tileset loading through those `_tilemap` keys. This removes Phaser's "Image tile area not tile size multiple" warning spam without changing gameplay assets.

Update 2026-04-12: Corrected the debug `N` shortcut at the end of `Level6`. It now enters the existing final tower ledge ending sequence instead of skipping straight to `End`, and pressing `N` during the ledge or credit scroll ending scenes now returns directly to the main menu.

Update 2026-04-19: Added editor-play data preservation safeguards. Death/crush animation completion now restarts `GameScene` with the same custom editor level data instead of falling back to the campaign save. Editor play also returns to `LevelEditorScene` with level data and undo/redo stacks for win/final-animation exits and the debug skip path.

Update 2026-04-19: Made editor session persistence explicit. The editor now caches and restores the workspace when leaving to the title/menu and opening the editor again, including multi-screen `levelData`, current screen, selected tool, palette selection, palette scroll, pointer-label visibility, and undo/redo stacks. Editor play carries the same session object through `GameScene`, and editor scene shutdown also saves the session as a safeguard for future exit paths. Grid resize now clears undo/redo because resize is not currently undoable and stale undo entries can point at removed screens.

Update 2026-04-19: Extended the in-game `seeme` / where-am-I prompt. It appears after 3 seconds if no player movement has been observed since the level started, and after 20 seconds without player movement once movement has been observed in that level. Keyboard movement and virtual D-pad movement from mouse/touch share the same `Player.update()` activity hook.

Update 2026-04-19: Fixed virtual D-pad placement on touch screens. `GameScene` now passes the Phaser pointer directly to `VirtualControls.showAtPointerAndTrack()`, which uses one shared pointer-to-canvas coordinate path for mouse and touch, then clamps the D-pad fully inside the game canvas.

Update 2026-04-19: Added viewport fitting for small screens. The page now hosts Phaser in `#game-container` and uses `Phaser.Scale.FIT` with `CENTER_BOTH` so the game keeps its 625x625 internal coordinate system while the displayed canvas scales down to fit phones and small browser windows. The page and container hide overflow so the fitted canvas never creates browser scrollbars.

---

## Completed Additions Migrated From PLAN.md

Moved here on 2026-04-19 so `PLAN.md` can stay active-only.

### Addition Phase 8 — Save points
- [x] Verified `tileset1` local tile `24` was unused in all bundled `.stplevel.json` levels.
- [x] Replaced that tile's old canonical wall behavior with `{ savepoint: 'true' }`.
- [x] Added `SavePoint` as a non-source runtime object with glowing inactive and dim activated blue diamond states.
- [x] Added editor pointer label `SV` and palette name `Save point`.
- [x] Added checkpoint capture on first save point touch only.
- [x] Death and crush animation restarts now restore the captured checkpoint snapshot when one exists.
- [x] Pause-menu Reset still clears the checkpoint and rebuilds the level from the original spawn.

### Addition Phase 1 — Menu list refactor (Phaser text only)
- [x] Refactored `Menu.js` loader state around a single `entries` array.
- [x] Added scroll-window infrastructure for future menu growth.
- [x] Replaced baked-in loader text with Phaser text labels.
- [x] Kept `loadercursor` tracking the selected entry from text positions.
- [x] Added a `LEVEL EDITOR` main-menu entry.
- [x] Registered a `LevelEditorScene` entry point in the scene list.
- [x] Replaced the old index-3 Times-screen hack with `inTimesScreen`.

### Addition Phase 1.5 — Menu pointer / touch support
- [x] Added pointer input for the title screen, loader entries, Times screen, and editor stub.
- [x] Unified mouse and touch through Phaser pointer events.

### Addition Phase 2 — Level file format + import/export library
- [x] Extracted TMX parsing into `src/editor/TmxParser.js`.
- [x] Added `src/editor/StpLevelFormat.js` for custom-level JSON conversion and validation.
- [x] Migrated bundled Level 1–6 data to `.stplevel.json`.
- [x] Added `Level._loadStpLevelInto(path)` and switched `Level1`–`Level6` to load JSON.
- [x] Removed runtime TMX loading from boot; legacy `.tmx` files remain as references.
- [x] Later simplified the `.stplevel.json` format so JSON no longer persists `tileProps`; canonical tile properties are rebuilt from tilesets on load.

### Addition Phase 3 — Editor scene skeleton
- [x] Implemented `src/editor/LevelEditorScene.js`.
- [x] Added the editor layout: map canvas, palette, screen tabs, resize buttons, and action bar.
- [x] Added pointer-driven editing plus keyboard shortcuts for tools, navigation, and save.
- [x] Replaced the import placeholder with bundled-level import flow and clearer status/error feedback.

### Addition Phase 3.5 — Editor pointer-marker overlay
- [x] Added editor-only pointer-label visualization based on the historical pointer-marked art.
- [x] Added `PTR:ON` / `PTR:OFF` UI and `P` shortcut.
- [x] Kept pointer markers editor-only and out of gameplay scenes.

### Addition Phase 4 — Editing operations
- [x] Implemented Paint, Erase, Fill, Rect, and Picker tools.

### Addition Phase 5 — Save / load / play custom levels
- [x] Added Save export via `Blob` download.
- [x] Added Load import via hidden file input.
- [x] Added import of bundled default levels into the editor.
- [x] Added `Play` from the editor into `GameScene` with custom level data.
- [x] Added `GameScene` support for either campaign levels or a parsed custom level object.

### Addition Phase 6 — `CustomLevel` runtime
- [x] Added `src/levels/CustomLevel.js`.
- [x] Reused base `Level` object/enemy/static pipelines for custom levels.
- [x] Kept `Level1`–`Level6` classes intact.

### Addition Phase 6.5 — In-game pause menu
- [x] Replaced the old pause text with a loader-style pause menu.
- [x] Added Resume, Reset, and Exit actions with campaign/editor-aware exit behavior.
- [x] Kept debug keys unchanged.

### Addition Phase 6.75 — In-game virtual controls (touch / mouse)
- [x] Added a DOM-overlay virtual D-pad for click/touch play.
- [x] Added shared pointer placement, multi-touch handling, and keyboard-aware hide/show behavior.
- [x] Added touch/click animation skipping, input-aware title prompt text, and outside-click loader dismissal.
- [x] Added fitted small-screen viewport scaling without browser scrollbars.

### Addition Phase 7 — Polish / stretch
- [x] Added undo / redo in the editor.

### Addition Notes (2026-04-19)

- Added editor-play data preservation safeguards so death/crush restarts and editor exits keep the same custom level/session data instead of falling back to campaign save flow.
- Made editor session persistence explicit across title/menu exits and editor-play round trips, including screen/tool/palette/pointer-label/undo-redo state.
- Extended the in-game `seeme` / where-am-I prompt with idle-time triggers after level start and after later inactivity.
- Fixed touch virtual D-pad placement by routing mouse/touch through one shared pointer-to-canvas path.
- Added default-level load flow and console debug commands during editor work.
- Stopped persisting `tileProps` in custom-level JSON. Bundled levels and editor exports now serialize only tiles/tilesets, and canonical tile properties are reconstructed on load.

### Fix Notes (2026-04-23)

- Added guarded exit screen transitions so attempts to enter missing map coordinates log the missing `(x, y)` and leave the current screen active instead of crashing.
- Removed stale runtime wall flags from right, left, and up exit tile metadata so those exits can be entered like the down exit.
- Removed the stale runtime wall flag from key tile metadata; key doors remain Java-faithful by adding/removing their blocking static from `KeyDoor`.

### Fix Notes (2026-04-26)

- Editor-play `finalTowerLedge` completion now returns directly to the preserved `LevelEditorScene` session; normal campaign play still continues from the ledge into the credits scroll.
- Rebuilt the Times screen with Phaser text rows for level labels, player best times, and developer best times; unfinished levels display `none`, and player times turn green only when they beat the developer record.
- Added browser-side controls help text in the bottom-right corner, with movement help switching between arrow/WASD keyboard input and virtual joypad pointer mode.
- Expanded the virtual joypad overlay to the full browser viewport so pointer placement is no longer constrained by the Phaser canvas rectangle.
- Added a gameplay-only window pointer listener so off-canvas page clicks can create the virtual joypad, while scene shutdown removes the listener.
- Pause menu selection now accepts Space as well as Enter.
- Developer best times were relaxed by 5 seconds per level.
