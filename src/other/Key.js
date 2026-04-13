// Key.js — collectable key pickup
// Mirrors Key.java

export default class Key {

    constructor(x, y, scene) {
        this.x = x + 8;
        this.y = y + 3;

        this.hitbox = { x: this.x, y: this.y, width: 9, height: 18 };

        this._animTimer  = 0;
        // 6 frames at 200ms each; at ~60fps ≈ 12 game frames per animation frame
        this._FRAME_DUR  = 12;
        this._NUM_FRAMES = 6;

        this.sprite = scene.add.image(this.x, this.y, 'key0').setOrigin(0, 0).setDepth(5);
    }

    update(game) {
        this._animTimer++;

        if (_rectsIntersect(game.player.hitbox, this.hitbox) && !game.player.haskey) {
            game.player.haskey = true;
            game.sound.sfx('getkey');
            // Remove self from objectList
            for (let i = 0; i < game.objectList.length; i++) {
                if (game.objectList[i] === this) {
                    game.objectList.splice(i, 1);
                    break;
                }
            }
            this.sprite.destroy();
        }
    }

    render() {
        const frame = Math.floor(this._animTimer / this._FRAME_DUR) % this._NUM_FRAMES;
        this.sprite.setVisible(true);
        this.sprite.setTexture('key' + frame);
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
