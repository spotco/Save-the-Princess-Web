// Mirrors TitleScreenAnimation.java

import BasicAnimation from './BasicAnimation.js';

export default class TitleScreenAnimation extends BasicAnimation {

    static INTRO_LENGTH = 1825;

    constructor(manager, altArg) {
        super(manager, altArg);
        this.scene = manager.scene;
        this.timer = TitleScreenAnimation.INTRO_LENGTH;

        this._createAnimations();
        this._createSprites();
        this._updateDisplay();
    }

    update() {
        if (this.manager.consumeSkipRequest()) {
            this.manager.done();
            return;
        }

        this.timer--;
        this._updateDisplay();

        if (this.timer < 0) {
            this.manager.done();
        }
    }

    render() {}

    destroy() {
        this._destroySprite(this.logoSprite);
        this._destroySprite(this.guySprite);
        this._destroySprite(this.princessSprite);
        this._destroySprite(this.heartSprite);
        this._destroySprite(this.guardTopSprite);
        this._destroySprite(this.guardBottomSprite);
        this._destroySprite(this.menuScrollSprite);
    }

    _createAnimations() {
        this._createAnim('title_introleft', ['guy1', 'guy2'], 2);
        this._createAnim('title_introright', ['menu_princess1', 'menu_princess2'], 2);
        this._createAnim('title_guardleft', ['guardleft1', 'guardleft2'], 2);
        this._createAnim('title_guardright', ['guardright1', 'guardright2'], 2);
        this._createAnim('title_spotcologo', [
            'spotcologo1', 'spotcologo2', 'spotcologo3', 'spotcologo4',
            'spotcologo5', 'spotcologo6', 'spotcologo7'
        ], 10);
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
        this.logoSprite = this.scene.add.sprite(235, 270, 'spotcologo1')
            .setOrigin(0, 0).setDepth(100).setVisible(false);
        this.logoSprite.play('title_spotcologo');

        this.guySprite = this.scene.add.sprite(0, 240, 'guy1')
            .setOrigin(0, 0).setDepth(100).setVisible(false);
        this.guySprite.play('title_introleft');

        this.princessSprite = this.scene.add.sprite(0, 200, 'menu_princess1')
            .setOrigin(0, 0).setDepth(100).setVisible(false);
        this.princessSprite.play('title_introright');

        this.heartSprite = this.scene.add.image(285, 180, 'heart')
            .setOrigin(0, 0).setDepth(100).setVisible(false);

        this.guardTopSprite = this.scene.add.sprite(0, 30, 'guardleft1')
            .setOrigin(0, 0).setDepth(100).setVisible(false);
        this.guardTopSprite.play('title_guardleft');

        this.guardBottomSprite = this.scene.add.sprite(0, 400, 'guardleft1')
            .setOrigin(0, 0).setDepth(100).setVisible(false);
        this.guardBottomSprite.play('title_guardleft');

        this.menuScrollSprite = this.scene.add.image(0, 0, 'menunew')
            .setOrigin(0, 0).setDisplaySize(625, 625).setDepth(100).setVisible(false);
    }

    _updateDisplay() {
        const introLength = TitleScreenAnimation.INTRO_LENGTH;
        this.logoSprite.setVisible(false);
        this.guySprite.setVisible(false);
        this.princessSprite.setVisible(false);
        this.heartSprite.setVisible(false);
        this.guardTopSprite.setVisible(false);
        this.guardBottomSprite.setVisible(false);
        this.menuScrollSprite.setVisible(false);

        if (this.timer > (introLength - 200)) {
            this.logoSprite.setVisible(true);
            if (this.timer > (introLength - 100)) {
                this.logoSprite.setAlpha((introLength - this.timer) / 100);
            } else {
                this.logoSprite.setAlpha(this.timer / 100);
            }
            return;
        }

        if (this.timer > (introLength - 350)) {
            const offset = introLength - 200 - this.timer;
            this.guySprite.setVisible(true).setPosition(85 + offset, 240);
            this.princessSprite.setVisible(true).setPosition(485 - offset, 200);
            return;
        }

        if (this.timer > (introLength - 350 * 2)) {
            this.guySprite.setVisible(true).setPosition(235, 240);
            this.princessSprite.setVisible(true).setPosition(335, 200);
            this.heartSprite.setVisible(true);
            return;
        }

        if (this.timer > (introLength - 350 * 2 - 200)) {
            const guardX = 600 - ((introLength - 350 * 2) - this.timer);
            this.guySprite.setVisible(true).setPosition(235, 240);
            this.princessSprite.setVisible(true).setPosition(335, 200);
            this.heartSprite.setVisible(true);
            this.guardTopSprite.setVisible(true).play('title_guardleft', true).setPosition(guardX, 30);
            this.guardBottomSprite.setVisible(true).play('title_guardleft', true).setPosition(guardX, 400);
            return;
        }

        if (this.timer > (introLength - 350 * 2 - 500)) {
            const offset = (introLength - 350 * 2 - 200) - this.timer;
            this.guySprite.setVisible(true).setPosition(235, 240).setDisplaySize(66, 150);
            this.princessSprite.setVisible(true).setPosition(335 + offset, 200);
            this.guardTopSprite.setVisible(true).play('title_guardright', true).setPosition(400 + offset, 30);
            this.guardBottomSprite.setVisible(true).play('title_guardright', true).setPosition(400 + offset, 400);
            return;
        }

        this.guySprite.setVisible(true).setDisplaySize(this.guySprite.width, this.guySprite.height)
            .setPosition(235 + ((introLength - 350 * 2 - 500) - this.timer) * 2, 240);

        if (this.timer > (introLength - 350 * 2 - 700)) {
            return;
        }

        this.menuScrollSprite.setVisible(true);
        this.menuScrollSprite.setPosition(0, -this.timer);
    }

    _destroySprite(sprite) {
        if (sprite) {
            sprite.destroy();
        }
    }
}
