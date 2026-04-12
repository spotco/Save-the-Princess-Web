// Mirrors CreditScrollAnimation.java

import BasicAnimation from './BasicAnimation.js';

export default class CreditScrollAnimation extends BasicAnimation {

    constructor(manager, altArg) {
        super(manager, altArg);
        this.scene = manager.scene;
        this.cloc = 500;
        this.waittimer = -1;
        this.postscripttimer = 0;
        this.postscript = false;
        this.hasPlayedPostscriptSfx = false;

        if (manager.display && manager.display.sound) {
            manager.display.sound.stop();
            manager.display.sound.play('credits');
        }

        this._createSprites();
        this._updateDisplay();
    }

    update() {
        if (!this.postscript) {
            if (this.cloc > -2300) {
                this.cloc -= this._getScrollSpeed();
                if (this.cloc <= -2300) {
                    this.cloc = -2300;
                    this.waittimer = 400;
                }
            } else if (this.waittimer > 0) {
                this.waittimer--;
            } else {
                this.postscript = true;
            }
        } else {
            this.postscripttimer++;
            if (!this.hasPlayedPostscriptSfx && this.postscripttimer >= 89) {
                this.hasPlayedPostscriptSfx = true;
                if (this.manager.display && this.manager.display.sound) {
                    this.manager.display.sound.sfx('standandfight');
                }
            }

            if (this.postscripttimer >= 740) {
                this.manager.done();
                return;
            }
        }

        this._updateDisplay();
    }

    render() {}

    destroy() {
        this._destroySprite(this.bgStarsSprite);
        this._destroySprite(this.scrollSprite);
        this._destroySprite(this.fgSprite);
        this._destroySprite(this.postscriptBgSprite);
        this._destroySprite(this.postscriptKnightSprite);
        this._destroySprite(this.noticeSprite);
        this._destroySprite(this.weMustFightSprite);
        this._destroySprite(this.tbcSprite);
    }

    _createSprites() {
        this.bgStarsSprite = this.scene.add.image(0, 0, 'firstend2')
            .setOrigin(0, 0).setDepth(100);

        this.scrollSprite = this.scene.add.image(0, this.cloc - 100, 'creditslist')
            .setOrigin(0, 0).setDepth(101);

        this.fgSprite = this.scene.add.image(0, 0, 'creditscreen')
            .setOrigin(0, 0).setDepth(102);

        this.postscriptBgSprite = this.scene.add.image(0, 0, 'postscriptbg')
            .setOrigin(0, 0).setDepth(103).setVisible(false);

        this.postscriptKnightSprite = this.scene.add.image(0, 0, 'postscriptknight')
            .setOrigin(0, 0).setDepth(104).setVisible(false);

        this.noticeSprite = this.scene.add.image(0, 0, 'final_notice')
            .setOrigin(0, 0).setDepth(104).setVisible(false);

        this.weMustFightSprite = this.scene.add.image(0, 0, 'wemustfight')
            .setOrigin(0, 0).setDepth(104).setVisible(false);

        this.tbcSprite = this.scene.add.image(165, 222, 'tbc')
            .setOrigin(0, 0).setDepth(104).setVisible(false);
    }

    _getScrollSpeed() {
        if (this.cloc > 200) {
            return 1;
        }
        if (this.cloc > -1500) {
            return 2;
        }
        return 1;
    }

    _updateDisplay() {
        if (!this.postscript) {
            this.bgStarsSprite.setVisible(true);
            this.scrollSprite.setVisible(true).setPosition(0, this.cloc - 100);
            this.fgSprite.setVisible(true);
            this.postscriptBgSprite.setVisible(false);
            this.postscriptKnightSprite.setVisible(false);
            this.noticeSprite.setVisible(false);
            this.weMustFightSprite.setVisible(false);
            this.tbcSprite.setVisible(false);
            return;
        }

        this.bgStarsSprite.setVisible(false);
        this.scrollSprite.setVisible(false);
        this.fgSprite.setVisible(false);

        if (this.postscripttimer < 240) {
            this.postscriptBgSprite.setVisible(true);
            this.noticeSprite.setVisible(this.postscripttimer > 40);
            this.postscriptKnightSprite.setVisible(this.postscripttimer > 50);
            this.weMustFightSprite.setVisible(this.postscripttimer > 90 && this.postscripttimer < 190);

            if (this.postscripttimer >= 190) {
                this.postscriptKnightSprite.setPosition(-(this.postscripttimer - 190), 0);
            } else {
                this.postscriptKnightSprite.setPosition(0, 0);
            }
            this.tbcSprite.setVisible(false);
        } else {
            this.postscriptBgSprite.setVisible(false);
            this.postscriptKnightSprite.setVisible(false);
            this.noticeSprite.setVisible(false);
            this.weMustFightSprite.setVisible(false);
            this.tbcSprite.setVisible(true);
        }
    }

    _destroySprite(sprite) {
        if (sprite) {
            sprite.destroy();
        }
    }
}
