// Main.js — Boot, config, and scene management
// Mirrors the role of STPGame.java / STPView.java in the original

import SoundManager      from './SoundManager.js';
import SaveReader        from './SaveReader.js';
import Menu              from './Menu.js';
import STPView           from './STPView.js';
import AnimationManager  from './AnimationManager.js';
import Level1            from './levels/Level1.js';
import Level2            from './levels/Level2.js';
import Level3            from './levels/Level3.js';
import Level4            from './levels/Level4.js';
import Level5            from './levels/Level5.js';
import Level6            from './levels/Level6.js';
import LevelEditorScene  from './editor/LevelEditorScene.js';
import CustomLevel       from './levels/CustomLevel.js';
import VirtualControls   from './VirtualControls.js';

// Single VirtualControls instance shared across all scene transitions.
const virtualControls = new VirtualControls();
window.stpVirtualControls = virtualControls;

// Factory: instantiate the correct Level subclass by name.
// Mirrors the switch in STPView.java that selects the level class.
function createLevel(scene, levelName) {
    switch (levelName) {
        case 'Level1': return new Level1(scene);
        case 'Level2': return new Level2(scene);
        case 'Level3': return new Level3(scene);
        case 'Level4': return new Level4(scene);
        case 'Level5': return new Level5(scene);
        case 'Level6': return new Level6(scene);
        default:       return new Level1(scene);
    }
}

// BootScene: preloads all assets, shows loading bar, then starts MenuScene.
// Mirrors the deferred-loading sequence in STPView.java.
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        this._createLoadBar();

        // --- Guy (player) sprites ---
        this.load.image('guy_standdown',  'img/guy/standdown.png');
        this.load.image('guy_standup',    'img/guy/standup.png');
        this.load.image('guy_standleft',  'img/guy/standleft.png');
        this.load.image('guy_standright', 'img/guy/standright.png');
        this.load.image('guy_walkdown',   'img/guy/walkdown.png');
        this.load.image('guy_walkdown2',  'img/guy/walkdown2.png');
        this.load.image('guy_walkup',     'img/guy/walkup.png');
        this.load.image('guy_walkup2',    'img/guy/walkup2.png');
        this.load.image('guy_walkleft',   'img/guy/walkleft.png');
        this.load.image('guy_walkleft2',  'img/guy/walkleft2.png');
        this.load.image('guy_walkright',  'img/guy/walkright.png');
        this.load.image('guy_walkright2', 'img/guy/walkright2.png');

        // --- Guard sprites ---
        this.load.image('guard_standdown',  'img/guard/standdown.png');
        this.load.image('guard_standup',    'img/guard/standup.png');
        this.load.image('guard_standleft',  'img/guard/standleft.png');
        this.load.image('guard_standright', 'img/guard/standright.png');
        this.load.image('guard_walkdown1',  'img/guard/walkdown1.png');
        this.load.image('guard_walkdown2',  'img/guard/walkdown2.png');
        this.load.image('guard_walkup1',    'img/guard/walkup1.png');
        this.load.image('guard_walkup2',    'img/guard/walkup2.png');
        this.load.image('guard_walkleft',   'img/guard/walkleft.png');
        this.load.image('guard_walkright',  'img/guard/walkright.png');

        // --- Dog sprites ---
        this.load.image('dog_down',   'img/dog/dogdown.png');
        this.load.image('dog_down1',  'img/dog/dogdown1.png');
        this.load.image('dog_down2',  'img/dog/dogdown2.png');
        this.load.image('dog_left',   'img/dog/dogleft.png');
        this.load.image('dog_left2',  'img/dog/dogleft2.png');
        this.load.image('dog_left3',  'img/dog/dogleft3.png');
        this.load.image('dog_right',  'img/dog/dogright.png');
        this.load.image('dog_right2', 'img/dog/dogright2.png');
        this.load.image('dog_right3', 'img/dog/dogright3.png');
        this.load.image('dog_up',     'img/dog/dogup.png');
        this.load.image('dog_up2',    'img/dog/dogup2.png');
        this.load.image('dog_up3',    'img/dog/dogup3.png');

        // --- Wizard sprites ---
        this.load.image('wizard_down1',  'img/wizard/wizarddown1.png');
        this.load.image('wizard_down2',  'img/wizard/wizarddown2.png');
        this.load.image('wizard_up1',    'img/wizard/wizardup1.png');
        this.load.image('wizard_up2',    'img/wizard/wizardup2.png');
        this.load.image('wizard_left1',  'img/wizard/wizardleft1.png');
        this.load.image('wizard_left2',  'img/wizard/wizardleft2.png');
        this.load.image('wizard_right1', 'img/wizard/wizardright1.png');
        this.load.image('wizard_right2', 'img/wizard/wizardright2.png');
        // Fireball sprites
        this.load.image('fb_d1', 'img/wizard/fb/fbd1.png');
        this.load.image('fb_d2', 'img/wizard/fb/fbd2.png');
        this.load.image('fb_d3', 'img/wizard/fb/fbd3.png');
        this.load.image('fb_u1', 'img/wizard/fb/fbu1.png');
        this.load.image('fb_u2', 'img/wizard/fb/fbu2.png');
        this.load.image('fb_u3', 'img/wizard/fb/fbu3.png');
        this.load.image('fb_l1', 'img/wizard/fb/fbl1.png');
        this.load.image('fb_l2', 'img/wizard/fb/fbl2.png');
        this.load.image('fb_l3', 'img/wizard/fb/fbl3.png');
        this.load.image('fb_r1', 'img/wizard/fb/fbr1.png');
        this.load.image('fb_r2', 'img/wizard/fb/fbr2.png');
        this.load.image('fb_r3', 'img/wizard/fb/fbr3.png');

        // --- Knight boss sprites ---
        this.load.image('knight_down1',  'img/knight/knightdown1.png');
        this.load.image('knight_down2',  'img/knight/knightdown2.png');
        this.load.image('knight_down3',  'img/knight/knightdown3.png');
        this.load.image('knight_up1',    'img/knight/knightup1.png');
        this.load.image('knight_up2',    'img/knight/knightup2.png');
        this.load.image('knight_up3',    'img/knight/knightup3.png');
        this.load.image('knight_left1',  'img/knight/knightleft1.png');
        this.load.image('knight_left2',  'img/knight/knightleft2.png');
        this.load.image('knight_right1', 'img/knight/knightright1.png');
        this.load.image('knight_right2', 'img/knight/knightright2.png');

        // --- Princess sprites ---
        this.load.image('princess1', 'img/princess/princess1.png');
        this.load.image('princess2', 'img/princess/princess2.png');

        // --- Menu / UI sprites ---
        this.load.image('menu',          'img/menu/menu.png');
        this.load.image('loader',        'img/menu/loader.png');
        this.load.image('loadercursor',  'img/menu/loadercursor.png');
        this.load.image('menunew',       'img/menu/menunew.png');
        this.load.image('space2start',   'img/menu/space2start.png');
        this.load.image('timesmenu',     'img/menu/timesmenu.png');
        this.load.image('CAUGHT',        'img/menu/CAUGHT.png');
        this.load.image('OUCH',          'img/menu/OUCH.png');
        this.load.image('dogkiller',     'img/menu/dogkiller.png');
        this.load.image('guardright1',   'img/menu/guardright1.png');
        this.load.image('guardright2',   'img/menu/guardright2.png');
        this.load.image('guardleft1',    'img/menu/guardleft1.png');
        this.load.image('guardleft2',    'img/menu/guardleft2.png');
        this.load.image('guy1',          'img/menu/guy1.png');
        this.load.image('guy2',          'img/menu/guy2.png');
        this.load.image('guydead',       'img/menu/guydead.png');
        this.load.image('heart',         'img/menu/heart.png');
        this.load.image('menu_princess1','img/menu/princess1.png');
        this.load.image('menu_princess2','img/menu/princess2.png');
        this.load.image('knightkiller',  'img/menu/knightkiller.png');
        this.load.image('wizardkiller',  'img/menu/wizardkiller.png');
        this.load.image('fireballkiller','img/menu/fireballkiller.png');
        this.load.image('gatekiller',    'img/menu/gatekiller.png');
        this.load.image('notice_menu',   'img/menu/notice.png');
        this.load.image('exitpointerD',  'img/menu/exitpointerD.png');
        this.load.image('exitpointerU',  'img/menu/exitpointerU.png');
        this.load.image('exitpointerL',  'img/menu/exitpointerL.png');
        this.load.image('exitpointerR',  'img/menu/exitpointerR.png');
        this.load.image('spotcologo1',   'img/menu/spotcologo/1.png');
        this.load.image('spotcologo2',   'img/menu/spotcologo/2.png');
        this.load.image('spotcologo3',   'img/menu/spotcologo/3.png');
        this.load.image('spotcologo4',   'img/menu/spotcologo/4.png');
        this.load.image('spotcologo5',   'img/menu/spotcologo/5.png');
        this.load.image('spotcologo6',   'img/menu/spotcologo/6.png');
        this.load.image('spotcologo7',   'img/menu/spotcologo/7.png');

        // --- Misc in-game sprites ---
        this.load.image('crate',    'img/misc/crate.png');
        this.load.image('fight',    'img/misc/fight.png');
        this.load.image('coward',   'img/misc/coward.png');
        this.load.image('foiled',   'img/misc/foiled.png');
        this.load.image('goal',     'img/misc/goal.png');
        this.load.image('havekey',  'img/misc/havekey.png');
        this.load.image('help',     'img/misc/help.png');
        this.load.image('notice',   'img/misc/notice.png');
        this.load.image('question', 'img/misc/question.png');
        this.load.image('seeme',    'img/misc/seeme.png');
        // Key animation frames (key.png is frame 0, then key1-key5)
        this.load.image('key0', 'img/misc/key/key.png');
        this.load.image('key1', 'img/misc/key/key1.png');
        this.load.image('key2', 'img/misc/key/key2.png');
        this.load.image('key3', 'img/misc/key/key3.png');
        this.load.image('key4', 'img/misc/key/key4.png');
        this.load.image('key5', 'img/misc/key/key5.png');

        // --- Tile object sprites ---
        this.load.image('bars',          'img/tiles/bars.png');
        this.load.image('keydoor',       'img/tiles/keydoor.png');
        this.load.image('presspush',     'img/tiles/presspush.png');
        this.load.image('presspushdown', 'img/tiles/presspushdown.png');
        // Torch animation frames
        this.load.image('torch1', 'img/tiles/torch/1.png');
        this.load.image('torch2', 'img/tiles/torch/2.png');
        this.load.image('torch3', 'img/tiles/torch/3.png');
        this.load.image('torch4', 'img/tiles/torch/4.png');
        this.load.image('torch5', 'img/tiles/torch/5.png');
        this.load.image('torch6', 'img/tiles/torch/6.png');
        // Window animation frames
        this.load.image('window1', 'img/tiles/window1.png');
        this.load.image('window2', 'img/tiles/window2.png');
        this.load.image('window3', 'img/tiles/window3.png');
        this.load.image('window4', 'img/tiles/window4.png');
        this.load.image('window5', 'img/tiles/window5.png');

        // --- Tilesets (for tilemap rendering) ---
        this.load.image('tileset1',   'img/tileset1.png');
        this.load.image('guard1set',  'img/guard1set.png');
        this.load.image('wizard1set', 'img/wizard1set.png');
        // Editor-only pointer-marked tilesets. Gameplay scenes never render these.
        this.load.image('tileset1_pointers',   'img/pointers/tileset1.png');
        this.load.image('guard1set_pointers',  'img/pointers/guard1set.png');
        this.load.image('wizard1set_pointers', 'img/pointers/wizard1set.png');

        // --- Final / cutscene images ---
        this.load.image('creditscreen',     'img/final/creditscreen.png');
        this.load.image('creditslist',      'img/final/creditslist.png');
        this.load.image('firstend2',        'img/final/firstend2.png');
        this.load.image('firstview',        'img/final/firstview.png');
        this.load.image('firstviewrail',    'img/final/firstviewrail.png');
        this.load.image('final_notice',     'img/final/notice.png');
        this.load.image('postscriptbg',     'img/final/postscriptbg.png');
        this.load.image('postscriptknight', 'img/final/postscriptknight.png');
        this.load.image('tbc',              'img/final/tbc.png');
        this.load.image('wemustfight',      'img/final/wemustfight.png');

        // --- Music (looping tracks) ---
        this.load.audio('menu1',   'snd/menu1.ogg');
        this.load.audio('main1',   'snd/main1.ogg');
        this.load.audio('boss',    'snd/boss.ogg');
        this.load.audio('wind',    'snd/wind.ogg');
        this.load.audio('credits', 'snd/credits.ogg');

        // --- SFX (one-shot) ---
        this.load.audio('win1',          'snd/win1.wav');
        this.load.audio('win2',          'snd/win2.wav');
        this.load.audio('die1',          'snd/end1.wav');
        this.load.audio('die2',          'snd/end2.wav');
        this.load.audio('dogbark',       'snd/dogbark.wav');
        this.load.audio('menuchange',    'snd/beep.wav');
        this.load.audio('hey',           'snd/hey.wav');
        this.load.audio('gate',          'snd/gateclose.wav');
        this.load.audio('getkey',        'snd/getkey.wav');
        this.load.audio('unlockdoor',    'snd/unlockdoor.wav');
        this.load.audio('fireball',      'snd/fireball.wav');
        this.load.audio('standandfight', 'snd/standandfight.wav');

        // Level data is now loaded as .stplevel.json via fetch() in Level._loadStpLevelInto().
        // TMX files are no longer read at boot — the runtime uses data/stplevels/*.stplevel.json.
    }

    // Mirrors loadbarrender() in STPView.java
    _createLoadBar() {
        const barX = 50, barY = 350, barW = 525, barH = 20;

        const barOutline = this.add.graphics();
        barOutline.lineStyle(2, 0xffff00, 1);
        barOutline.strokeRect(barX, barY, barW, barH);

        const barFill = this.add.graphics();

        const label = this.add.text(150, 300, 'NOW LOADING...', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#ffff00'
        });

        this.load.on('progress', (value) => {
            barFill.clear();
            barFill.fillStyle(0xffff00, 1);
            barFill.fillRect(barX, barY, barW * value, barH);
        });

        this.load.on('fileprogress', (file) => {
            label.setText('NOW LOADING: ' + file.key);
        });
    }

    create() {
        this._createTilemapTilesetTexture('tileset1');
        this._createTilemapTilesetTexture('guard1set');
        this._createTilemapTilesetTexture('wizard1set');
        this._waitForMenuFont().then(() => {
            this.scene.start('MenuScene');
        });
    }

    async _waitForMenuFont() {
        if (!document.fonts || !document.fonts.load) {
            return;
        }

        // document.fonts.ready can resolve before a specific webfont has been
        // laid out for the exact sizes the menu uses.  Load the family
        // explicitly so the first MenuScene render does not measure against a
        // fallback font.
        await document.fonts.ready;
        await Promise.all([
            document.fonts.load('8px "Press Start 2P"'),
            document.fonts.load('9px "Press Start 2P"'),
            document.fonts.load('10px "Press Start 2P"'),
            document.fonts.load('11px "Press Start 2P"'),
            document.fonts.load('16px "Press Start 2P"'),
            document.fonts.load('20px "Press Start 2P"')
        ]);
    }

    _createTilemapTilesetTexture(textureKey) {
        const sourceImage = this.textures.get(textureKey).getSourceImage();
        const usableWidth = Math.floor(sourceImage.width / 25) * 25;
        const usableHeight = Math.floor(sourceImage.height / 25) * 25;
        const tilemapKey = textureKey + '_tilemap';

        if (usableWidth === sourceImage.width && usableHeight === sourceImage.height) {
            return;
        }

        if (this.textures.exists(tilemapKey)) {
            this.textures.remove(tilemapKey);
        }

        const canvasTexture = this.textures.createCanvas(tilemapKey, usableWidth, usableHeight);
        canvasTexture.context.drawImage(
            sourceImage,
            0,
            0,
            usableWidth,
            usableHeight,
            0,
            0,
            usableWidth,
            usableHeight
        );
        canvasTexture.refresh();
    }
}

// MenuScene — title screen and level loader.
// Delegates to Menu.js (mirrors Menu.java).
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        this.soundManager = new SoundManager(this);
        this.saveReader   = new SaveReader();
        this.menu         = new Menu(this, this.soundManager, this.saveReader);
        this.menu.animationManager = new AnimationManager(this, this.menu);
        this.menu.create();
        this.menu.refreshTextLayout();

        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
                if (this.menu) {
                    this.menu.refreshTextLayout();
                }
            });
        }

        this.soundManager.play('menu1');

        const data = this.scene.settings.data || {};
        if (data.playIntro !== false) {
            this.menu.startIntroAnimation();
        }
    }

    update() {
        if (this.menu.animationManager && this.menu.animationManager.inAnimation) {
            this.menu.animationManager.update(this.menu);
            this.menu.animationManager.render();
            return;
        }
        this.menu.update();
    }
}

// GameScene — main game loop.
// Delegates to STPView.js (mirrors STPGame.java).
// Receives { levelName } via scene data from MenuScene.
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.stpview = null;
        this.isReady = false;
    }

    async create() {
        this.isReady = false;

        const data       = this.scene.settings.data || {};
        const levelName  = data.levelName  || 'Level1';
        const customData = data.customLevel || null;

        const sound = new SoundManager(this);
        let save = null;

        let level;
        if (customData) {
            // Custom level from the editor — no campaign save state involved.
            level = new CustomLevel(this, customData);
        } else {
            // Normal campaign level — restore save progress.
            save = new SaveReader();
            save.loadGame();
            level = createLevel(this, levelName);
        }

        this.stpview = new STPView(this, level, sound, save);
        this.stpview.isEditorPlay       = !!customData;
        this.stpview.currentLevelName   = customData ? null : levelName;
        this.stpview.customLevelData    = customData;
        this.stpview.editorUndoStack    = data.editorUndoStack || null;
        this.stpview.editorRedoStack    = data.editorRedoStack || null;
        this.stpview.editorSession      = data.editorSession || null;
        await this.stpview.loadlevel();

        // Virtual controls start hidden. Pointer input reveals them; real
        // keyboard input hides them and releases any held virtual keys.
        virtualControls.hide();
        this.input.on('pointerdown', (pointer) => {
            if (this.stpview && this.stpview.animationManager && this.stpview.animationManager.inAnimation) {
                virtualControls.hide();
                return;
            }
            if (this.stpview) {
                this.stpview.setInputMode('pointer');
                if (this.stpview.handlePauseHudPointerDown(pointer)) {
                    return;
                }
                if (this.stpview.pauseMenuOpen) {
                    return;
                }
            }
            virtualControls.showAtPointerAndTrack(pointer);
        });
        this.input.on('pointerup', () => {
            if (this.stpview) {
                this.stpview.handlePauseHudPointerUp();
            }
        });
        this.input.on('pointerupoutside', () => {
            if (this.stpview) {
                this.stpview.handlePauseHudPointerUp();
            }
        });
        this.input.keyboard.on('keydown', (event) => {
            if (event.isTrusted && this.stpview) {
                this.stpview.setInputMode('keyboard');
            }
            if (event.isTrusted && virtualControls.isVisible()) {
                virtualControls.hide();
            }
        });
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            virtualControls.hide();
        });

        this.isReady = true;
    }

    update(time, delta) {
        if (!this.isReady) return;
        this.stpview.update(delta);
    }
}

// Phaser 3 game config — mirrors STPView.main():
//   container.setDisplayMode(625, 625, false)
//   container.setTargetFrameRate(60)
new Phaser.Game({
    type:            Phaser.WEBGL,
    parent:          'game-container',
    width:           625,
    height:          625,
    backgroundColor: '#000000',
    pixelArt:        true,   // disables antialiasing + enables roundPixels; keeps pixel fonts crisp
    fps:             { target: 60, forceSetTimeOut: false },
    scale: {
        mode:       Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width:      625,
        height:     625
    },
    scene:           [BootScene, MenuScene, GameScene, LevelEditorScene]
});
