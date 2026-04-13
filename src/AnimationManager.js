// Mirrors AnimationManager.java

import CreditScrollAnimation          from './Animations/CreditScrollAnimation.js';
import CrushedAnimation               from './Animations/CrushedAnimation.js';
import DeathAnimation                 from './Animations/DeathAnimation.js';
import FinalTowerLedgeActiveAnimation from './Animations/FinalTowerLedgeActiveAnimation.js';
import KnightBossInitAnimation        from './Animations/KnightBossInitAnimation.js';
import TitleScreenAnimation           from './Animations/TitleScreenAnimation.js';
import WinAnimation                   from './Animations/WinAnimation.js';

export default class AnimationManager {

    constructor(scene, display) {
        this.scene            = scene;
        this.display          = display;
        this.inAnimation      = false;
        this.currentAnimation = null;
        this.currentType      = null;
        this.altArg           = null;
        this.spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    startAnimation(type, altArg) {
        if (this.inAnimation) {
            return;
        }

        const animation = this._createAnimation(type, altArg);
        if (animation === null) {
            return;
        }

        this.currentType      = type;
        this.altArg           = altArg;
        this.currentAnimation = animation;
        this.inAnimation      = true;
    }

    update(game) {
        if (!this.inAnimation || this.currentAnimation === null) {
            return;
        }

        if (this.currentAnimation.update) {
            this.currentAnimation.update(game);
        }
    }

    render() {
        if (!this.inAnimation || this.currentAnimation === null) {
            return;
        }

        if (this.currentAnimation.render) {
            this.currentAnimation.render();
        }
    }

    done() {
        const completedType = this.currentType;
        const completedAnimation = this.currentAnimation;

        if (completedAnimation && completedAnimation.destroy) {
            completedAnimation.destroy();
        }

        this.inAnimation      = false;
        this.currentAnimation = null;
        this.currentType      = null;
        this.altArg           = null;

        if (completedType === 'deathAnimation' || completedType === 'crushedAnimation') {
            this._restartCurrentLevel();
        } else if (completedType === 'winAnimation') {
            this._advanceToNextLevel();
        } else if (completedType === 'knightBossInitAnimation') {
            this._activateKnightBoss();
        } else if (completedType === 'finalTowerLedge') {
            this.startAnimation('creditscroll', null);
        } else if (completedType === 'creditscroll') {
            this._returnToTitle();
        } else if (completedType === 'titleScreenAnimation') {
            if (this.display && this.display.finishIntroAnimation) {
                this.display.finishIntroAnimation();
            }
        }
    }

    _createAnimation(type, altArg) {
        if (type === 'deathAnimation') {
            return new DeathAnimation(this, altArg);
        } else if (type === 'winAnimation') {
            return new WinAnimation(this, altArg);
        } else if (type === 'titleScreenAnimation') {
            return new TitleScreenAnimation(this, altArg);
        } else if (type === 'crushedAnimation') {
            return new CrushedAnimation(this, altArg);
        } else if (type === 'knightBossInitAnimation') {
            return new KnightBossInitAnimation(this, altArg);
        } else if (type === 'finalTowerLedge') {
            return new FinalTowerLedgeActiveAnimation(this, altArg);
        } else if (type === 'creditscroll') {
            return new CreditScrollAnimation(this, altArg);
        }
        return null;
    }

    _restartCurrentLevel() {
        if (this.display && this.display.sound) {
            this.display.sound.stop();
        }

        const levelName = this._getCurrentLevelName();
        if (levelName !== null) {
            this.scene.scene.restart({ levelName: levelName });
        } else {
            this.scene.scene.restart();
        }
    }

    _advanceToNextLevel() {
        if (!this.display || !this.display.save) {
            this.scene.scene.start('MenuScene');
            return;
        }

        const levelName = this._getCurrentLevelName();
        if (this.display.timercounter && levelName !== null) {
            this.display.timercounter.stop();
            this.display.timercounter.writetime(levelName, this.display.timercounter.abs);
        }
        if (this.display.sound) {
            this.display.sound.stop();
        }

        this.display.save.nextLevel();
        const nextLevelName = this.display.save.getCurrentLevel();

        if (nextLevelName === 'End') {
            this.scene.scene.start('MenuScene');
        } else {
            this.scene.scene.start('GameScene', { levelName: nextLevelName });
        }
    }

    _activateKnightBoss() {
        if (!this.display || !this.display.enemyList) {
            return;
        }

        for (const enemy of this.display.enemyList) {
            if (enemy.getType && enemy.getType() === 67) {
                enemy.activated = true;
            }
        }
        if (this.display.sound) {
            this.display.sound.sfx('standandfight');
        }
    }

    _returnToTitle() {
        if (this.display && this.display.save && this.display.save.getCurrentLevel &&
                this.display.save.getCurrentLevel() !== 'End') {
            this.display.save.nextLevel();
        }
        this.scene.scene.start('MenuScene', { playIntro: true });
    }

    _getCurrentLevelName() {
        if (this.display && this.display.save && this.display.save.getCurrentLevel) {
            return this.display.save.getCurrentLevel();
        }
        return null;
    }
}
