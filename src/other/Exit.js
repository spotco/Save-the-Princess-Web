// Exit.js — screen edge transition trigger with blinking arrow pointer
// Mirrors Exit.java

export default class Exit {

    constructor(x, y, direction, scene) {
        this.x         = x;
        this.y         = y;
        this.direction = direction;

        // Hitbox mirrors Java placement exactly
        if (direction === 'up') {
            this.hitbox = { x: x, y: y, width: 25, height: 8 };
            this._pointer = scene.add.image(x + 8, y, 'exitpointerU').setOrigin(0, 0).setDepth(10);
        } else if (direction === 'down') {
            this.hitbox = { x: x, y: y + 17, width: 25, height: 8 };
            this._pointer = scene.add.image(x + 8, y + 15, 'exitpointerD').setOrigin(0, 0).setDepth(10);
        } else if (direction === 'left') {
            this.hitbox = { x: x, y: y, width: 8, height: 25 };
            this._pointer = scene.add.image(x, y + 7, 'exitpointerL').setOrigin(0, 0).setDepth(10);
        } else if (direction === 'right') {
            this.hitbox = { x: x + 17, y: y, width: 8, height: 25 };
            this._pointer = scene.add.image(x + 14, y + 7, 'exitpointerR').setOrigin(0, 0).setDepth(10);
        }

        this._arrowDisplay = 0;
    }

    update(game) {
        if (_rectsIntersect(game.player.hitbox, this.hitbox)) {
            let nextLocationX = game.level.locationx;
            let nextLocationY = game.level.locationy;
            let nextPlayerX   = game.player.x;
            let nextPlayerY   = game.player.y;

            if (this.direction === 'up') {
                nextPlayerY = 591;
                nextLocationY++;
            } else if (this.direction === 'down') {
                nextPlayerY = 9;
                nextLocationY--;
            } else if (this.direction === 'left') {
                nextPlayerX = 591;
                nextLocationX--;
            } else if (this.direction === 'right') {
                nextPlayerX = 9;
                nextLocationX++;
            }

            if (game.changeloc(nextLocationX, nextLocationY)) {
                game.player.x = nextPlayerX;
                game.player.y = nextPlayerY;
                game.player.inithitbox();
            }
        }
    }

    render() {
        this._arrowDisplay++;
        this._pointer.setVisible(this._arrowDisplay < 25);
        if (this._arrowDisplay > 50) {
            this._arrowDisplay = 0;
        }
    }

    hide() {
        this._pointer.setVisible(false);
    }
}

function _rectsIntersect(a, b) {
    return a.x            < b.x + b.width  &&
           a.x + a.width  > b.x            &&
           a.y            < b.y + b.height &&
           a.y + a.height > b.y;
}
