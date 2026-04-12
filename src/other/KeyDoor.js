// KeyDoor.js — locked door opened with a key
// Mirrors KeyDoor.java

export default class KeyDoor {

    constructor(x, y, scene) {
        this.x        = x;
        this.y        = y;
        // Oversized hitbox for detection (mirrors Java: x-1, y-1, 27, 27)
        this.hitbox   = { x: x - 1, y: y - 1, width: 27, height: 27 };
        this._isActive       = true;
        this._hasAddedStatic = false;

        this.sprite = scene.add.image(x, y, 'keydoor').setOrigin(0, 0).setDepth(6);
    }

    update(game) {
        if (!this._hasAddedStatic) {
            game.staticsList.push({ x: this.x, y: this.y, width: 25, height: 25 });
            this._hasAddedStatic = true;
        }
        if (this._isActive && _rectsIntersect(game.player.hitbox, this.hitbox) && game.player.haskey) {
            this._removeme(game);
            game.player.haskey = false;
        }
    }

    _removeme(game) {
        this._isActive = false;
        // Remove static
        for (let i = 0; i < game.staticsList.length; i++) {
            const r = game.staticsList[i];
            if (r.x === this.x && r.y === this.y) {
                game.staticsList.splice(i, 1);
                break;
            }
        }
        game.sound.sfx('unlockdoor');
        // Remove self from objectList
        for (let i = 0; i < game.objectList.length; i++) {
            if (game.objectList[i] === this) {
                game.objectList.splice(i, 1);
                break;
            }
        }
        this.sprite.setVisible(false);
    }

    render() {
        this.sprite.setVisible(this._isActive);
    }

    hide() {
        this.sprite.setVisible(false);
    }
}

function _rectsIntersect(a, b) {
    return a.x            < b.x + b.width  &&
           a.x + a.width  > b.x            &&
           a.y            < b.y + b.height &&
           a.y + a.height > b.y;
}
