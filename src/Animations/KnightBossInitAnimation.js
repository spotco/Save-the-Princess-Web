// Mirrors KnightBossInitAnimation.java

import BasicAnimation from './BasicAnimation.js';

export default class KnightBossInitAnimation extends BasicAnimation {

    constructor(manager, altArg) {
        super(manager, altArg);
        this.scene = manager.scene;
        this.timer = 250;
        this.testcounter = 0;
        this.standsto = 0;

        if (manager.display && manager.display.sound) {
            manager.display.sound.stop();
            manager.display.sound.play('boss');
        }

        this._createAnimations();
        this._createSprites();
        this._updateDisplay();
    }

    update() {
        this.testcounter++;
        this.timer--;

        if (this.manager.consumeSkipRequest()) {
            this.timer = 1;
        }

        this._updateDisplay();

        if (this.timer < 0) {
            this.manager.done();
        }
    }

    render() {}

    destroy() {
        this._destroySprite(this.backgroundRect);
        this._destroySprite(this.guySprite);
        this._destroySprite(this.knightSprite);
        this._destroySprite(this.weMustFightSprite);
    }

    _createAnimations() {
        if (!this.scene.anims.exists('knightboss_introleft')) {
            this.scene.anims.create({
                key: 'knightboss_introleft',
                frames: [{ key: 'guy1' }, { key: 'guy2' }],
                frameRate: 2,
                repeat: -1
            });
        }
    }

    _createSprites() {
        this.backgroundRect = this.scene.add.rectangle(0, 0, 625, 625, 0x000000)
            .setOrigin(0, 0).setDepth(100);

        this.guySprite = this.scene.add.sprite(0, 240, 'guy1')
            .setOrigin(0, 0).setDepth(101);
        this.guySprite.play('knightboss_introleft');

        this.knightSprite = this.scene.add.image(625, 150, 'knightkiller')
            .setOrigin(0, 0).setDepth(101);

        this.weMustFightSprite = this.scene.add.image(450, 30, 'wemustfight')
            .setOrigin(0, 0).setDepth(102).setVisible(false);
    }

    _updateDisplay() {
        if (this.timer > 150) {
            this.guySprite.setPosition(this.testcounter, 240);
            this.knightSprite.setPosition(625 - this.testcounter, 150);
            this.standsto = this.testcounter;
            this.weMustFightSprite.setVisible(false);
        } else if (this.timer > 50) {
            this.guySprite.setPosition(this.standsto, 240);
            this.knightSprite.setPosition(625 - this.standsto, 150);
            this.weMustFightSprite.setVisible(true);
        } else {
            this.guySprite.setPosition(this.standsto, 240);
            this.knightSprite.setPosition(625 - this.standsto - (50 - this.timer), 150);
            this.weMustFightSprite.setVisible(false);
        }
    }

    _destroySprite(sprite) {
        if (sprite) {
            sprite.destroy();
        }
    }
}
