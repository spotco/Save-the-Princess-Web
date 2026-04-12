// KnightBossSpawn.js - one-shot delayed boss spawn trigger
// Mirrors KnightBossSpawn.java

import KnightBoss from '../enemy/KnightBoss.js';
import KnightBossInitialActivate from './KnightBossInitialActivate.js';

export default class KnightBossSpawn extends KnightBossInitialActivate {

    constructor(x, y) {
        super(x, y);
    }

    update(game) {
        if (!_rectsIntersect(game.player.hitbox, this.hitbox)) {
            return;
        }

        game.sound.sfx('standandfight');

        const mapX = game.level.locationx;
        const mapY = game.level.locationy;
        const map = game.level.storedmap[mapX][mapY];
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                if (game.level._tileProp(mapX, mapY, x, y, 'knightbossdelayspawn') === 'true') {
                    game.enemyList.push(new KnightBoss(x * 25, y * 25, x, y, true, game.scene));
                }
            }
        }

        for (const o of game.objectList) {
            if (o.getType && o.getType() === 67) {
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
}

function _rectsIntersect(a, b) {
    return a.x            < b.x + b.width  &&
           a.x + a.width  > b.x            &&
           a.y            < b.y + b.height &&
           a.y + a.height > b.y;
}
