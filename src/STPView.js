// STPView.js — main game logic
// Mirrors STPGame.java (the in-game state manager, not the Slick bootstrap)

import Player       from './Player.js';
import TimerCounter from './TimerCounter.js';
import AnimationManager from './AnimationManager.js';

export default class STPView {

    constructor(scene, level, soundManager, saveReader) {
        this.scene        = scene;
        this.level        = level;
        this.sound        = soundManager;
        this.save         = saveReader;

        this.staticsList  = [];
        this.enemyList    = [];
        this.objectList   = [];

        this.player       = null;
        this.seeme        = true;
        this.seemecounter = 26;   // mirrors STPGame.loadlevel() initial value
        this.timercounter = null;
        this.animationManager = new AnimationManager(this.scene, this);
        this.isPaused     = false;
        this.displayHitboxes = false;

        // Phaser display refs
        this.currentTilemap   = null;
        this.seemeSprite      = null;
        this.timerText        = null;
        this.bestTimeText     = null;
        this.pauseText        = null;
        this.debugGraphics    = null;
        this.keys             = null;
    }

    // async: parses level TMX, builds masterList, creates player.
    // Call once from GameScene.create() and await it.
    // Mirrors STPGame.loadlevel().
    async loadlevel() {
        console.log('Loading level:', this.save.getCurrentLevel());

        await this.level.init();

        const spawn = this.level.createPlayer(0, 0);
        this.player = new Player(spawn.x, spawn.y);
        this.player.imageinit(this.scene);

        this.level.createMasterList();
        this._hideAllScreenEntities();

        this.changeloc();  // load screen (0,0) lists + tilemap

        this.sound.play(this.level.mapsong);

        this.seeme        = true;
        this.seemecounter = 26;

        this.timercounter = new TimerCounter(this.save.getCurrentLevel());
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
        this.pauseText = this.scene.add.text(312, 312, 'PAUSED', {
            fontFamily: 'monospace', fontSize: '20px', color: '#ffff00'
        }).setOrigin(0.5, 0.5).setDepth(30).setVisible(false);
        this.debugGraphics = this.scene.add.graphics().setDepth(25);
        this.keys = this.scene.input.keyboard.addKeys({
            esc:   Phaser.Input.Keyboard.KeyCodes.ESC,
            h:     Phaser.Input.Keyboard.KeyCodes.H,
            n:     Phaser.Input.Keyboard.KeyCodes.N
        });

        this._render();
    }

    // Load lists and rebuild tilemap for the current locationx/locationy.
    // Mirrors STPGame.changeloc().
    changeloc() {
        // Hide sprites from the outgoing screen's entities
        for (const e of this.enemyList)  { if (e.hide) e.hide(); }
        for (const o of this.objectList) { if (o.hide) o.hide(); }

        const lc = this.level.masterList[this.level.locationx][this.level.locationy];
        this.staticsList = lc.staticslist;
        this.enemyList   = lc.enemylist;
        this.objectList  = lc.objectlist;
        this._rebuildTilemap(this.level.locationx, this.level.locationy);
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

        if (this.isPaused) {
            this._render();
            return;
        }

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
            this.timerText.setText(this.timercounter.getCurTime());
            this.bestTimeText.setText(
                this.timercounter.gettime(this.save.getCurrentLevel())
            );
        }

        if (this.pauseText) {
            this.pauseText.setVisible(this.isPaused);
        }

        this._renderHitboxes();
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
            this.isPaused = !this.isPaused;
        }
        if (K(this.keys.h)) {
            this.displayHitboxes = !this.displayHitboxes;
            if (!this.displayHitboxes && this.debugGraphics) {
                this.debugGraphics.clear();
            }
        }
        if (K(this.keys.n)) {
            this._skipLevel();
            return true;
        }

        return false;
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

    _skipLevel() {
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
