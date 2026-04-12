// Mirrors DeathAnimation.java

import BasicAnimation from './BasicAnimation.js';

export default class DeathAnimation extends BasicAnimation {

    constructor(manager, altArg) {
        super(manager, altArg);
        this.scene = manager.scene;
        this.timer = 100;
        this.killerimage = altArg;

        if (manager.display && manager.display.sound) {
            manager.display.sound.stop();
        }

        this._createAnimations();
        this._createSprites();

        this.dieSound = this.scene.sound.add('die1');
        this.dieSound.play();
        this._updateDisplay();
    }

    update() {
        this.timer--;

        if (this.dieSound.isPlaying && this.timer === 0) {
            this.timer = 1;
        }

        if (Phaser.Input.Keyboard.JustDown(this.manager.spaceKey)) {
            this.dieSound.stop();
            this.timer = 5;
        }

        this._updateDisplay();

        if (this.timer === 0) {
            this.manager.done();
        }
    }

    render() {}

    destroy() {
        if (this.dieSound) {
            this.dieSound.stop();
            this.dieSound.destroy();
        }

        this._destroySprite(this.backgroundRect);
        this._destroySprite(this.guySprite);
        this._destroySprite(this.deadSprite);
        this._destroySprite(this.killerSprite);
        this._destroySprite(this.caughtSprite);
    }

    _createAnimations() {
        if (!this.scene.anims.exists('death_introleft')) {
            this.scene.anims.create({
                key: 'death_introleft',
                frames: [{ key: 'guy1' }, { key: 'guy2' }],
                frameRate: 2,
                repeat: -1
            });
        }
    }

    _createSprites() {
        this.backgroundRect = this.scene.add.rectangle(0, 0, 625, 625, 0x000000)
            .setOrigin(0, 0).setDepth(100);

        this.guySprite = this.scene.add.sprite(150, 250, 'guy1')
            .setOrigin(0, 0).setDepth(101).setVisible(false);
        this.guySprite.play('death_introleft');

        this.deadSprite = this.scene.add.image(130, 340, 'guydead')
            .setOrigin(0, 0).setDepth(101).setVisible(false);

        this.killerSprite = this.scene.add.image(625, 290, this.killerimage)
            .setOrigin(0, 0).setDepth(101);

        this.caughtSprite = this.scene.add.image(95, 205, 'CAUGHT')
            .setOrigin(0, 0).setDepth(102).setVisible(false);
    }

    _updateDisplay() {
        if (this.timer > 50) {
            this.guySprite.setVisible(true);
            this.deadSprite.setVisible(false);
        } else {
            this.guySprite.setVisible(false);
            this.deadSprite.setVisible(true);
        }

        this.killerSprite.setPosition(625 - (100 - this.timer) * 10, 290);
        this.caughtSprite.setVisible(this.timer < 50 && this.timer > 25);
    }

    _destroySprite(sprite) {
        if (sprite) {
            sprite.destroy();
        }
    }
}
