# Save the Princess — HTML5 Port Development Plan

**Last Updated**: 2026-04-11

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
- [ ] Fields: `tenms`, `sec`, `min`, `abs` (centiseconds total)
- [ ] `start()` / `stop()` / `reset()`
- [ ] `tick(delta)` — increment using Phaser delta time (call from update loop)
- [ ] `getCurTime()` → "min:sec:tenms" string
- [ ] `getRecTime(levelName)` → developer record in centiseconds (hardcoded per level)
  - Level1: hardcoded record
  - Level2: hardcoded record
  - Level3: hardcoded record
  - Level4: hardcoded record
  - Level5: hardcoded record
  - Level6: hardcoded record
- [ ] `gettime(levelName)` / `writetime(levelName, time)` via localStorage
  - Only update if new time < existing best

### 1d. SaveReader.js
Mirrors `SaveReader.java`.
- [ ] Level sequence: ['Level1','Level2','Level3','Level4','Level5','Level6','End']
- [ ] `newGame()` → reset to Level1, write to localStorage
- [ ] `loadGame()` → read current level from localStorage
- [ ] `nextLevel()` → advance index, write to localStorage
- [ ] `writeSaveCurrent(levelName)` → persist current level
- [ ] Use localStorage key "stpsave" (replaces save.dat)

### 1e. ListContainer.js
Mirrors `ListContainer.java`.
- [ ] Simple container: `{ staticsList: [], enemyList: [], objectList: [] }`

### 1f. Menu.js — title screen + level loader
Mirrors `Menu.java`.
- [ ] Sub-states: `inMenuImg` (title), `inLoaderImg` (new/load/times)
- [ ] `inMenuImg` state:
  - [ ] Display menu.png fullscreen
  - [ ] SPACE triggers title screen animation (TitleScreenAnimation)
- [ ] `inLoaderImg` state (after title anim):
  - [ ] Display loader.png with cursor (loadercursor.png)
  - [ ] Cursor positions: 0=New Game, 1=Load Game, 2=Times, 3=Times display
  - [ ] UP/DOWN arrow keys move cursor
  - [ ] ENTER/SPACE selects
  - [ ] Times display: show all 6 level best times, highlight green if beat dev record
  - [ ] New Game → `save.newGame()` → start Level1
  - [ ] Load Game → `save.loadGame()` → start saved level
  - [ ] ESC goes back from loader to menu image
- [ ] `menuchange` SFX on cursor move

---

## Phase 2: Core Game Loop

### 2a. Level.js base class
Mirrors `Level.java`.
- [ ] `constructor(scene)` — set scene ref, init screen grid
- [ ] `init()` — load TMX files into `storedMap[x][y]` array
  - [ ] Support 1×1, 1×3, 2×2 screen grids (see level configs below)
  - [ ] Parse TMX via Phaser's tilemap loader
- [ ] `createMasterList()` — for each screen, call create* methods
- [ ] `createStatics(mapX, mapY)` — iterate tiles, collect tiles with `wall=true` property → `Rectangle` array
  - [ ] Each tile is 25×25 pixels; static rect = `{x: tileCol*25, y: tileRow*25, w:25, h:25}`
- [ ] `createEnemies(mapX, mapY)` — parse tile properties:
  - [ ] `dog` → new Dog(tileX, tileY, orientation)
  - [ ] `guardspawn` → new Guard(tileX, tileY, orientation)
  - [ ] `wizard` → new Wizard(tileX, tileY, orientation)
  - [ ] `knightboss` → new KnightBoss(tileX, tileY)
- [ ] `createObjects(mapX, mapY)` — parse tile properties:
  - [ ] `player` → record player spawn (x, y)
  - [ ] `princess` → new Princess(tileX, tileY)
  - [ ] `cratespawn` → new Crate(tileX, tileY)
  - [ ] `door` → new Door(tileX, tileY)
  - [ ] `doorbutton` → new DoorButton(tileX, tileY)
  - [ ] `key` → new Key(tileX, tileY)
  - [ ] `keydoor` → new KeyDoor(tileX, tileY)
  - [ ] `exit` → new Exit(tileX, tileY, direction)
  - [ ] `guardpoint` → new GuardPath(tileX, tileY, orientation, isStop)
  - [ ] `window` → new Window(tileX, tileY)
  - [ ] `torch` → new Torch(tileX, tileY)
  - [ ] `tracker` → new Tracker(tileX, tileY)
  - [ ] `bossactivate` → new KnightBossInitialActivate(tileX, tileY)
  - [ ] `bossactivatespawn` → new KnightBossSpawn(tileX, tileY)
  - [ ] `final` → new FinalCutscene(tileX, tileY)
- [ ] `getActiveList(x, y)` → return `masterList[x][y]` (ListContainer)
- [ ] `mapsong` property → music ID to play on load

### 2b. Level1–Level6 subclasses
- [ ] Level1.js: 1×1, `data/level1.tmx`, music: main1, desc: "why are there so many dogs"
- [ ] Level2.js: 1×1, `data/level2.tmx`, music: main1, desc: "buttons and doors"
- [ ] Level3.js: 1×1, `data/level3.tmx`, music: main1, desc: "your friendly introduction to crates"
- [ ] Level4.js: 2×2, `data/level4(X-Y).tmx` grid, music: main1, desc: "maximum security"
- [ ] Level5.js: 1×3, `data/level5(0-Y).tmx` vertical stack, music: main1, desc: "are u a wizard"
- [ ] Level6.js: 2×2, `data/level6(X-Y).tmx` grid, music: boss (not main1), desc: "1v1 me bicth anytiem"

### 2c. Player.js
Mirrors `Player.java`.
- [ ] Fields: `x, y`, `hitbox` (15×15 at offset y+10), `lastDirection` (1=down,2=right,3=left,4=up)
- [ ] Fields: `hasKey: boolean`
- [ ] `imageinit(scene)` — create 8 Phaser animations:
  - Stand: standdown, standup, standleft, standright (1 frame each)
  - Walk: walkdown, walkup, walkleft, walkright (2 frames each, ~100ms/frame)
- [ ] `update(game)`:
  - [ ] Poll arrow keys (or WASD)
  - [ ] Move x/y by 1px per key, update hitbox
  - [ ] Collision with staticsList: if hit, revert move
  - [ ] Set `seeme = false` on first movement
  - [ ] Select correct animation based on direction + moving/standing
- [ ] `render()`:
  - [ ] Draw sprite at (x, y)
  - [ ] If `hasKey`, draw key indicator at (x+2, y-21)

### 2d. STPView.js — main GameScene
Mirrors `STPView.java` / `STPGame.java`.
- [ ] `create()`:
  - [ ] Instantiate level (from SaveReader), call `level.init()` and `level.createMasterList()`
  - [ ] Create player at spawn position
  - [ ] Set `locationX=0, locationY=0`
  - [ ] Call `changeloc()` to load first screen's lists
  - [ ] Start level music via SoundManager
  - [ ] Init `timercounter`, start timer
  - [ ] Set `seeme = true`, `seemeTimer = 26`
- [ ] `changeloc()`:
  - [ ] Load `staticsList`, `enemyList`, `objectList` from `level.masterList[locationX][locationY]`
  - [ ] Re-init all enemies and objects for the new screen
- [ ] `update(time, delta)`:
  - [ ] `player.update(this)`
  - [ ] For each enemy: `enemy.update(this)` (iterate copy of list for safe removal)
  - [ ] For each object: `object.update(this)` (iterate copy of list for safe removal)
  - [ ] Check player–enemy hitbox intersections → trigger death animation
  - [ ] Check player–object hitbox → call `object.hit(this)`
  - [ ] Tick `timercounter`
  - [ ] Decrement `seemeTimer`; if ≤0 set `seeme=false`
- [ ] `render()` (draw order):
  1. [ ] Tilemap layer(s) for current screen
  2. [ ] All objects (objectList) — render behind player
  3. [ ] Player
  4. [ ] All enemies (enemyList)
  5. [ ] UI overlays (timer, seeme indicator, key indicator)

---

## Phase 3: Enemies & Objects

### 3a. Enemy.js base class
Mirrors `Enemy.java`.
- [ ] Fields: `x, y`, `hitbox` (Rectangle), `img` (current animation key)
- [ ] `los(direction, game)` — expand rectangle from position in given direction until:
  - Hits a static → stop, return false
  - Contains player hitbox → return true
- [ ] `viewboxStaticHit(viewbox, game)` — test viewbox against all statics
- [ ] `render(scene)` — draw current animation at (x, y)
- [ ] `update(game)` — abstract (override in subclass)

### 3b. Dog.js
Mirrors `Dog.java`.
- [ ] Fields: `orientation` (0=down,1=right,2=left,3=up), `notice`, `noticeReturn`, `counter`
- [ ] Animations: dogdown/right/left/up (idle, 1 frame), dog walk variants
- [ ] `update(game)`:
  - [ ] Increment `counter`; every 5 frames, check LOS in `orientation` direction
  - [ ] LOS hit → set `notice=true`, play `dogbark` SFX once
  - [ ] `notice` state: move 2px/frame in `orientation`
  - [ ] If no floor under dog (not in staticsList) → set `noticeReturn=true`
  - [ ] `noticeReturn`: move 1px/frame backward until back on floor
  - [ ] Display notice emote while `notice` is active
- [ ] `centerme()` — offset position based on orientation for correct sprite alignment

### 3c. Guard.js
Mirrors `Guard.java`.
- [ ] Fields: `orientation`, `chase`, `questionCounter`, `stuckCounter`, `paths` (GuardPath refs)
- [ ] Animations: 8 directional stand + 8 directional walk (2 frames each) + search
- [ ] Emote images: notice.png, question.png, help.png
- [ ] `update(game)`:
  - [ ] Every 10 frames: check LOS → if hit, set `chase=true`, play `hey` SFX once
  - [ ] `chase` state:
    - [ ] Move 2px/frame in orientation toward player
    - [ ] `stuckCounter`: increment each frame not on floor; if >3 → enter question state
    - [ ] While chasing, recheck LOS; if lost → increment question timer
  - [ ] Question state:
    - [ ] Display help emote
    - [ ] Rotate through all 4 directions checking LOS (500 frames total)
    - [ ] If LOS found → re-enter chase; otherwise → return to patrol
  - [ ] Patrol state:
    - [ ] `normalupdate()`: move 1px/frame in `orientation`
    - [ ] `insidePathChangeSq()`: if fully inside a GuardPath tile, change orientation (and stop if `isStop`)
    - [ ] If hits wall (static) → reverse orientation
- [ ] Display appropriate emote (notice on first sight, question when searching)

### 3d. Wizard.js
Mirrors `Wizard.java`.
- [ ] Fields: `orientation`, `fireballTimer`, `isFiring`
- [ ] Animations: stand and shoot variants for all 4 directions (2 frames each)
- [ ] `update(game)`:
  - [ ] Check LOS in `orientation` direction every frame
  - [ ] If LOS: set `isFiring=true`, increment `fireballTimer`
  - [ ] Every 35 frames while firing: spawn `new Fireball(x+7, y+7, orientation)`, add to `game.enemyList`
  - [ ] If no LOS: set `isFiring=false`, reset `fireballTimer`
- [ ] `imgUpdate()` — switch animation: if `isFiring` use shoot anim, else stand anim

### 3e. Fireball.js
Mirrors `Fireball.java`.
- [ ] Fields: `orientation`, `extraSpdCounter`
- [ ] Hitbox: 9×9 at (x+2, y+2)
- [ ] Animations: directional fireball sprites from `art/wizard/fb/`
- [ ] `update(game)`:
  - [ ] Move 1px/frame in `orientation`
  - [ ] `extraSpdCounter++`; if `extraSpdCounter % 3 === 0` → move 1 extra px
  - [ ] Check hitbox against staticsList → if hit, remove self from `game.enemyList`
- [ ] Does NOT trigger death (player can walk through? — check original — actually it does kill; it's in enemyList so hitbox check in STPView kills player)

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
**Phase 1** — Boot & Scaffolding

## Next Milestone
Complete Phase 1b–1f (SoundManager, TimerCounter, SaveReader, ListContainer, Menu).

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
