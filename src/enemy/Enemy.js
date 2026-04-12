// Enemy.js — base enemy class
// Mirrors Enemy.java

export default class Enemy {

    constructor() {
        this.x      = 0;
        this.y      = 0;
        this.hitbox = { x: 0, y: 0, width: 0, height: 0 };
        this.sprite      = null;
        this.emoteSprite = null;
        // Key string passed to DeathAnimation — set by each subclass
        this.killerimg = null;
    }

    // Override in subclass
    getType() { return 0; }
    // type 1  = Dog
    // type 27 = Fireball
    // type 67 = KnightBoss

    // Mirrors Enemy.update() — no-op base, override in subclass.
    update(game) {}

    // Mirrors Enemy.render().
    render() {
        if (this.sprite) {
            this.sprite.setVisible(true);
            this.sprite.setPosition(this.x, this.y);
        }
    }

    // Hide all display objects for this enemy (called on screen transition).
    hide() {
        if (this.sprite)      this.sprite.setVisible(false);
        if (this.emoteSprite) this.emoteSprite.setVisible(false);
    }

    // Line-of-sight check.
    // Mirrors Enemy.los(): expand a copy of hitbox in `direction` until a static is hit;
    // if the player is found before a static blocks, return true.
    // direction: 0=down, 1=right, 2=left, 3=up
    los(direction, game) {
        const vb = {
            x:      this.hitbox.x,
            y:      this.hitbox.y,
            width:  this.hitbox.width,
            height: this.hitbox.height
        };

        // Safety cap — 625 px canvas, smallest hitbox ~9px → max ~70 steps
        let limit = 100;
        while (this.viewboxstatichit(vb, game.staticsList) && limit-- > 0) {
            if (direction === 0) {                                           // down
                vb.height += this.hitbox.height;
            } else if (direction === 1) {                                    // right
                vb.width += this.hitbox.width;
            } else if (direction === 2) {                                    // left
                vb.width += this.hitbox.width;
                vb.x     -= this.hitbox.width;
            } else if (direction === 3) {                                    // up
                vb.height += this.hitbox.height;
                vb.y      -= this.hitbox.height;
            }

            if (_rectsIntersect(vb, game.player.hitbox) &&
                this.viewboxstatichit(vb, game.staticsList)) {
                return true;
            }
        }
        return false;
    }

    // Returns false if any static intersects viewbox, true if none do.
    // Mirrors Enemy.viewboxstatichit() — note the inverted naming ("false if a hit").
    viewboxstatichit(viewbox, staticslist) {
        for (const rect of staticslist) {
            if (_rectsIntersect(viewbox, rect)) return false;
        }
        return true;
    }
}

// AABB intersection test — shared utility.
function _rectsIntersect(a, b) {
    return a.x              < b.x + b.width  &&
           a.x + a.width   > b.x             &&
           a.y              < b.y + b.height  &&
           a.y + a.height  > b.y;
}
