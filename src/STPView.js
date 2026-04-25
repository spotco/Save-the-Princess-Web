// STPView.js — main game logic
// Mirrors STPGame.java (the in-game state manager, not the Slick bootstrap)

import Player       from './Player.js';
import TimerCounter from './TimerCounter.js';
import AnimationManager from './AnimationManager.js';
import Dog         from './enemy/Dog.js';
import Guard       from './enemy/Guard.js';
import Wizard      from './enemy/Wizard.js';
import KnightBoss  from './enemy/KnightBoss.js';
import Fireball    from './enemy/Fireball.js';
import Door        from './other/Door.js';
import DoorButton  from './other/DoorButton.js';
import Key         from './other/Key.js';
import KeyDoor     from './other/KeyDoor.js';
import Exit        from './other/Exit.js';
import GuardPath   from './other/GuardPath.js';
import Crate       from './other/Crate.js';
import Princess    from './other/Princess.js';
import Torch       from './other/Torch.js';
import Window      from './other/Window.js';
import Tracker     from './other/Tracker.js';
import KnightBossInitialActivate from './other/KnightBossInitialActivate.js';
import KnightBossSpawn           from './other/KnightBossSpawn.js';
import FinalCutscene             from './other/FinalCutscene.js';
import SavePoint                 from './other/SavePoint.js';

export default class STPView {

    constructor(scene, level, soundManager, saveReader) {
        this.scene        = scene;
        this.level        = level;
        this.sound        = soundManager;
        this.save         = saveReader;
        this.currentLevelName = null;

        this.staticsList  = [];
        this.enemyList    = [];
        this.objectList   = [];

        this.player       = null;
        this.seeme        = false;
        this.seemecounter = 26;   // mirrors STPGame.loadlevel() initial value
        this.seemeInitialIdleMilliseconds = 3000;
        this.seemeIdleMilliseconds        = 20000;
        this.seemeIdleElapsed             = 0;
        this.seemeHasObservedInput        = false;
        this.timercounter = null;
        this.animationManager = new AnimationManager(this.scene, this);
        this.displayHitboxes = false;
        this.savePointSnapshot = null;

        // Editor-play mode: set by GameScene after construction.
        // When true, Exit returns to LevelEditorScene instead of MenuScene.
        this.isEditorPlay    = false;
        this.customLevelData = null;
        this.editorSession   = null;

        // Pause menu state
        this.pauseMenuOpen            = false;
        this.pauseMenuSelectedIndex   = 0;
        this.pauseMenuOverlay         = null;   // Graphics (blackout + panel)
        this.pauseMenuTitleText       = null;   // Phaser.Text "PAUSED"
        this.pauseMenuCursor          = null;   // loadercursor Image
        this.pauseMenuEntryTexts      = [];     // [RESUME, RESET, EXIT] Text objects
        this.pauseMenuEntryYPositions = [];     // cursor Y per entry

        // Phaser display refs
        this.currentTilemap = null;
        this.seemeSprite    = null;
        this.timerText      = null;
        this.bestTimeText   = null;
        this.pauseHudText   = null;
        this.pauseHudBg     = null;
        this.pauseHudZone   = null;
        this.pauseHudIsDown = false;
        this.pauseHudTimer  = null;
        this.pauseHudHoldStart = 0;
        this.pauseHudHoldMs    = 500;
        this.inputMode      = 'keyboard';
        this.debugGraphics  = null;
        this.keys           = null;
    }

    // async: parses level TMX, builds masterList, creates player.
    // Call once from GameScene.create() and await it.
    // Mirrors STPGame.loadlevel().
    async loadlevel() {
        if (this.isEditorPlay) {
            console.log('Loading editor level');
        } else {
            console.log('Loading level:', this.currentLevelName);
        }

        await this.level.init();

        const spawn = this.level.createPlayer(0, 0);
        this.player = new Player(spawn.x, spawn.y);
        this.player.imageinit(this.scene);

        this.level.createMasterList();
        this._hideAllScreenEntities();

        this.changeloc();  // load screen (0,0) lists + tilemap

        this.sound.play(this.level.mapsong);

        this.seeme        = false;
        this.seemecounter = 26;
        this.seemeIdleElapsed      = 0;
        this.seemeHasObservedInput = false;

        this.timercounter = new TimerCounter(this.currentLevelName);
        this.timercounter.start();

        // UI overlay sprites
        this.seemeSprite = this.scene.add.image(0, 0, 'seeme')
            .setOrigin(0, 0).setDepth(20).setVisible(false);
        this.timerText = this.scene.add.text(0, 0, '', {
            fontFamily: 'monospace', fontSize: '13px', color: '#ffff00'
        }).setDepth(20);
        this.bestTimeText = this.scene.add.text(0, 13, '', {
            fontFamily: 'monospace', fontSize: '13px', color: '#ffff00'
        }).setDepth(20);
        this.pauseHudText = this.scene.add.text(0, 26, '', {
            fontFamily: 'monospace', fontSize: '13px', color: '#ffff00'
        }).setDepth(20);
        this.pauseHudBg = this.scene.add.rectangle(0, 0, 170, 43, 0x000000, 0.55)
            .setOrigin(0, 0).setDepth(19);
        this.pauseHudZone = this.scene.add.rectangle(0, 0, 170, 43, 0x000000, 0)
            .setOrigin(0, 0).setDepth(21);
        this.debugGraphics = this.scene.add.graphics().setDepth(25);
        this.keys = this.scene.input.keyboard.addKeys({
            esc:   Phaser.Input.Keyboard.KeyCodes.ESC,
            h:     Phaser.Input.Keyboard.KeyCodes.H,
            up:    Phaser.Input.Keyboard.KeyCodes.UP,
            down:  Phaser.Input.Keyboard.KeyCodes.DOWN,
            enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
        });

        this._render();
    }

    // Load lists and rebuild tilemap for the current locationx/locationy.
    // Mirrors STPGame.changeloc().
    changeloc(mapX = this.level.locationx, mapY = this.level.locationy) {
        if (!this._hasScreenLocation(mapX, mapY)) {
            console.log('Map coordinates do not exist:', mapX, mapY);
            return false;
        }

        // Hide sprites from the outgoing screen's entities
        for (const e of this.enemyList)  { if (e.hide) e.hide(); }
        for (const o of this.objectList) { if (o.hide) o.hide(); }

        this.level.locationx = mapX;
        this.level.locationy = mapY;

        const lc = this.level.masterList[this.level.locationx][this.level.locationy];
        this.staticsList = lc.staticslist;
        this.enemyList   = lc.enemylist;
        this.objectList  = lc.objectlist;
        this._rebuildTilemap(this.level.locationx, this.level.locationy);
        return true;
    }

    // Called every frame from GameScene.update(time, delta).
    // Mirrors STPGame.update().
    update(delta) {
        if (this.animationManager && this.animationManager.inAnimation) {
            this.animationManager.update(this);
            this.animationManager.render();
            return;
        }

        if (this._handleControlHotkeys()) {
            return;
        }

        if (this.pauseMenuOpen) {
            this._render();
            return;
        }

        this._updateSeemeIdle(delta);

        this.player.update(this);

        // Update enemies (iterate by index — list may shrink mid-loop in later phases)
        for (let i = 0; i < this.enemyList.length; i++) {
            const e = this.enemyList[i];
            if (e && e.update) e.update(this);
        }
        // Update objects
        for (let i = 0; i < this.objectList.length; i++) {
            const o = this.objectList[i];
            if (o && o.update) o.update(this);
        }

        // Enemy–player collision → death animation
        for (const e of this.enemyList) {
            if (e.hitbox && _rectsIntersect(e.hitbox, this.player.hitbox)) {
                this.timercounter.stop();
                if (this.animationManager) {
                    this.animationManager.startAnimation('deathAnimation', e.killerimg);
                }
            }
        }
        // Object–player hit
        for (const o of this.objectList) {
            if (o.hitbox && _rectsIntersect(o.hitbox, this.player.hitbox)) {
                if (o.hit) o.hit(this);
            }
        }

        // seeme blink counter — mirrors STPGame.update()
        if (this.seeme) this.seemecounter++;
        if (this.seemecounter > 50) this.seemecounter = 0;

        // Advance timer using Phaser delta (milliseconds)
        if (this.timercounter) this.timercounter.tick(delta);

        this._render();
    }

    // --- Private helpers ---

    _hideAllScreenEntities() {
        if (!this.level.masterList) {
            return;
        }

        for (const column of this.level.masterList) {
            for (const cell of column) {
                for (const e of cell.enemylist) {
                    if (e.hide) e.hide();
                }
                for (const o of cell.objectlist) {
                    if (o.hide) o.hide();
                }
            }
        }
    }

    _hasScreenLocation(mapX, mapY) {
        return this.level.masterList &&
               this.level.masterList[mapX] &&
               this.level.masterList[mapX][mapY] &&
               this.level.storedmap &&
               this.level.storedmap[mapX] &&
               this.level.storedmap[mapX][mapY];
    }

    saveCurrentStateAtSavePoint(savePoint) {
        this.savePointSnapshot = this._captureSavePointSnapshot(savePoint);
    }

    restoreSavePointIfAvailable() {
        if (!this.savePointSnapshot) {
            return false;
        }

        const snapshot = this.savePointSnapshot;

        this._destroyAllScreenEntities();
        this.enemyList = [];
        this.objectList = [];
        this.level.locationx = snapshot.locationx;
        this.level.locationy = snapshot.locationy;
        this.level.masterList = [];

        for (let sx = 0; sx < snapshot.screens.length; sx++) {
            this.level.masterList[sx] = [];
            for (let sy = 0; sy < snapshot.screens[sx].length; sy++) {
                const screen = snapshot.screens[sx][sy];
                this.level.masterList[sx][sy] = {
                    staticslist: screen.staticslist.map(r => ({ ...r })),
                    enemylist:   screen.enemylist
                        .map(state => this._createEnemyFromState(state))
                        .filter(e => e !== null),
                    objectlist:  screen.objectlist
                        .map(state => this._createObjectFromState(state))
                        .filter(o => o !== null)
                };
            }
        }

        this._hideAllScreenEntities();

        this.player.x             = snapshot.player.x;
        this.player.y             = snapshot.player.y;
        this.player.haskey        = snapshot.player.haskey;
        this.player.lastdirection = snapshot.player.lastdirection;
        this.player.currentAnim   = snapshot.player.currentAnim;
        this.player.inithitbox();

        if (this.timercounter) {
            this.timercounter.abs    = snapshot.timer.abs;
            this.timercounter.tenms  = snapshot.timer.tenms;
            this.timercounter.sec    = snapshot.timer.sec;
            this.timercounter.min    = snapshot.timer.min;
            this.timercounter._accum = snapshot.timer.accum;
            this.timercounter.start();
        }

        this.seeme                 = snapshot.seeme;
        this.seemecounter          = snapshot.seemecounter;
        this.seemeIdleElapsed      = snapshot.seemeIdleElapsed;
        this.seemeHasObservedInput = snapshot.seemeHasObservedInput;

        this.changeloc();
        this._render();
        return true;
    }

    _captureSavePointSnapshot(savePoint) {
        const screens = [];
        for (let sx = 0; sx < this.level.masterList.length; sx++) {
            screens[sx] = [];
            for (let sy = 0; sy < this.level.masterList[sx].length; sy++) {
                const lc = this.level.masterList[sx][sy];
                screens[sx][sy] = {
                    staticslist: lc.staticslist.map(r => ({ ...r })),
                    enemylist:   lc.enemylist.map(e => this._serializeEnemy(e)).filter(e => e !== null),
                    objectlist:  lc.objectlist.map(o => this._serializeObject(o, savePoint)).filter(o => o !== null)
                };
            }
        }

        return {
            locationx: this.level.locationx,
            locationy: this.level.locationy,
            player: {
                x:             this.player.x,
                y:             this.player.y,
                haskey:        this.player.haskey,
                lastdirection: this.player.lastdirection,
                currentAnim:   this.player.currentAnim
            },
            timer: {
                abs:   this.timercounter ? this.timercounter.abs : 0,
                tenms: this.timercounter ? this.timercounter.tenms : 0,
                sec:   this.timercounter ? this.timercounter.sec : 0,
                min:   this.timercounter ? this.timercounter.min : 0,
                accum: this.timercounter ? this.timercounter._accum : 0
            },
            seeme:                 this.seeme,
            seemecounter:          this.seemecounter,
            seemeIdleElapsed:      this.seemeIdleElapsed,
            seemeHasObservedInput: this.seemeHasObservedInput,
            screens
        };
    }

    _serializeEnemy(enemy) {
        if (enemy instanceof Dog) {
            return {
                type: 'Dog',
                x: enemy.x, y: enemy.y,
                orientation: enemy.orientation,
                counter: enemy.counter,
                notice: enemy.notice,
                noticereturn: enemy.noticereturn
            };
        }
        if (enemy instanceof Guard) {
            return {
                type: 'Guard',
                x: enemy.x, y: enemy.y,
                orientation: enemy.orientation,
                counter: enemy.counter,
                chase: enemy.chase,
                questioncounter: enemy.questioncounter,
                stuckcounter: enemy.stuckcounter
            };
        }
        if (enemy instanceof Wizard) {
            return {
                type: 'Wizard',
                x: enemy.x, y: enemy.y,
                orientation: enemy.orientation,
                isfiring: enemy.isfiring,
                fireballtimer: enemy.fireballtimer
            };
        }
        if (enemy instanceof Fireball) {
            return {
                type: 'Fireball',
                x: enemy.x, y: enemy.y,
                orientation: enemy.orientation,
                extraspdcounter: enemy._extraspdcounter
            };
        }
        if (enemy instanceof KnightBoss) {
            return {
                type: 'KnightBoss',
                x: enemy.x, y: enemy.y,
                basicx: enemy.basicx,
                basicy: enemy.basicy,
                orientation: enemy.orientation,
                activated: enemy.activated,
                hastarget: enemy.hastarget,
                oldtarget: enemy.oldtarget,
                stobx: enemy.stobx,
                stoby: enemy.stoby,
                emotecounter: enemy.emotecounter
            };
        }
        return null;
    }

    _serializeObject(object, activeSavePoint) {
        if (object instanceof Door) {
            return {
                type: 'Door',
                x: object.x, y: object.y,
                isClosed: object.isClosed,
                hasAddedRect: object._hasAddedRect
            };
        }
        if (object instanceof DoorButton) {
            return {
                type: 'DoorButton',
                x: object.x, y: object.y,
                isStep: object._isStep
            };
        }
        if (object instanceof Key) {
            return {
                type: 'Key',
                x: object.x, y: object.y,
                animTimer: object._animTimer
            };
        }
        if (object instanceof KeyDoor) {
            return {
                type: 'KeyDoor',
                x: object.x, y: object.y,
                isActive: object._isActive,
                hasAddedStatic: object._hasAddedStatic
            };
        }
        if (object instanceof Exit) {
            return {
                type: 'Exit',
                x: object.x, y: object.y,
                direction: object.direction,
                arrowDisplay: object._arrowDisplay
            };
        }
        if (object instanceof GuardPath) {
            return {
                type: 'GuardPath',
                x: object.hitbox.x, y: object.hitbox.y,
                orientation: object.orientation,
                isStop: object.isStop
            };
        }
        if (object instanceof Crate) {
            return { type: 'Crate', x: object.x, y: object.y };
        }
        if (object instanceof Princess) {
            return {
                type: 'Princess',
                x: object.x, y: object.y,
                animTimer: object._animTimer
            };
        }
        if (object instanceof Torch) {
            return {
                type: 'Torch',
                x: object.x, y: object.y,
                animTimer: object._animTimer
            };
        }
        if (object instanceof Window) {
            return {
                type: 'Window',
                x: object.x, y: object.y,
                animTimer: object._animTimer
            };
        }
        if (object instanceof Tracker) {
            return {
                type: 'Tracker',
                knightinitialpathset: object.knightinitialpathset,
                nodemap: object.nodemap.map(column => column.map(node => ({
                    activated: node.activated,
                    steptime:  node.steptime
                })))
            };
        }
        if (object instanceof KnightBossSpawn) {
            return { type: 'KnightBossSpawn', x: object.x, y: object.y };
        }
        if (object instanceof KnightBossInitialActivate) {
            return { type: 'KnightBossInitialActivate', x: object.x, y: object.y };
        }
        if (object instanceof FinalCutscene) {
            return { type: 'FinalCutscene', x: object.x, y: object.y };
        }
        if (object instanceof SavePoint) {
            return {
                type: 'SavePoint',
                x: object.x, y: object.y,
                activated: object === activeSavePoint ? true : object.activated,
                glowCounter: object._glowCounter
            };
        }
        return null;
    }

    _createEnemyFromState(state) {
        let enemy = null;
        if (state.type === 'Dog') {
            enemy = new Dog(state.orientation, state.x, state.y, this.scene);
            enemy.x = state.x; enemy.y = state.y;
            enemy.counter = state.counter;
            enemy.notice = state.notice;
            enemy.noticereturn = state.noticereturn;
            enemy._setHitbox();
        } else if (state.type === 'Guard') {
            enemy = new Guard(state.orientation, state.x, state.y, this.scene);
            enemy.x = state.x; enemy.y = state.y;
            enemy.counter = state.counter;
            enemy.chase = state.chase;
            enemy.questioncounter = state.questioncounter;
            enemy.stuckcounter = state.stuckcounter;
            enemy._setHitbox();
        } else if (state.type === 'Wizard') {
            enemy = new Wizard(state.x, state.y, state.orientation, this.scene);
            enemy.isfiring = state.isfiring;
            enemy.fireballtimer = state.fireballtimer;
            enemy.imgupdate();
        } else if (state.type === 'Fireball') {
            enemy = new Fireball(state.x, state.y, state.orientation, this.scene);
            enemy._extraspdcounter = state.extraspdcounter;
            enemy._hitboxupdate();
        } else if (state.type === 'KnightBoss') {
            enemy = new KnightBoss(state.x + 2, state.y + 28, state.basicx, state.basicy, state.activated, this.scene);
            enemy.x = state.x; enemy.y = state.y;
            enemy.basicx = state.basicx;
            enemy.basicy = state.basicy;
            enemy.orientation = state.orientation;
            enemy.activated = state.activated;
            enemy.hastarget = state.hastarget;
            enemy.oldtarget = state.oldtarget;
            enemy.stobx = state.stobx;
            enemy.stoby = state.stoby;
            enemy.emotecounter = state.emotecounter;
            enemy.hasGetTracker = false;
            enemy.tracker = null;
            enemy._makeHitboxes();
        }
        return enemy;
    }

    _createObjectFromState(state) {
        let object = null;
        if (state.type === 'Door') {
            object = new Door(state.isClosed, state.x, state.y, this.scene);
            object._hasAddedRect = state.hasAddedRect;
        } else if (state.type === 'DoorButton') {
            object = new DoorButton(state.x, state.y, this.scene);
            object._isStep = state.isStep;
        } else if (state.type === 'Key') {
            object = new Key(state.x - 8, state.y - 3, this.scene);
            object._animTimer = state.animTimer;
        } else if (state.type === 'KeyDoor') {
            object = new KeyDoor(state.x, state.y, this.scene);
            object._isActive = state.isActive;
            object._hasAddedStatic = state.hasAddedStatic;
            object.sprite.setVisible(state.isActive);
        } else if (state.type === 'Exit') {
            object = new Exit(state.x, state.y, state.direction, this.scene);
            object._arrowDisplay = state.arrowDisplay;
        } else if (state.type === 'GuardPath') {
            object = new GuardPath(state.orientation, state.x, state.y, state.isStop);
        } else if (state.type === 'Crate') {
            object = new Crate(state.x - 3, state.y - 3, this.scene);
            object.x = state.x; object.y = state.y;
            object._createPushBoxes();
        } else if (state.type === 'Princess') {
            object = new Princess(state.x - 6, state.y + 8, this.scene);
            object._animTimer = state.animTimer;
        } else if (state.type === 'Torch') {
            object = new Torch(state.x, state.y, this.scene);
            object._animTimer = state.animTimer;
        } else if (state.type === 'Window') {
            object = new Window(state.x, state.y, this.scene);
            object._animTimer = state.animTimer;
        } else if (state.type === 'Tracker') {
            object = new Tracker();
            object.knightinitialpathset = state.knightinitialpathset;
            for (let x = 0; x < 25; x++) {
                for (let y = 0; y < 25; y++) {
                    object.nodemap[x][y].activated = state.nodemap[x][y].activated;
                    object.nodemap[x][y].steptime  = state.nodemap[x][y].steptime;
                }
            }
        } else if (state.type === 'KnightBossSpawn') {
            object = new KnightBossSpawn(state.x, state.y);
        } else if (state.type === 'KnightBossInitialActivate') {
            object = new KnightBossInitialActivate(state.x, state.y);
        } else if (state.type === 'FinalCutscene') {
            object = new FinalCutscene(state.x, state.y);
        } else if (state.type === 'SavePoint') {
            object = new SavePoint(state.x, state.y, this.scene);
            object.activated = state.activated;
            object._glowCounter = state.glowCounter;
        }
        return object;
    }

    _destroyAllScreenEntities() {
        if (!this.level.masterList) {
            return;
        }

        const seen = new Set();
        for (const column of this.level.masterList) {
            for (const cell of column) {
                for (const e of cell.enemylist) {
                    this._destroyEntityDisplay(e, seen);
                }
                for (const o of cell.objectlist) {
                    this._destroyEntityDisplay(o, seen);
                }
            }
        }
    }

    _destroyEntityDisplay(entity, seen) {
        if (!entity) {
            return;
        }
        const keys = [
            'sprite', 'haskeySprite', 'barsSprite',
            '_sprite', '_spriteUp', '_spriteDown', '_pointer',
            'emoteSprite', 'noticeSprite', 'questionSprite', 'helpSprite',
            'emote2Sprite'
        ];
        for (const key of keys) {
            const displayObject = entity[key];
            if (displayObject && displayObject.destroy && !seen.has(displayObject)) {
                seen.add(displayObject);
                displayObject.destroy();
                entity[key] = null;
            }
        }
    }

    // Update all Phaser display object positions.
    // In Phaser 3 the scene graph handles drawing; we just reposition each frame.
    // Mirrors STPGame.render() minus the Slick-specific draw calls.
    _render() {
        this.player.render();

        for (const e of this.enemyList) {
            if (e.render) e.render();
        }
        for (const o of this.objectList) {
            if (o.render) o.render();
        }

        // seeme arrow: blink while seeme is true (visible first 25 of every 50 frames)
        if (this.seemeSprite) {
            const show = this.seeme && this.seemecounter < 25;
            this.seemeSprite.setVisible(show);
            if (show) {
                this.seemeSprite.setPosition(this.player.x - 56, this.player.y - 65);
            }
        }

        // Timer HUD
        if (this.timercounter && this.timerText) {
            this.timerText.setText('Time: ' + this.timercounter.getCurTime());
            if (this.isEditorPlay) {
                this.bestTimeText.setText('');
            } else {
                this.bestTimeText.setText(
                    'Best: ' + this.timercounter.gettime(this.currentLevelName)
                );
            }
        }
        this._renderPauseHud();

        this._renderHitboxes();
    }

    setInputMode(mode) {
        this.inputMode = mode === 'pointer' ? 'pointer' : 'keyboard';
        this._renderPauseHud();
    }

    registerPlayerMovementActivity() {
        this.seemeIdleElapsed      = 0;
        this.seemeHasObservedInput = true;
        if (this.seeme) {
            this.seeme        = false;
            this.seemecounter = 26;
            if (this.seemeSprite) {
                this.seemeSprite.setVisible(false);
            }
        }
    }

    isPauseHudPointer(pointer) {
        return !!pointer && pointer.x >= 0 && pointer.x <= 170 && pointer.y >= 0 && pointer.y <= 43;
    }

    handlePauseHudPointerDown(pointer) {
        if (this.inputMode !== 'pointer' || !this.isPauseHudPointer(pointer)) {
            return false;
        }
        this.pauseHudIsDown = true;
        this._renderPauseHud();
        if (this.pauseHudTimer) {
            this.pauseHudTimer.remove(false);
        }
        this.pauseHudHoldStart = this.scene.time.now;
        this.pauseHudTimer = this.scene.time.delayedCall(this.pauseHudHoldMs, () => {
            this.pauseHudTimer = null;
            if (this.pauseHudIsDown && !this.pauseMenuOpen) {
                this.pauseHudIsDown = false;
                this.pauseHudHoldStart = 0;
                this._renderPauseHud();
                this._openPauseMenu();
            }
        });
        return true;
    }

    handlePauseHudPointerUp() {
        if (!this.pauseHudIsDown && !this.pauseHudTimer) {
            return;
        }
        this.pauseHudIsDown = false;
        this.pauseHudHoldStart = 0;
        if (this.pauseHudTimer) {
            this.pauseHudTimer.remove(false);
            this.pauseHudTimer = null;
        }
        this._renderPauseHud();
    }

    _renderPauseHud() {
        if (!this.pauseHudText) {
            return;
        }
        const isPointerMode = this.inputMode === 'pointer';
        this.pauseHudText.setText(isPointerMode ? 'Pause' : 'Pause - ESC');
        if (this.pauseHudIsDown) {
            const elapsed = Math.max(0, this.scene.time.now - this.pauseHudHoldStart);
            const pct = Math.min(1, elapsed / this.pauseHudHoldMs);
            const bg = Math.floor(85 + 170 * pct);
            const fg = Math.floor(255 * (1 - pct));
            this.timerText.setColor(`rgb(${fg},${fg},0)`);
            this.bestTimeText.setColor(`rgb(${fg},${fg},0)`);
            this.pauseHudText.setColor(`rgb(${fg},${fg},0)`);
            if (this.pauseHudBg) {
                this.pauseHudBg.setFillStyle((bg << 16) | (bg << 8), 0.85);
            }
        } else {
            this.timerText.setColor('#ffff00');
            this.bestTimeText.setColor('#ffff00');
            this.pauseHudText.setColor('#ffff00');
            if (this.pauseHudBg) {
                this.pauseHudBg.setFillStyle(0x000000, 0.55);
            }
        }
    }

    // Destroy any existing Phaser tilemap and build a new one for screen (mapX, mapY).
    // Uses Phaser's make.tilemap() with a 2D tile-index array.
    _rebuildTilemap(mapX, mapY) {
        if (this.currentTilemap) {
            this.currentTilemap.destroy();
            this.currentTilemap = null;
        }

        const map = this.level.storedmap[mapX][mapY];

        // Build 2D array: -1 = empty, otherwise use TMX gid space minus 1 so
        // multiple tilesets can render into the same generated tilemap layer.
        const tileData = [];
        for (let y = 0; y < map.height; y++) {
            const row = [];
            for (let x = 0; x < map.width; x++) {
                const gid = map.tiles[y * map.width + x];
                row.push(gid > 0 ? gid - 1 : -1);
            }
            tileData.push(row);
        }

        const tilemap = this.scene.make.tilemap({
            data:       tileData,
            tileWidth:  25,
            tileHeight: 25,
            width:      map.width,
            height:     map.height
        });
        const tilesets = [];
        for (const tilesetInfo of map.tilesets) {
            const tileset = tilemap.addTilesetImage(
                tilesetInfo.name,
                tilesetInfo.imageKey,
                25,
                25,
                0,
                0,
                tilesetInfo.firstgid - 1
            );
            if (tileset) {
                tilesets.push(tileset);
            }
        }
        const layer   = tilemap.createLayer(0, tilesets, 0, 0);
        layer.setDepth(0);

        this.currentTilemap = tilemap;
    }

    _handleControlHotkeys() {
        if (!this.keys) {
            return false;
        }

        const K = Phaser.Input.Keyboard.JustDown;

        if (K(this.keys.esc)) {
            if (this.pauseMenuOpen) {
                this._closePauseMenu();
            } else {
                this._openPauseMenu();
            }
        }

        if (this.pauseMenuOpen) {
            if (K(this.keys.up)) {
                this._pauseMenuSelectEntry(Math.max(0, this.pauseMenuSelectedIndex - 1));
            }
            if (K(this.keys.down)) {
                this._pauseMenuSelectEntry(Math.min(2, this.pauseMenuSelectedIndex + 1));
            }
            if (K(this.keys.enter)) {
                this._pauseMenuConfirm();
            }
            return false;
        }

        if (K(this.keys.h)) {
            this.displayHitboxes = !this.displayHitboxes;
            if (!this.displayHitboxes && this.debugGraphics) {
                this.debugGraphics.clear();
            }
        }

        return false;
    }

    _updateSeemeIdle(delta) {
        this.seemeIdleElapsed += delta || 0;
        const idleLimit = this.seemeHasObservedInput
            ? this.seemeIdleMilliseconds
            : this.seemeInitialIdleMilliseconds;
        if (!this.seeme && this.seemeIdleElapsed >= idleLimit) {
            this.seeme        = true;
            this.seemecounter = 0;
        }
    }

    // --- Pause menu ---

    _openPauseMenu() {
        if (this.pauseMenuOpen) return;
        this._hideVirtualControls();
        this.pauseMenuOpen          = true;
        this.pauseMenuSelectedIndex = 0;

        const RES         = window.devicePixelRatio || 1;
        const panelX      = 130, panelY = 195, panelW = 365, panelH = 260;
        const centerX     = 312;
        const titleY      = 218;
        const firstEntryY = 270;
        const entrySpacing = 65;
        const cursorX     = 148;

        // Full-canvas dimmer + panel drawn into one Graphics object
        this.pauseMenuOverlay = this.scene.add.graphics().setDepth(40);
        this.pauseMenuOverlay.fillStyle(0x000000, 0.72);
        this.pauseMenuOverlay.fillRect(0, 0, 625, 625);
        this.pauseMenuOverlay.fillStyle(0x000000, 0.9);
        this.pauseMenuOverlay.fillRect(panelX, panelY, panelW, panelH);
        this.pauseMenuOverlay.lineStyle(2, 0xffff00, 1);
        this.pauseMenuOverlay.strokeRect(panelX, panelY, panelW, panelH);

        // "PAUSED" heading
        this.pauseMenuTitleText = this.scene.add.text(centerX, titleY, 'PAUSED', {
            fontFamily: '"Press Start 2P"', fontSize: '10px',
            color: '#888888', resolution: RES,
        }).setOrigin(0.5, 0).setDepth(41);

        // Three selectable entries
        const exitLabel = this.isEditorPlay ? 'RETURN TO EDITOR' : 'EXIT TO TITLE';
        const entryLabels = ['RESUME', 'RESET', exitLabel];
        this.pauseMenuEntryTexts      = [];
        this.pauseMenuEntryYPositions = [];

        for (let i = 0; i < entryLabels.length; i++) {
            const entryY = firstEntryY + i * entrySpacing;
            const txt = this.scene.add.text(centerX, entryY, entryLabels[i], {
                fontFamily: '"Press Start 2P"', fontSize: '16px',
                color: i === 0 ? '#ffff00' : '#ffffff', resolution: RES,
            }).setOrigin(0.5, 0).setDepth(41)
              .setInteractive({ useHandCursor: true });

            txt.on('pointerover', () => this._pauseMenuSelectEntry(i));
            txt.on('pointerdown', () => { this._pauseMenuSelectEntry(i); this._pauseMenuConfirm(); });

            this.pauseMenuEntryTexts.push(txt);
            // Cursor sits at the vertical midpoint of the text (~8px below top at 16px size)
            this.pauseMenuEntryYPositions.push(entryY + 8);
        }

        // Cursor arrow image
        this.pauseMenuCursor = this.scene.add.image(
            cursorX, this.pauseMenuEntryYPositions[0], 'loadercursor'
        ).setOrigin(0, 0.5).setDepth(41);
    }

    _closePauseMenu() {
        if (!this.pauseMenuOpen) return;
        this.pauseMenuOpen = false;

        if (this.pauseMenuOverlay)   { this.pauseMenuOverlay.destroy();   this.pauseMenuOverlay   = null; }
        if (this.pauseMenuTitleText) { this.pauseMenuTitleText.destroy(); this.pauseMenuTitleText = null; }
        if (this.pauseMenuCursor)    { this.pauseMenuCursor.destroy();    this.pauseMenuCursor    = null; }
        for (const txt of this.pauseMenuEntryTexts) txt.destroy();
        this.pauseMenuEntryTexts      = [];
        this.pauseMenuEntryYPositions = [];
    }

    _pauseMenuSelectEntry(index) {
        this.pauseMenuSelectedIndex = index;
        for (let i = 0; i < this.pauseMenuEntryTexts.length; i++) {
            this.pauseMenuEntryTexts[i].setColor(i === index ? '#ffff00' : '#ffffff');
        }
        if (this.pauseMenuCursor) {
            this.pauseMenuCursor.setY(this.pauseMenuEntryYPositions[index]);
        }
    }

    _pauseMenuConfirm() {
        switch (this.pauseMenuSelectedIndex) {
            case 0: this._closePauseMenu(); break;  // Resume
            case 1: this._resetLevel();     break;  // Reset
            case 2: this._exitGame();       break;  // Exit
        }
    }

    _hideVirtualControls() {
        if (window.stpVirtualControls && window.stpVirtualControls.hide) {
            window.stpVirtualControls.hide();
            return;
        }
        const overlay = document.getElementById('virtual-controls');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    getEditorPlayGameData() {
        return {
            customLevel:      this.customLevelData,
            editorUndoStack:  this.editorUndoStack,
            editorRedoStack:  this.editorRedoStack,
            editorSession:    this.editorSession,
        };
    }

    getEditorPlayEditorData() {
        return {
            levelData:       this.customLevelData,
            editorUndoStack: this.editorUndoStack,
            editorRedoStack: this.editorRedoStack,
            editorSession:   this.editorSession,
        };
    }

    // Reset the level without a death animation: rebuild entity lists, reposition
    // player at spawn, restart timer.  Mirrors the setup done in loadlevel() but
    // skips the async asset-load step since storedmap is already populated.
    _resetLevel() {
        this._closePauseMenu();
        this.savePointSnapshot = null;

        this._destroyAllScreenEntities();
        this.enemyList = [];
        this.objectList = [];
        this.level.locationx = 0;
        this.level.locationy = 0;
        this.level.createMasterList();
        this._hideAllScreenEntities();

        const spawn = this.level.createPlayer(0, 0);
        this.player.x             = spawn.x + 6;   // mirrors Player constructor: spawnX + 6
        this.player.y             = spawn.y - 2;   // mirrors Player constructor: spawnY - 2
        this.player.haskey        = false;
        this.player.lastdirection = Player.DIR_DOWN;
        this.player.inithitbox();

        if (this.timercounter) {
            this.timercounter.stop();
            this.timercounter.reset();
            this.timercounter.start();
        }

        this.seeme        = false;
        this.seemecounter = 26;
        this.seemeIdleElapsed      = 0;
        this.seemeHasObservedInput = false;

        this.changeloc();
    }

    // Exit to MenuScene (campaign) or back to LevelEditorScene (editor play mode).
    _exitGame() {
        if (this.timercounter) this.timercounter.stop();
        if (this.sound)        this.sound.stop();

        if (this.isEditorPlay) {
            this.scene.scene.start('LevelEditorScene', this.getEditorPlayEditorData());
        } else {
            this.scene.scene.start('MenuScene');
        }
    }

    _renderHitboxes() {
        if (!this.debugGraphics) {
            return;
        }

        this.debugGraphics.clear();

        if (!this.displayHitboxes) {
            return;
        }

        this.debugGraphics.lineStyle(1, 0xffffff, 1);
        for (const rect of this.staticsList) {
            this.debugGraphics.strokeRect(rect.x, rect.y, rect.width, rect.height);
        }

        this.debugGraphics.lineStyle(1, 0xff0000, 1);
        for (const e of this.enemyList) {
            if (e.hitbox) {
                this.debugGraphics.strokeRect(e.hitbox.x, e.hitbox.y, e.hitbox.width, e.hitbox.height);
            }
        }

        this.debugGraphics.lineStyle(1, 0xffff00, 1);
        for (const o of this.objectList) {
            if (o.hitbox) {
                this.debugGraphics.strokeRect(o.hitbox.x, o.hitbox.y, o.hitbox.width, o.hitbox.height);
            }
        }

        this.debugGraphics.lineStyle(1, 0x0000ff, 1);
        this.debugGraphics.strokeRect(
            this.player.hitbox.x,
            this.player.hitbox.y,
            this.player.hitbox.width,
            this.player.hitbox.height
        );
    }

    debugSkipLevel() {
        if (this.animationManager && this.animationManager.debugReturnToMenu) {
            if (this.animationManager.debugReturnToMenu()) {
                return;
            }
        }
        this._skipLevel();
    }

    _skipLevel() {
        if (this.isEditorPlay) {
            if (this.timercounter) {
                this.timercounter.stop();
            }
            if (this.sound) {
                this.sound.stop();
            }
            this.scene.scene.start('LevelEditorScene', this.getEditorPlayEditorData());
            return;
        }

        const currentLevelName = this.currentLevelName || this.save.getCurrentLevel();

        if (currentLevelName === 'Level6') {
            if (this.animationManager) {
                this.animationManager.startAnimation('finalTowerLedge', { skipSaveTime: true });
            }
            return;
        }

        if (this.timercounter) {
            this.timercounter.stop();
        }
        if (this.sound) {
            this.sound.stop();
        }

        this.save.nextLevel();

        const nextLevelName = this.save.getCurrentLevel();
        if (nextLevelName === 'End') {
            this.scene.scene.start('MenuScene');
        } else {
            this.scene.scene.start('GameScene', { levelName: nextLevelName });
        }
    }
}

// AABB intersection test — used for enemy/object vs player hitbox checks.
function _rectsIntersect(a, b) {
    return a.x              < b.x + b.width  &&
           a.x + a.width   > b.x             &&
           a.y              < b.y + b.height  &&
           a.y + a.height  > b.y;
}
