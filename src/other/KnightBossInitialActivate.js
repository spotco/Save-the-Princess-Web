// KnightBossInitialActivate.js - one-shot trigger for the boss intro
// Mirrors KnightBossInitialActivate.java

export default class KnightBossInitialActivate {

    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.hitbox = { x: x, y: y, width: 25, height: 25 };
    }

    update(game) {
        if (!_rectsIntersect(game.player.hitbox, this.hitbox)) {
            return;
        }

        if (game.animationManager) {
            game.animationManager.startAnimation('knightBossInitAnimation', null);
        }

        for (const o of game.objectList) {
            if (o.getType && o.getType() === 67 && !o.knightinitialpathset) {
                for (const e of game.enemyList) {
                    if (e.getType && e.getType() === 67) {
                        o.initKnightPath(e, 'down');
                    }
                }
                o.knightinitialpathset = true;
            }
        }

        for (let i = 0; i < game.objectList.length; i++) {
            if (game.objectList[i] === this) {
                game.objectList.splice(i, 1);
                break;
            }
        }
    }

    render() {}

    hide() {}
}

function _rectsIntersect(a, b) {
    return a.x            < b.x + b.width  &&
           a.x + a.width  > b.x            &&
           a.y            < b.y + b.height &&
           a.y + a.height > b.y;
}
