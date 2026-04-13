// Menu.js — title screen and level loader
// Mirrors Menu.java

import TimerCounter from './TimerCounter.js';

export default class Menu {
    constructor(scene, sound, save) {
        this.scene = scene;
        this.sound = sound;    // SoundManager
        this.save  = save;     // SaveReader

        this.inmenuimg        = true;
        this.inloaderimg      = false;
        this.loaderImgMenuStatus = 0;
        this.counter          = 0;
        this.displaypress     = false;
        this.timestatinfo     = new TimerCounter(null);
    }

    create() {
        const s = this.scene;

        // --- Menu (title) image ---
        this.menuImg  = s.add.image(0, 0, 'menunew').setOrigin(0, 0).setDisplaySize(625, 625);
        this.pressImg = s.add.image(240, 360, 'space2start').setOrigin(0, 0);

        // --- Loader image ---
        this.loaderImg = s.add.image(0, 0, 'loader').setOrigin(0, 0).setDisplaySize(625, 625);
        this.loaderImg.setVisible(false);

        // Cursor (280, y) per loaderImgMenuStatus
        this.cursorImg = s.add.image(280, 147, 'loadercursor').setOrigin(0, 0);
        this.cursorImg.setVisible(false);

        // --- Times screen ---
        this.timesmenuImg = s.add.image(0, 0, 'timesmenu').setOrigin(0, 0);
        this.timesmenuImg.setVisible(false);

        const timeY = [135, 165, 194, 220, 250, 279];
        this.timesTexts = timeY.map(y =>
            s.add.text(300, y, '', { fontFamily: 'monospace', fontSize: '14px', color: '#ffff00' }).setVisible(false)
        );
        this.timesAllText = s.add.text(190, 305, '', {
            fontFamily: 'monospace', fontSize: '12px', color: '#ffff00'
        }).setVisible(false);

        // --- Input ---
        this.keys = s.input.keyboard.addKeys({
            up:    Phaser.Input.Keyboard.KeyCodes.UP,
            down:  Phaser.Input.Keyboard.KeyCodes.DOWN,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
            esc:   Phaser.Input.Keyboard.KeyCodes.ESC
        });
    }

    update() {
        const K = Phaser.Input.Keyboard.JustDown;
        const k = this.keys;

        if (this.inmenuimg) {
            this.counter++;
            if (this.counter > 45) { this.counter = 0; this.displaypress = !this.displaypress; }
            this.pressImg.setVisible(this.displaypress);

            if (K(k.space) || K(k.enter)) {
                this.sound.sfx('menuchange');
                this._switchToLoader();
            }

        } else if (this.inloaderimg) {
            if (K(k.down)) {
                if (this.loaderImgMenuStatus < 2) {
                    this.loaderImgMenuStatus++;
                    this._setCursorPos();
                    this.sound.sfx('menuchange');
                }
            } else if (K(k.up)) {
                if (this.loaderImgMenuStatus > 0) {
                    this.loaderImgMenuStatus--;
                    this._setCursorPos();
                    this.sound.sfx('menuchange');
                }
            } else if (K(k.esc)) {
                this.sound.sfx('menuchange');
                if (this.loaderImgMenuStatus <= 2) {
                    this._switchToMenu();
                } else {
                    // status 3 → back to times cursor position
                    this.loaderImgMenuStatus = 2;
                    this._setTimesVisible(false);
                    this.cursorImg.setVisible(true);
                    this._setCursorPos();
                }
            } else if (K(k.space) || K(k.enter)) {
                this.sound.sfx('menuchange');
                if (this.loaderImgMenuStatus === 2) {
                    this.loaderImgMenuStatus = 3;
                    this.cursorImg.setVisible(false);
                    this._setTimesVisible(true);
                    this._updateTimesDisplay();
                } else {
                    if (this.loaderImgMenuStatus === 0) this.save.newGame();
                    else                                this.save.loadGame();
                    this._loadGame();
                }
            }
        }
    }

    // --- Helpers ---

    _switchToLoader() {
        this.inmenuimg   = false;
        this.inloaderimg = true;
        this.menuImg.setVisible(false);
        this.pressImg.setVisible(false);
        this.loaderImg.setVisible(true);
        this.cursorImg.setVisible(true);
        this._setCursorPos();
    }

    _switchToMenu() {
        this.inmenuimg   = true;
        this.inloaderimg = false;
        this.loaderImg.setVisible(false);
        this.cursorImg.setVisible(false);
        this._setTimesVisible(false);
        this.menuImg.setVisible(true);
    }

    _setCursorPos() {
        const yPos = [147, 230, 309];
        this.cursorImg.setY(yPos[this.loaderImgMenuStatus] || 147);
    }

    _setTimesVisible(v) {
        this.timesmenuImg.setVisible(v);
        this.timesTexts.forEach(t => t.setVisible(v));
        this.timesAllText.setVisible(v);
    }

    _updateTimesDisplay() {
        const levels = ['Level1','Level2','Level3','Level4','Level5','Level6'];
        let beatCount = 0;
        levels.forEach((lvl, i) => {
            const raw = this.timestatinfo.gettimeraw(lvl);
            const isRecord = raw < this.timestatinfo.getRecTime(lvl);
            this.timesTexts[i].setText(this.timestatinfo.gettime(lvl));
            this.timesTexts[i].setColor(isRecord ? '#00ff00' : '#ffff00');
            if (isRecord) beatCount++;
        });
        this.timesAllText.setText(beatCount >= 6
            ? "Grats on beating my times.\nSee you in the sequel!\n-spotco"
            : '');
    }

    _loadGame() {
        const levelName = this.save.getCurrentLevel();
        if (levelName === 'End') {
            // TODO Phase 4: credits sequence
            this.reset();
        } else {
            this.sound.stop();
            this.scene.scene.start('GameScene', { levelName });
        }
    }

    reset() {
        this.inmenuimg        = true;
        this.inloaderimg      = false;
        this.loaderImgMenuStatus = 0;
        this.counter          = 0;
        this.displaypress     = false;
        this.loaderImg.setVisible(false);
        this.cursorImg.setVisible(false);
        this._setTimesVisible(false);
        this.menuImg.setVisible(true);
        this.pressImg.setVisible(false);
        this.sound.stop();
        this.sound.play('menu1');
    }

    startIntroAnimation() {
        this.inmenuimg   = true;
        this.inloaderimg = false;
        this.counter     = 0;
        this.displaypress = false;
        this.menuImg.setVisible(false);
        this.pressImg.setVisible(false);
        this.loaderImg.setVisible(false);
        this.cursorImg.setVisible(false);
        this._setTimesVisible(false);

        if (this.animationManager) {
            this.animationManager.startAnimation('titleScreenAnimation', null);
        }
    }

    finishIntroAnimation() {
        this.inmenuimg   = true;
        this.inloaderimg = false;
        this.counter     = 0;
        this.displaypress = false;
        this.loaderImg.setVisible(false);
        this.cursorImg.setVisible(false);
        this._setTimesVisible(false);
        this.menuImg.setVisible(true);
        this.pressImg.setVisible(false);
    }
}
