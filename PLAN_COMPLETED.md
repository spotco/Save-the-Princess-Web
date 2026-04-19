# Save the Princess - Completed Implementation Notes

**Last Updated**: 2026-04-12

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
