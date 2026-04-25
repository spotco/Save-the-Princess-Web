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
        this.pointerSkipRequested = false;
        this.pendingDebugBestTimeRestore = null;
        this.spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        this.scene.input.on('pointerdown', () => {
            if (this.inAnimation) {
                this.pointerSkipRequested = true;
            }
        });
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
        this._hideVirtualControls();
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
        const completedAltArg = this.altArg;

        if (completedAnimation && completedAnimation.destroy) {
            completedAnimation.destroy();
        }

        this.inAnimation      = false;
        this.currentAnimation = null;
        this.currentType      = null;
        this.altArg           = null;
        this.pointerSkipRequested = false;

        if (completedType === 'deathAnimation' || completedType === 'crushedAnimation') {
            this._restartCurrentLevel();
        } else if (completedType === 'winAnimation') {
            this._advanceToNextLevel();
        } else if (completedType === 'knightBossInitAnimation') {
            this._activateKnightBoss();
        } else if (completedType === 'finalTowerLedge') {
            this.startAnimation('creditscroll', completedAltArg);
        } else if (completedType === 'creditscroll') {
            this._returnToTitle(completedAltArg);
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

    consumeSkipRequest() {
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.pointerSkipRequested = false;
            return true;
        }
        if (this.pointerSkipRequested) {
            this.pointerSkipRequested = false;
            return true;
        }
        return false;
    }

    _restartCurrentLevel() {
        if (this.display &&
                this.display.restoreSavePointIfAvailable &&
                this.display.restoreSavePointIfAvailable()) {
            return;
        }

        if (this.display && this.display.sound) {
            this.display.sound.stop();
        }

        if (this._isEditorPlay()) {
            this.scene.scene.restart(this.display.getEditorPlayGameData());
            return;
        }

        const levelName = this._getCurrentLevelName();
        if (levelName !== null) {
            this.scene.scene.restart({ levelName: levelName });
        } else {
            this.scene.scene.restart();
        }
    }

    _advanceToNextLevel(skipSaveTime = false) {
        if (this._isEditorPlay()) {
            this._coverSceneForTransition();
            if (this.display.timercounter) {
                this.display.timercounter.stop();
            }
            if (this.display.sound) {
                this.display.sound.stop();
            }
            this.scene.scene.start('LevelEditorScene', this.display.getEditorPlayEditorData());
            return;
        }

        if (!this.display || !this.display.save) {
            this.scene.scene.start('MenuScene');
            return;
        }

        const levelName = this._getCurrentLevelName();
        if (!skipSaveTime && this.display.timercounter && levelName !== null) {
            this.display.timercounter.stop();
            this.display.timercounter.writetime(levelName, this.display.timercounter.abs);
        } else if (this.display.timercounter) {
            this.display.timercounter.stop();
        }
        if (this.display.sound) {
            this.display.sound.stop();
        }
        this.pendingDebugBestTimeRestore = null;

        this.display.save.completeLevel();
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

    _returnToTitle(altArg) {
        if (this._isEditorPlay()) {
            this._coverSceneForTransition();
            if (this.display && this.display.sound) {
                this.display.sound.stop();
            }
            this.scene.scene.start('LevelEditorScene', this.display.getEditorPlayEditorData());
            return;
        }

        if (this.display && this.display.save && this.display.save.getCurrentLevel &&
                this.display.save.getCurrentLevel() !== 'End' &&
                !(altArg && altArg.skipSaveTime === true)) {
            this.display.save.completeLevel();
        }
        this.pendingDebugBestTimeRestore = null;
        this.scene.scene.start('MenuScene', { playIntro: true });
    }

    _returnToMenuImmediately() {
        if (this.currentAnimation && this.currentAnimation.destroy) {
            this.currentAnimation.destroy();
        }

        this.inAnimation      = false;
        this.currentAnimation = null;
        this.currentType      = null;
        this.altArg           = null;

        if (this.display && this.display.sound) {
            this.display.sound.stop();
        }

        if (this._isEditorPlay()) {
            this._coverSceneForTransition();
            this.scene.scene.start('LevelEditorScene', this.display.getEditorPlayEditorData());
            return;
        }

        this.scene.scene.start('MenuScene', { playIntro: false });
    }

    debugReturnToMenu() {
        if (!this.inAnimation) {
            return false;
        }

        if (this.currentType === 'winAnimation') {
            if (this.currentAnimation && this.currentAnimation.restoreCapturedBestTime) {
                this.currentAnimation.restoreCapturedBestTime();
            }
            if (this.currentAnimation && this.currentAnimation.destroy) {
                this.currentAnimation.destroy();
            }
            this.inAnimation      = false;
            this.currentAnimation = null;
            this.currentType      = null;
            this.altArg           = null;
            this.pointerSkipRequested = false;
            this._advanceToNextLevel(true);
            return true;
        }

        if (this.currentType !== 'finalTowerLedge' && this.currentType !== 'creditscroll') {
            return false;
        }
        if (this.currentAnimation && this.currentAnimation.restoreCapturedBestTime) {
            this.currentAnimation.restoreCapturedBestTime();
        }
        this._restorePendingDebugBestTime();
        this._returnToMenuImmediately();
        return true;
    }

    _hideVirtualControls() {
        if (window.stpVirtualControls && window.stpVirtualControls.hide) {
            window.stpVirtualControls.hide();
            return;
        }
        const overlay = document.getElementById('virtual-controls');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    _coverSceneForTransition() {
        this.scene.add.rectangle(0, 0, 625, 625, 0x000000)
            .setOrigin(0, 0)
            .setDepth(1000);
    }

    _restorePendingDebugBestTime() {
        if (!this.pendingDebugBestTimeRestore) {
            return;
        }
        const restore = this.pendingDebugBestTimeRestore;
        this.pendingDebugBestTimeRestore = null;
        restore();
    }

    _getCurrentLevelName() {
        if (this.display && this.display.currentLevelName) {
            return this.display.currentLevelName;
        }
        if (this.display && this.display.save && this.display.save.getCurrentLevel) {
            return this.display.save.getCurrentLevel();
        }
        return null;
    }

    _isEditorPlay() {
        return !!(this.display &&
            this.display.isEditorPlay &&
            this.display.getEditorPlayGameData &&
            this.display.getEditorPlayEditorData);
    }
}
