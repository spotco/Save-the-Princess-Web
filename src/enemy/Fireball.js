// Fireball.js — Fireball projectile
// Mirrors Fireball.java

import Enemy from './Enemy.js';

export default class Fireball extends Enemy {

    // Mirrors Fireball(int x, int y, int direction, Wizard wizard)
    // orientation: 0=down, 1=right, 2=left, 3=up
    constructor(x, y, orientation, scene) {
        super();
        this.x                = x;
        this.y                = y;
        this.orientation      = orientation;
        this.killerimg        = 'fireballkiller';
        this._extraspdcounter = 0;

        this._hitboxupdate();
        this.imageinit(scene);
    }

    getType() { return 27; }

    // Mirrors Fireball.imageinit(Wizard wizard) — use fireball animations registered by Wizard.
    imageinit(scene) {
        const dir    = ['down', 'right', 'left', 'up'][this.orientation];
        const animKey = 'fb_' + dir;
        // Use fb_d1 as placeholder texture; play() switches to the correct directional anim.
        this.sprite = scene.add.sprite(this.x, this.y, 'fb_d1')
            .setOrigin(0, 0)
            .setDepth(10)
            .setVisible(true);
        this.sprite.play(animKey);
    }

    // Mirrors Fireball.update()
    update(game) {
        this._extraspdcounter++;

        // Move 1px/frame in orientation; extra 1px every 3rd frame (mirrors Java extraspdcounter > 2)
        if (this.orientation === 3) {           // up
            this.y--;
            if (this._extraspdcounter > 2) { this.y--; this._extraspdcounter = 0; }
        } else if (this.orientation === 0) {    // down
            this.y++;
            if (this._extraspdcounter > 2) { this.y++; this._extraspdcounter = 0; }
        } else if (this.orientation === 2) {    // left
            this.x--;
            if (this._extraspdcounter > 2) { this.x--; this._extraspdcounter = 0; }
        } else if (this.orientation === 1) {    // right
            this.x++;
            if (this._extraspdcounter > 2) { this.x++; this._extraspdcounter = 0; }
        }

        this._hitboxupdate();

        // Hit a wall — destroy sprite and remove self from enemyList
        if (!this.viewboxstatichit(this.hitbox, game.staticsList)) {
            if (this.sprite) { this.sprite.destroy(); this.sprite = null; }
            const idx = game.enemyList.indexOf(this);
            if (idx !== -1) game.enemyList.splice(idx, 1);
        }
    }

    // Mirrors Fireball.render()
    render() {
        if (this.sprite) {
            this.sprite.setPosition(this.x, this.y);
        }
    }

    // Mirrors Fireball.hitboxupdate()
    _hitboxupdate() {
        this.hitbox = { x: this.x + 2, y: this.y + 2, width: 9, height: 9 };
    }
}
