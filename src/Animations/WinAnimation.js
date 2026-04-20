// Mirrors WinAnimation.java

import BasicAnimation from './BasicAnimation.js';

export default class WinAnimation extends BasicAnimation {

    constructor(manager, altArg) {
        super(manager, altArg);
        this.scene = manager.scene;
        this.timer = 250;
        this.isuck = 0;
        this.isuck2 = 0;

        this._captureTime();

        if (manager.display && manager.display.sound) {
            manager.display.sound.stop();
        }

        this._createAnimations();
        this._createSprites();
        this._createText();

        this.winSound = this.scene.sound.add('win1');
        this.winSound.play();
        this._updateDisplay();
    }

    update() {
        this.timer--;

        if (this.winSound.isPlaying && this.timer === 0) {
            this.timer = 1;
        }

        if (this.manager.consumeSkipRequest()) {
            this.timer = 0;
        }

        this._updateDisplay();

        if (this.timer < 0) {
            this.manager.done();
        }
    }

    render() {}

    destroy() {
        if (this.winSound) {
            this.winSound.stop();
            this.winSound.destroy();
        }

        this._destroySprite(this.backgroundRect);
        this._destroySprite(this.guySprite);
        this._destroySprite(this.princessSprite);
        this._destroySprite(this.guardTopSprite);
        this._destroySprite(this.guardBottomSprite);
        this._destroySprite(this.noticeSprite);
        this._destroySprite(this.youText);
        this._destroySprite(this.bestText);
    }

    _captureTime() {
        const display = this.manager.display;
        if (display && display.timercounter) {
            display.timercounter.stop();
            this.youTime = display.timercounter.getCurTime();
            if (display.isEditorPlay) {
                this.bestTime = '';
            } else {
                display.timercounter.writetime(display.save.getCurrentLevel(), display.timercounter.abs);
                this.bestTime = display.timercounter.gettime(display.save.getCurrentLevel());
            }
        } else {
            this.youTime = '0:00:00';
            this.bestTime = '';
        }
    }

    _createAnimations() {
        this._createAnim('win_introleft', ['guy1', 'guy2'], 2);
        this._createAnim('win_introright', ['menu_princess1', 'menu_princess2'], 2);
        this._createAnim('win_guardleft', ['guardleft1', 'guardleft2'], 2);
        this._createAnim('win_guardright', ['guardright1', 'guardright2'], 2);
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
        this.backgroundRect = this.scene.add.rectangle(0, 0, 625, 625, 0x000000)
            .setOrigin(0, 0).setDepth(100);

        this.guySprite = this.scene.add.sprite(0, 240, 'guy1')
            .setOrigin(0, 0).setDepth(101);
        this.guySprite.play('win_introleft');

        this.princessSprite = this.scene.add.sprite(450, 200, 'menu_princess1')
            .setOrigin(0, 0).setDepth(101);
        this.princessSprite.play('win_introright');

        this.guardTopSprite = this.scene.add.sprite(625, 30, 'guardleft1')
            .setOrigin(0, 0).setDepth(101);
        this.guardTopSprite.play('win_guardleft');

        this.guardBottomSprite = this.scene.add.sprite(625, 400, 'guardleft1')
            .setOrigin(0, 0).setDepth(101);
        this.guardBottomSprite.play('win_guardleft');

        this.noticeSprite = this.scene.add.image(430, 125, 'notice_menu')
            .setOrigin(0, 0).setDepth(102).setVisible(false);
    }

    _createText() {
        this.youText = this.scene.add.text(250, 77, 'YOU: ' + this.youTime, {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#ffffff'
        }).setDepth(102);

        this.bestText = this.scene.add.text(250, 90, this.bestTime === '' ? '' : 'BEST:' + this.bestTime, {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#ffffff'
        }).setDepth(102);
    }

    _updateDisplay() {
        this._updateGuy();
        this._updateGuards();
        this._updatePrincess();
        this.noticeSprite.setVisible(this.timer < 195 && this.timer > 150);
    }

    _updateGuy() {
        if (this.timer > 200) {
            this.isuck = (250 - this.timer) * 3;
            this.guySprite.setPosition(this.isuck, 240);
        } else if (this.timer > 100) {
            this.guySprite.setPosition(this.isuck, 240);
        } else {
            this.guySprite.setPosition(this.isuck + (100 - this.timer) * 6, 240);
        }
    }

    _updateGuards() {
        if (this.timer < 200 && this.timer > 150) {
            this.isuck2 = 625 - (200 - this.timer) * 2;
            this.guardTopSprite.play('win_guardleft', true).setPosition(this.isuck2, 30);
            this.guardBottomSprite.play('win_guardleft', true).setPosition(this.isuck2, 400);
        } else {
            const guardX = this.isuck2 + (150 - this.timer) * 2;
            this.guardTopSprite.play('win_guardright', true).setPosition(guardX, 30);
            this.guardBottomSprite.play('win_guardright', true).setPosition(guardX, 400);
        }
    }

    _updatePrincess() {
        if (this.timer > 150) {
            this.princessSprite.setPosition(450, 200);
        } else {
            this.princessSprite.setPosition(450 + (150 - this.timer) * 2, 200);
        }
    }

    _destroySprite(sprite) {
        if (sprite) {
            sprite.destroy();
        }
    }
}
