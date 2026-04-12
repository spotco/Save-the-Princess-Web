// Crate.js — pushable block that acts as a movable wall
// Mirrors Crate.java

export default class Crate {

    constructor(x, y, scene) {
        this.x = x + 3;
        this.y = y + 3;

        this._createPushBoxes();

        this.sprite = scene.add.image(this.x, this.y, 'crate').setOrigin(0, 0).setDepth(5);
    }

    _createPushBoxes() {
        this.hitbox    = { x: this.x,      y: this.y,      width: 20, height: 20 };
        this._pushleft  = { x: this.x - 1,  y: this.y + 9,  width: 2,  height: 3  };
        this._pushright = { x: this.x + 19, y: this.y + 9,  width: 2,  height: 3  };
        this._pushup    = { x: this.x + 9,  y: this.y - 1,  width: 3,  height: 2  };
        this._pushdown  = { x: this.x + 9,  y: this.y + 19, width: 3,  height: 2  };
    }

    update(game) {
        this._removeCurrentStatic(game);
        game.staticsList.push(this.hitbox);

        const ph = game.player.hitbox;

        if (_rectsIntersect(this._pushleft, ph) && this._canDir(2, game)) {
            this._removeCurrentStatic(game);
            this.x += 1;
            this._createPushBoxes();
        } else if (_rectsIntersect(this._pushright, ph) && this._canDir(3, game)) {
            this._removeCurrentStatic(game);
            this.x -= 1;
            this._createPushBoxes();
        } else if (_rectsIntersect(this._pushdown, ph) && this._canDir(1, game)) {
            this._removeCurrentStatic(game);
            this.y -= 1;
            this._createPushBoxes();
        } else if (_rectsIntersect(this._pushup, ph) && this._canDir(0, game)) {
            this._removeCurrentStatic(game);
            this.y += 1;
            this._createPushBoxes();
        }
    }

    // dir 0=check below (pushup case), 1=check above (pushdown), 2=check right (pushleft), 3=check left (pushright)
    _canDir(dir, game) {
        let test;
        if      (dir === 0) test = { x: this.x,      y: this.y + 21, width: 20, height: 1 };
        else if (dir === 1) test = { x: this.x,      y: this.y - 2,  width: 20, height: 1 };
        else if (dir === 2) test = { x: this.x + 21, y: this.y,      width: 1,  height: 20 };
        else                test = { x: this.x - 2,  y: this.y,      width: 1,  height: 20 };

        for (const r of game.staticsList) {
            if (_rectsIntersect(test, r)) return false;
        }
        for (const e of game.enemyList) {
            if (e.hitbox && _rectsIntersect(test, e.hitbox)) return false;
        }
        return true;
    }

    _removeCurrentStatic(game) {
        for (let i = 0; i < game.staticsList.length; i++) {
            const r = game.staticsList[i];
            if (r.x === this.x && r.y === this.y) {
                game.staticsList.splice(i, 1);
                break;
            }
        }
    }

    render() {
        this.sprite.setPosition(this.x, this.y);
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
