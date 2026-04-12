# Save the Princess — HTML5 Port Development Plan

**Last Updated**: 2026-04-12

---

## Phase 0: Project Setup
- [x] Clone original Save-the-Princess Java source
- [x] Initialize Save-the-Princess-Web repo
- [x] Create index.html, CLAUDE.md, PLAN.md, .gitignore
- [x] Copy assets from original repo:
  - [x] `art/` → `img/` (all subdirs: guy, guard, dog, wizard, knight, princess, menu, misc, final, tiles, pointers, nopointers)
  - [x] `art/tileset1.png`, `art/guard1set.png`, `art/wizard1set.png` → `img/`
  - [x] `snd/` → `snd/` (all .ogg and .wav files)
  - [x] `data/` → `data/` (all .tmx level files + levels.dat)
- [x] Create placeholder JS files for all source modules (see Phase 1+)

---

## Phase 1: Boot & Scaffolding

### 1a. Main.js — Phaser 3 config + scene list
Mirrors `STPGame.java` / `STPView.java`.
- [x] Create Phaser.Game config: 625×625, WebGL, backgroundColor #000
- [x] Register scenes: BootScene, MenuScene, GameScene, AnimationScene
- [x] BootScene: preload ALL assets (images, audio, tilemaps), then start MenuScene
  - [x] Load all guy sprites (standdown/up/left/right, walk variants)
  - [x] Load all guard sprites (8 directions × 2 walk frames + 4 stand)
  - [x] Load all dog sprites (4 directions × up-to-3 frames)
  - [x] Load all wizard sprites (8 directional shoot/stand frames)
  - [x] Load knight sprites (4 directions × up-to-3 frames)
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
- [x] `play(id)` — stop current music, start looping new track
- [x] `stop()` — stop current music
- [x] `sfx(id)` — play one-shot sound effect
- [x] Music IDs: menu1, main1, boss, wind, credits (main2 not present in assets)
- [x] SFX IDs: win1, die1, dogbark, menuchange, hey, gate, getkey, unlockdoor, fireball, standandfight

### 1c. TimerCounter.js
Mirrors `TimerCounter.java`.
- [x] Fields: `tenms`, `sec`, `min`, `abs` (centiseconds total)
- [x] `start()` / `stop()` / `reset()`
- [x] `tick(delta)` — increment using Phaser delta time (call from update loop)
- [x] `getCurTime()` → "min:sec:tenms" string
- [x] `getRecTime(levelName)` → developer record in centiseconds (hardcoded per level)
- [x] `gettime(levelName)` / `writetime(levelName, time)` via localStorage
  - Only update if new time < existing best

### 1d. SaveReader.js
Mirrors `SaveReader.java`.
- [x] Level sequence: ['Level1','Level2','Level3','Level4','Level5','Level6','End']
- [x] `newGame()` → reset to Level1, write to localStorage
- [x] `loadGame()` → read current level from localStorage
- [x] `nextLevel()` → advance index, write to localStorage
- [x] `writeSaveCurrent(levelName)` → persist current level
- [x] Use localStorage key "stpsave" (replaces save.dat)

### 1e. ListContainer.js
Mirrors `ListContainer.java`.
- [x] Simple container: `{ staticslist: [], enemylist: [], objectlist: [] }`

### 1f. Menu.js — title screen + level loader
Mirrors `Menu.java`. **Module written but NOT wired up — see "Known Wiring Gaps" below.**
- [x] Sub-states: `inmenuimg` (title), `inloaderimg` (new/load/times)
- [x] `inmenuimg` state:
  - [x] Display menu.png fullscreen (uses `menunew` key)
  - [~] SPACE advances to loader — **title screen animation (TitleScreenAnimation) not yet hooked up; goes straight to loader**
- [x] `inloaderimg` state:
  - [x] Display loader.png with cursor (loadercursor.png)
  - [x] Cursor positions: 0=New Game, 1=Load Game, 2=Times, 3=Times display
  - [x] UP/DOWN arrow keys move cursor
  - [x] ENTER/SPACE selects
  - [x] Times display: show all 6 level best times, highlight green if beat dev record
  - [x] New Game → `save.newGame()` → start Level1
  - [x] Load Game → `save.loadGame()` → start saved level
  - [x] ESC goes back from loader to menu image
- [x] `menuchange` SFX on cursor move
- [x] **Integration:**
  - [x] Added `import SoundManager`, `SaveReader`, `Menu` to `Main.js`
  - [x] Added `export default` to `SaveReader.js` and `ListContainer.js` (were missing)
  - [x] Added `import TimerCounter` to `Menu.js` (was missing, caused ReferenceError)
  - [x] Added `space2start` and `timesmenu` preloads to `BootScene`
  - [x] Replaced placeholder `MenuScene` class with real implementation that instantiates `Menu`, calls `menu.create()` / `menu.update()`, starts music
  - [ ] Manually test menu flow via `python -m http.server 8000`: title → loader → new game / load / times / ESC back

---

## Phase 2: Core Game Loop

### 2a. Level.js base class
Mirrors `Level.java`.
- [x] `constructor(scene)` — set scene ref, init screen grid
- [x] `async init()` — TMX files parsed via `_parseTMXInto(cacheKey, x, y)` in subclasses
  - [x] TMX data read from Phaser XML cache (`scene.cache.xml.get(key)`)
  - [x] Tile properties parsed from `<tileset><tile>` elements
  - [x] Layer data decoded: base64+gzip → uint32 GID array via `DecompressionStream`
- [x] `createMasterList(sx, sy)` — for each screen, builds `masterList[x][y]` (ListContainer)
- [x] `createStatics(mapX, mapY)` — `{x,y,width:25,height:25}` rects for `wall=true` tiles
- [x] `createEnemies(mapX, mapY)` — Dog, Guard, Wizard, KnightBoss
- [x] `createObjects(mapX, mapY)` — all interactive objects (GuardPath, Princess, Crate, Door, DoorButton, Key, KeyDoor, Exit, Window, Torch, Tracker, KnightBossInitialActivate, KnightBossSpawn, FinalCutscene)
- [x] `createPlayer(mapX, mapY)` → `{x, y}` spawn (separate from createObjects, mirrors Java)
- [x] `getActiveList(x, y)` → `masterList[x][y]`
- [x] `mapsong` property set in each subclass
- Note: Level6 mapsong is 'main1' (matches Java source); boss music starts via KnightBossInitAnimation

### 2b. Level1–Level6 subclasses
- [x] Level1.js: 1×1, `data/level1.tmx`, music: main1
- [x] Level2.js: 1×1, `data/level2.tmx`, music: main1
- [x] Level3.js: 1×1, `data/level3.tmx`, music: main1
- [x] Level4.js: 2×2, `data/level4(X-Y).tmx` grid, music: main1
- [x] Level5.js: 1×3, `data/level5(0-Y).tmx` vertical stack, music: main1
- [x] Level6.js: 2×2, `data/level6(X-Y).tmx` grid, music: main1
- [x] `createLevel(scene, levelName)` factory function in Main.js
- [x] All enemy/other placeholder files given `export default class` stubs so imports resolve

### 2c. Player.js
Mirrors `Player.java`.
- [x] Fields: `x, y` (spawn+6, spawn-2), `hitbox` (15×15 at XCOMP=0, YCOMP=10), `lastdirection` (1=down,2=right,3=left,4=up)
- [x] Fields: `haskey: boolean`
- [x] `imageinit(scene)` — create 8 Phaser animations (stand: 1 frame; walk: 4 frames at 4fps mirroring Java's {walk,stand,walk2,stand} at 250ms)
- [x] `update(game)`: arrow+WASD, 1px/frame, collision revert, `game.seeme=false` on move, animation switching
- [x] `render()`: `sprite.setPosition()`, haskeySprite show/position
- [x] `_staticCollision(list)`: AABB rect intersection

### 2d. STPView.js — main GameScene
Mirrors `STPGame.java`.
- [x] `async loadlevel()`: `await level.init()`, createPlayer, imageinit, createMasterList, changeloc, play music, seeme=true/seemecounter=26, start timer, create UI sprites
- [x] `changeloc()`: loads staticsList/enemyList/objectList from masterList, rebuilds tilemap
- [x] `update(delta)`: player, enemy, object updates; hitbox collision checks; seeme blink counter; timer tick; _render()
- [x] `_render()`: player.render(), enemy/object render(), seeme arrow (blink: visible when seemecounter<25), timer HUD text
- [x] `_rebuildTilemap(mapX, mapY)`: destroys old Phaser Tilemap, builds new one from 2D tile-index array using `scene.make.tilemap()` + `addTilesetImage` + `createLayer`
- [x] GameScene in Main.js: async create(), `await stpview.loadlevel()`, `isReady` guard, `stpview.update(delta)` each frame
- Note: `animationManager` wired as null — death/crush/win triggers are no-ops until Phase 4

---

## Phase 3: Enemies & Objects

### 3a. Enemy.js base class
Mirrors `Enemy.java`.
- [x] Fields: `x, y`, `hitbox` (Rectangle), `sprite`, `emoteSprite`, `killerimg`
- [x] `los(direction, game)` — expand rectangle from position in given direction until:
  - Hits a static → stop, return false
  - Contains player hitbox → return true
- [x] `viewboxstatichit(viewbox, staticslist)` — returns false if any static intersects (mirrors Java inverted naming)
- [x] `render()` — setVisible(true), setPosition
- [x] `hide()` — setVisible(false) on sprite + emoteSprite (called on screen transition)
- [x] `update(game)` — no-op base, override in subclass

### 3b. Dog.js
Mirrors `Dog.java`.
- [x] Fields: `orientation` (0=down,1=right,2=left,3=up), `notice`, `noticereturn`, `counter`
- [x] `imageinit(scene)` — register shared Phaser animations (once), create sprite + emoteSprite initially hidden
- [x] `update(game)`:
  - [x] Increment `counter`; every 5 frames, check LOS in `orientation` direction
  - [x] LOS hit → set `notice=true`, play `dogbark` SFX once, set walk animation
  - [x] `notice` state: move 2px/frame in `orientation` via `_noticeRun()`
  - [x] If dog hitbox hits a static while chasing → switch to `noticereturn`, reverse 3 steps, set return animation
  - [x] `noticereturn`: move 1px/frame backward via `_noticeReturnRun()`; if hits static, stop and stand
  - [x] Display notice emote while `notice` is active
- [x] `_centerme()` — offset position based on orientation for correct sprite alignment
- [x] Level.js updated to pass `this.scene` to Dog (and Guard/Wizard/KnightBoss) constructors
- [x] STPView.changeloc() updated to hide outgoing screen entities before switching

### 3c. Guard.js
Mirrors `Guard.java`.
- [x] Fields: `orientation`, `chase`, `questioncounter`, `stuckcounter`, `counter`
- [x] Animations: 4 stand + 4 walk (walkdown/up 4-frame, walkleft/right 2-frame) + search (4-frame cycle)
- [x] Emote sprites: notice (chasing), question (searching), help (stuck)
- [x] `update(game)`:
  - [x] Every 10 frames: check LOS in orientation → if hit and not chasing, set `chase=true`, play `hey` SFX
  - [x] `chase` state: move 1px or 2px/frame (counter%3 determines); if hits wall → questioncounter=100, step back 4px, chase=false, stuckcounter++
  - [x] `stuckcounter > 3 && in wall` → freeze (stuck guard overrides all)
  - [x] Question state (questioncounter > 0): scan all 4 directions for LOS each frame; questioncounter decrements in render(); reverse orientation on last 2 frames
  - [x] Patrol hit wall: step back 1px, rotate orientation (0→2,1→0,2→3,3→1), stuckcounter++
  - [x] Normal patrol: `_insidepathchangesq()` checks GuardPath tiles (type 99), changes orientation; move 1px if no stop flag
- [x] GuardPath.js: implemented with `getType()=99`, `getOrientation()`, `isStop`, 25×25 hitbox

### 3d. Wizard.js
Mirrors `Wizard.java`.
- [x] Fields: `orientation`, `fireballtimer`, `isfiring`
- [x] Animations: stand and shoot variants for all 4 directions (stand: 1 frame static; shoot: 2 frames at 2.5fps)
- [x] Also registers fireball animations (`fb_down/up/left/right`, 3 frames at 5fps) so Fireball can use them
- [x] `update(game)`:
  - [x] Check LOS in `orientation` direction every frame
  - [x] If LOS: set `isfiring=true`, increment `fireballtimer`; if > 35 → play `fireball` SFX, spawn Fireball, reset to 0
  - [x] If no LOS: set `isfiring=false`
- [x] `imgupdate()` — switch animation: if `isfiring` use shoot anim, else stand anim
- [x] Emote (notice.png) shown at (x+8, y-10) while isfiring

### 3e. Fireball.js
Mirrors `Fireball.java`.
- [x] Fields: `orientation`, `_extraspdcounter`
- [x] `getType()` = 27
- [x] Hitbox: 9×9 at (x+2, y+2)
- [x] Animations: directional fireball sprites (`fb_down/up/left/right`) registered by Wizard
- [x] `killerimg` = 'fireballkiller'
- [x] `update(game)`:
  - [x] Move 1px/frame in `orientation`; extra 1px every 3rd frame (`_extraspdcounter > 2`)
  - [x] `_hitboxupdate()` after each move
  - [x] If hitbox hits a static → destroy sprite, splice self from `game.enemyList`
- [x] Kills player via enemyList hitbox check in STPView (same as all enemies)

### 3f. KnightBoss.js
Mirrors `KnightBoss.java`.
- [ ] Fields: `basicX, basicY` (grid cell 0–24), `x, y`, `hitbox`, `walkbox` (20×21), `orientation`, `activated`, `emoteTimer`
- [ ] Animations: 4-direction walk (2–3 frames each)
- [ ] Emote images: fight.png, coward.png (from art/misc/)
- [ ] `update(game)`:
  - [ ] If not `activated`, skip
  - [ ] `getBasicLoc()`: determine 25×25 grid cell from `walkbox` center
  - [ ] `getCurrentTarget()` via Tracker: check 4 adjacent cells, move toward highest `steptime`
  - [ ] Move 1px/frame in determined direction, update `orientation`
  - [ ] Emote cycle: `emoteTimer++`; fight emote at 400–500, coward emote at 1000–1100, reset at 1700
- [ ] `getTracker(game)` — find Tracker object (type 67) in objectList

### 3g. Other/ objects

#### Door.js (type 51)
- [ ] Fields: `isClosed`, `hasAddedRect`
- [ ] `update(game)`: on first frame if `isClosed`, add `hitbox` rect to `staticsList`
- [ ] `openOrClose(game)`: toggle `isClosed`, add/remove rect from `staticsList`
- [ ] `render()`: draw bars.png if `isClosed`

#### DoorButton.js
- [ ] Fields: `isStep` (prevents re-trigger)
- [ ] Hitbox: 12×10 at (x+6, y+6)
- [ ] `update(game)`: check player overlap OR any non-fireball enemy overlap
  - [ ] On first step: set `isStep=true`, find all Door objects (type 51), call `door.openOrClose()` on each
- [ ] `render()`: draw pressed/unpressed image

#### Key.js
- [ ] 6-frame rotation animation (200ms/frame)
- [ ] Hitbox: 9×18
- [ ] `update(game)`: if player overlaps and `!player.hasKey` → set `player.hasKey=true`, play `getkey` SFX, remove self

#### KeyDoor.js
- [ ] Fields: `active`, `hasAddedRect`
- [ ] Hitbox: 27×27 (oversized for detection)
- [ ] `update(game)`: add static on first frame if `active`; if player overlaps with key → call `removeme()`
- [ ] `removeme(game)`: remove static, set `active=false`, remove self from objectList, play `unlockdoor` SFX
- [ ] `render()`: draw keydoor.png if `active`

#### Exit.js
- [ ] Fields: `direction` ("up"/"down"/"left"/"right")
- [ ] Hitbox: 25×8 (horizontal exits) or 8×25 (vertical exits)
- [ ] `update(game)`: if player overlaps hitbox:
  - [ ] Teleport player to opposite edge
  - [ ] Update `game.locationX` / `game.locationY`
  - [ ] Call `game.changeloc()`
- [ ] Direction logic:
  - up → `locationY++`, player Y = 591
  - down → `locationY--`, player Y = 9
  - left → `locationX--`, player X = 591
  - right → `locationX++`, player X = 9
- [ ] `render()`: draw exit pointer arrow (25 frames on, 25 frames off per 50-frame cycle)

#### GuardPath.js (type 99)
- [ ] Fields: `orientation`, `isStop`
- [ ] Hitbox: 25×25 (one tile)
- [ ] No render (invisible waypoint)
- [ ] Data only — Guard reads these in `insidePathChangeSq()`

#### Crate.js
- [ ] Fields: `hitbox` (20×20), push edge rects (pushleft/right/up/down, 2–3px wide)
- [ ] `update(game)`: add hitbox to staticsList each frame
- [ ] `canDir(direction, game)` — test if push direction is clear (no statics/enemies)
- [ ] `createPushBoxes()` — define 4 edge detection rects
- [ ] Push detection: player overlap with edge rect + movement in correct direction + `canDir()` → move crate
- [ ] `render()`: draw crate.png

#### Princess.js (type 23)
- [ ] 2-frame standing animation (800ms/frame)
- [ ] `hit(game)`: trigger WinAnimation via AnimationManager
- [ ] `render()`: draw animation

#### Torch.js
- [ ] 6-frame animation (200ms/frame) from `art/tiles/torch/`
- [ ] No collision (hitbox 0×0)

#### Window.js
- [ ] 5-frame animation (400ms/frame): window1–5.png
- [ ] No collision

#### Tracker.js (type 67)
- [ ] Fields: `nodeMap[25][25]` of `TrackNode {activated, steptime, hitbox, pathbox}`
- [ ] Each node: 25×25 hitbox aligned to grid
- [ ] `update(game)`: for each activated? node, check if player hitbox intersects node's pathbox → set `steptime = Date.now()`
- [ ] Actually: ALL nodes check player intersection each frame; update steptime if overlapping
- [ ] `initKnightPath(direction)`: set initial breadcrumb trail from boss position in given direction

#### KnightBossInitialActivate.js
- [ ] `update(game)`: if player overlaps:
  - [ ] Start KnightBossInitAnimation via AnimationManager
  - [ ] Call `tracker.initKnightPath()` with initial direction
  - [ ] Remove self from objectList

#### KnightBossSpawn.js (extends KnightBossInitialActivate)
- [ ] `update(game)`: if player overlaps:
  - [ ] Read TMX property "knightbossdelayspawn" to get spawn position
  - [ ] Spawn KnightBoss, add to enemyList
  - [ ] Play `standandfight` SFX
  - [ ] Remove self from objectList

#### FinalCutscene.js
- [ ] `update(game)`: if player overlaps → start "finalTowerLedge" animation

---

## Phase 4: Cutscenes & End Sequences

All animations are full-screen overlays managed by AnimationManager.

### 4a. AnimationManager.js
Mirrors `AnimationManager.java`.
- [ ] `startAnimation(type, altArg)` — factory: instantiate correct animation class, set `inAnimation=true`
- [ ] `update(game)` — delegate to active animation's `update()`
- [ ] `render()` — delegate to active animation's `render()`
- [ ] `done()` — set `inAnimation=false`, resume game or transition

### 4b. TitleScreenAnimation.js (1825-frame sequence)
- [ ] Frame 0–200: Spotco logo fade in/out
- [ ] Frame 200–350: Guy and princess walk in from edges
- [ ] Frame 350–700: Standing pose with heart, guards walk toward center
- [ ] Frame 700–1200: Princess and guards walk off screen, guy moves left
- [ ] Frame 1200+: Scroll menu.png up from bottom into view
- [ ] SPACE skips to end

### 4c. DeathAnimation.js (100-frame + sound)
- [ ] Frame 50–100: Guy walking animation enters from left
- [ ] Frame 25–50: Guy dead sprite + "CAUGHT" text
- [ ] Frame 0–25: Killer image (killerimg) flies from right to center
- [ ] SPACE to skip; end → reload current level

### 4d. CrushedAnimation.js (100-frame)
- [ ] Frame 75–100: Guy walks in
- [ ] Frame 35–87: "OUCH" text
- [ ] Killer image (gate): Y = 120 + 6×(100-timer) (falls from top)
- [ ] SPACE to skip; end → reload current level

### 4e. WinAnimation.js (250-frame + sound)
- [ ] On start: stop timer, save time to high scores, play `win1` SFX
- [ ] Frame 200–250: Guy walks in from left
- [ ] Frame 100–200: Guy static at left, princess at center, guards retreat off screen
- [ ] Frame 0–150: Princess walks toward guy
- [ ] Display current time vs best time
- [ ] SPACE to advance; end → `save.nextLevel()`, load next level

### 4f. KnightBossInitAnimation.js (250-frame)
- [ ] Frame 150–250: Guy enters from left, knight enters from right, walk toward each other
- [ ] Frame 50–150: Both static, "WE MUST FIGHT" text displayed
- [ ] Frame 0–50: Knight rushes toward guy
- [ ] SPACE to skip; end → play `standandfight` SFX, set `boss.activated = true`

### 4g. FinalTowerLedgeActiveAnimation.js (interactive)
- [ ] Background: firstview.png + firstviewrail.png (parallax foreground)
- [ ] Princess static animation at center
- [ ] Player sprite with directional walk, controlled by left/right arrow keys
- [ ] Player X clamped at 543 (right boundary)
- [ ] Real-time timer overlay displayed
- [ ] If player reaches princess (overlap) → start CreditScrollAnimation

### 4h. CreditScrollAnimation.js (2300+ frames)
- [ ] Scroll creditscreen.png + creditslist.png upward at variable speed
- [ ] 400-frame pause at bottom
- [ ] Postscript sequence (240 frames):
  - [ ] Notice, knight (postscriptknight.png), "WE MUST FIGHT" animated entrance/exit
  - [ ] `standandfight` SFX at postscript frame 89
- [ ] TBC screen (tbc.png) displayed for 500 frames
- [ ] End → loop to TitleScreenAnimation

---

## Phase 5: Polish & Final Integration

### 5a. Controls
- [ ] Keyboard: arrow keys + WASD for movement, SPACE/ENTER for confirm/skip
- [ ] Touch controls (optional — see original touch support)
- [ ] Pause support (ESC)

### 5b. Screen management
- [ ] `seeme` indicator (seeme.png from art/misc/) on level start for 26 frames, pointing at player
- [ ] Timer display in-game (top of screen, TimerCounter format)
- [ ] Key indicator overlay on player when `hasKey=true` (havekey.png from art/misc/)

### 5c. Debug / Dev tools
- [ ] Optional hitbox rendering toggle (mirrors `STPGame.render()` debug mode)
- [ ] Level skip shortcut (for testing)

### 5d. Final QA pass
- [ ] Play through all 6 levels
- [ ] Verify all enemy AI behaviors match original
- [ ] Verify all cutscene timings
- [ ] Verify save/load/times functionality
- [ ] Test on mobile (touch controls, viewport)
- [ ] Deploy to GitHub Pages (spotco.github.io/Save-the-Princess-Web/)

---

## Current Phase
**Phase 3 in progress.** Enemy base (3a), Dog (3b), Guard (3c), GuardPath (3g partial), Wizard (3d), Fireball (3e) all implemented. Next: KnightBoss (3f) and the interactive objects in 3g.

## Next Milestone
Phase 3f: KnightBoss.js — breadcrumb-heatmap pathfinding via Tracker.

---

## Known Notes (read before editing)

1. **Title screen animation is not wired.** `Menu.java`'s real flow is menu-image → `TitleScreenAnimation` → loader. The current `Menu.js` skips the animation and goes directly to the loader. This is intentional until Phase 4b. A `// TODO Phase 4b` comment marks the spot in `Menu.js`.
2. **GameScene is still a placeholder.** `Menu._loadGame()` calls `this.scene.scene.start('GameScene', { levelName })`. `GameScene` will receive the level name via `this.scene.settings.data.levelName` in its `create()`. Phase 2d implements the real game loop.

---

## Key Implementation Notes

- **Tile size**: 25×25 pixels everywhere (grid unit)
- **Game canvas**: 625×625 (25 tiles × 25 tiles per screen)
- **Coordinate system**: top-left origin; hitboxes specified as `{x, y, width, height}`
- **Player hitbox**: 15×15, offset 10px down from sprite top-left
- **Animation timing**: original uses Slick ms durations; port uses frame counters (decrement each `update()`)
- **Entity removal**: always iterate a copy of lists when enemies/objects may remove themselves
- **Multi-screen levels**: `locationX/locationY` index into `level.masterList[x][y]`; Exit objects trigger `changeloc()`
- **Pathfinding (KnightBoss)**: breadcrumb heatmap via Tracker; no A* needed
- **Audio**: Phaser `scene.sound.add()` for music loop; `play()` for SFX

---

**Instructions for Claude**:  
Always check this file before starting work. Work on one item at a time. After completing or making progress on a task, update the checkboxes, move items between sections if needed, and keep the phase and milestone accurate.
