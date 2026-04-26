// Mirrors FinalTowerLedgeActiveAnimation.java

import BasicAnimation from './BasicAnimation.js';
import TimerCounter from '../TimerCounter.js';

export default class FinalTowerLedgeActiveAnimation extends BasicAnimation {

    constructor(manager, altArg) {
        super(manager, altArg);
        this.scene = manager.scene;
        this.skipSaveTime = altArg !== null && altArg.skipSaveTime === true;
        this.playerx = 543;
        this.playery = 327;
        this.lastdir = false;
        this.currentanim = 'ledge_standleft';
        this.youTime = '0:00:00';
        this.bestTime = '0:00:00';
        this.keys = this.scene.input.keyboard.addKeys({
            left:  Phaser.Input.Keyboard.KeyCodes.LEFT,
            right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            a:     Phaser.Input.Keyboard.KeyCodes.A,
            d:     Phaser.Input.Keyboard.KeyCodes.D
        });

        this._captureTime();

        if (manager.display && manager.display.sound) {
            manager.display.sound.stop();
            manager.display.sound.play('wind');
        }

        this._createAnimations();
        this._createSprites();
        this._createText();
        this._makeHitboxes();
        this._updateAnimState();
    }

    update() {
        if (this.keys.right.isDown || this.keys.d.isDown) {
            this.playerx++;
            this.lastdir = true;
            this.currentanim = 'ledge_walkright';
        } else if (this.keys.left.isDown || this.keys.a.isDown) {
            this.playerx--;
            this.lastdir = false;
            this.currentanim = 'ledge_walkleft';
        } else {
            this.currentanim = this.lastdir ? 'ledge_standright' : 'ledge_standleft';
        }

        if (this.playerx > 543) {
            this.playerx = 543;
        }

        this._makeHitboxes();
        this._updateAnimState();

        if (_rectsIntersect(this.playerbox, this.princessbox)) {
            this.manager.done();
        }
    }

    render() {}

    destroy() {
        this._destroySprite(this.backgroundSprite);
        this._destroySprite(this.foregroundSprite);
        this._destroySprite(this.princessSprite);
        this._destroySprite(this.playerSprite);
        this._destroySprite(this.youText);
        this._destroySprite(this.bestText);
    }

    _captureTime() {
        const display = this.manager.display;
        const levelName = _getCurrentLevelName(display);
        this.capturedLevelName = levelName;
        this.capturedBestTimeRaw = null;
        if (display && display.timercounter) {
            display.timercounter.stop();
            this.youTime = display.timercounter.getCurTime();
            if (display.isEditorPlay) {
                this.bestTime = '';
            } else if (levelName === null) {
                this.bestTime = '';
            } else if (!this.skipSaveTime) {
                this.capturedBestTimeRaw = display.timercounter.gettimeraw(levelName);
                this.manager.pendingDebugBestTimeRestore = () => {
                    TimerCounter.setSavedTimeRaw(levelName, this.capturedBestTimeRaw);
                };
                display.timercounter.writetime(levelName, display.timercounter.abs);
                this.bestTime = display.timercounter.gettime(levelName);
            } else {
                this.bestTime = display.timercounter.gettime(levelName);
            }
        }
    }

    restoreCapturedBestTime() {
        if (this.capturedLevelName === null || this.capturedBestTimeRaw === null) {
            return;
        }
        TimerCounter.setSavedTimeRaw(this.capturedLevelName, this.capturedBestTimeRaw);
    }

    _createAnimations() {
        this._createAnim('ledge_princess', ['princess1', 'princess2'], 1.25);
        this._createAnim('ledge_walkleft', ['guy_walkleft', 'guy_standleft', 'guy_walkleft2', 'guy_standleft'], 4);
        this._createAnim('ledge_walkright', ['guy_walkright', 'guy_standright', 'guy_walkright2', 'guy_standright'], 4);
        this._createAnim('ledge_standleft', ['guy_standleft'], 1);
        this._createAnim('ledge_standright', ['guy_standright'], 1);
    }

    _createAnim(key, frames, frameRate) {
        if (!this.scene.anims.exists(key)) {
            this.scene.anims.create({
                key,
                frames: frames.map((frameKey) => ({ key: frameKey })),
                frameRate: frameRate,
                repeat: -1
            });
        }
    }

    _createSprites() {
        this.backgroundSprite = this.scene.add.image(0, 0, 'firstview')
            .setOrigin(0, 0).setDepth(100);

        this.princessSprite = this.scene.add.sprite(348, 318, 'princess1')
            .setOrigin(0, 0).setDepth(101);
        this.princessSprite.play('ledge_princess');

        this.playerSprite = this.scene.add.sprite(this.playerx, this.playery, 'guy_standleft')
            .setOrigin(0, 0).setDepth(101);
        this.playerSprite.play('ledge_standleft');

        this.foregroundSprite = this.scene.add.image(0, 0, 'firstviewrail')
            .setOrigin(0, 0).setDepth(102);

        this.princessbox = {
            x: 348,
            y: 318,
            width: this.princessSprite.width,
            height: this.princessSprite.height
        };
    }

    _createText() {
        this.youText = this.scene.add.text(250, 77, 'YOU: ' + this.youTime, {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#ffffff'
        }).setDepth(103);

        this.bestText = this.scene.add.text(250, 90, this.bestTime === '' ? '' : 'BEST:' + this.bestTime, {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#ffffff'
        }).setDepth(103);
    }

    _makeHitboxes() {
        this.playerbox = {
            x: this.playerx,
            y: this.playery,
            width: this.playerSprite.width,
            height: this.playerSprite.height
        };
    }

    _updateAnimState() {
        this.playerSprite.setPosition(this.playerx, this.playery);
        if (this.playerSprite.anims.currentAnim === null ||
                this.playerSprite.anims.currentAnim.key !== this.currentanim) {
            this.playerSprite.play(this.currentanim);
        }
    }

    _destroySprite(sprite) {
        if (sprite) {
            sprite.destroy();
        }
    }
}

function _getCurrentLevelName(display) {
    if (display && display.currentLevelName) {
        return display.currentLevelName;
    }
    if (display && display.save && display.save.getCurrentLevel) {
        return display.save.getCurrentLevel();
    }
    return null;
}

function _rectsIntersect(a, b) {
    return a.x            < b.x + b.width  &&
           a.x + a.width  > b.x            &&
           a.y            < b.y + b.height &&
           a.y + a.height > b.y;
}
