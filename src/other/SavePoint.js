// SavePoint.js - checkpoint object
// Non-source addition.

export default class SavePoint {

    constructor(x, y, scene) {
        this.x = x;
        this.y = y;
        this.activated = false;
        this.hitbox = { x: x + 7, y: y + 7, width: 11, height: 11 };

        this._animTimer  = 0;
        this._FRAME_DUR  = 10;
        this._NUM_FRAMES = 4;
        this.sprite = scene.add.image(x, y, 'savepoint').setOrigin(0, 0).setDepth(5);
    }

    update(game) {
        if (!this.activated && _rectsIntersect(game.player.hitbox, this.hitbox)) {
            this.activated = true;
            game.sound.sfx('getkey');
            if (game.saveCurrentStateAtSavePoint) {
                game.saveCurrentStateAtSavePoint(this);
            }
        }
    }

    hit(game) {
        this.update(game);
    }

    render() {
        this._animTimer++;
        this.sprite.setVisible(true);
        this.sprite.setPosition(this.x, this.y);
        if (this.activated) {
            this.sprite.setTexture('savepointdim');
        } else {
            const frame = Math.floor(this._animTimer / this._FRAME_DUR) % this._NUM_FRAMES;
            this.sprite.setTexture('savepoint' + frame);
        }
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
