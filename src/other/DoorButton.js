// DoorButton.js — pressure plate that toggles all doors on the screen
// Mirrors DoorButton.java

export default class DoorButton {

    constructor(x, y, scene) {
        this.x      = x;
        this.y      = y;
        this.hitbox = { x: x + 6, y: y + 6, width: 12, height: 10 };

        this._isStep = false;

        this._spriteUp   = scene.add.image(x, y, 'presspush')    .setOrigin(0, 0).setDepth(5);
        this._spriteDown = scene.add.image(x, y, 'presspushdown').setOrigin(0, 0).setDepth(5);
        this._spriteUp.stpThreeRenderMode = 'floorFace';
        this._spriteDown.stpThreeRenderMode = 'floorFace';
        this._spriteDown.setVisible(false);
    }

    update(game) {
        const playerOn = _rectsIntersect(game.player.hitbox, this.hitbox);
        const enemyOn  = this._enemyStep(game.enemyList);

        if ((playerOn || enemyOn) && !this._isStep) {
            game.sound.sfx('gate');
            for (const o of game.objectList) {
                if (o.getType && o.getType() === 51) {
                    o.openorclose(game);
                }
            }
            this._isStep = true;
        } else if (!playerOn && !enemyOn) {
            this._isStep = false;
        }
    }

    _enemyStep(enemyList) {
        for (const e of enemyList) {
            if (e.hitbox && _rectsIntersect(e.hitbox, this.hitbox) && e.getType() !== 27) {
                return true;
            }
        }
        return false;
    }

    render() {
        this._spriteUp  .setVisible(!this._isStep);
        this._spriteDown.setVisible( this._isStep);
    }

    hide() {
        this._spriteUp  .setVisible(false);
        this._spriteDown.setVisible(false);
    }
}

function _rectsIntersect(a, b) {
    return a.x            < b.x + b.width  &&
           a.x + a.width  > b.x            &&
           a.y            < b.y + b.height &&
           a.y + a.height > b.y;
}
