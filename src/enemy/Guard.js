// Guard.js — guard enemy
// Mirrors Guard.java

import Enemy from './Enemy.js';

export default class Guard extends Enemy {

    // orientation: 0=down, 1=right, 2=left, 3=up
    constructor(orientation, x, y, scene) {
        super();
        this.orientation     = orientation;
        this.counter         = 0;
        this.chase           = false;
        this.questioncounter = 0;
        this.stuckcounter    = 0;
        this.killerimg       = 'guardleft1';

        // Emote display sprites (set in imageinit)
        this.noticeSprite   = null; // notice.png  — shown while chasing
        this.questionSprite = null; // question.png — shown while searching
        this.helpSprite     = null; // help.png     — shown while stuck

        this._centerme(x, y);
        this.imageinit(scene);
        this._setImgRun();
        this._setHitbox();
    }

    getType() { return 2; }

    // Mirrors Guard.imageinit() — register shared animations once, create sprite + emotes.
    imageinit(scene) {
        // Stand animations — single frame
        const stands = [
            { key: 'guard_standdown',  tex: 'guard_standdown'  },
            { key: 'guard_standup',    tex: 'guard_standup'    },
            { key: 'guard_standleft',  tex: 'guard_standleft'  },
            { key: 'guard_standright', tex: 'guard_standright' },
        ];
        stands.forEach(({ key, tex }) => {
            if (!scene.anims.exists(key)) {
                scene.anims.create({ key, frames: [{ key: tex }], frameRate: 1, repeat: -1 });
            }
        });

        // Walk animations — mirrors Java 200ms per frame → 5fps
        const walks = [
            { key: 'guard_walkdown',  frames: ['guard_walkdown1', 'guard_standdown',  'guard_walkdown2', 'guard_standdown'  ] },
            { key: 'guard_walkup',    frames: ['guard_walkup1',   'guard_standup',    'guard_walkup2',   'guard_standup'    ] },
            { key: 'guard_walkleft',  frames: ['guard_walkleft',  'guard_standleft'                                         ] },
            { key: 'guard_walkright', frames: ['guard_walkright', 'guard_standright'                                        ] },
        ];
        walks.forEach(({ key, frames }) => {
            if (!scene.anims.exists(key)) {
                scene.anims.create({
                    key,
                    frames:    frames.map(k => ({ key: k })),
                    frameRate: 5,
                    repeat:    -1
                });
            }
        });

        // Search animation — cycles through 4 stand directions at 500ms each → 2fps
        // Mirrors Java: standdown, standright, standup, standleft
        if (!scene.anims.exists('guard_search')) {
            scene.anims.create({
                key:       'guard_search',
                frames:    ['guard_standdown', 'guard_standright', 'guard_standup', 'guard_standleft'].map(k => ({ key: k })),
                frameRate: 2,
                repeat:    -1
            });
        }

        // Main sprite — initially hidden
        this.sprite = scene.add.sprite(this.x, this.y, 'guard_standdown')
            .setOrigin(0, 0)
            .setDepth(10)
            .setVisible(false);

        // Emote images — initially hidden
        this.noticeSprite = scene.add.image(this.x + 5, this.y - 10, 'notice')
            .setOrigin(0, 0).setDepth(11).setVisible(false);
        this.questionSprite = scene.add.image(this.x + 5, this.y - 10, 'question')
            .setOrigin(0, 0).setDepth(11).setVisible(false);
        this.helpSprite = scene.add.image(this.x + 5, this.y - 10, 'help')
            .setOrigin(0, 0).setDepth(11).setVisible(false);
        this.noticeSprite.stpThreeDepthAnchor   = this.sprite;
        this.questionSprite.stpThreeDepthAnchor = this.sprite;
        this.helpSprite.stpThreeDepthAnchor     = this.sprite;
    }

    // Mirrors Guard.update().
    update(game) {
        this.counter++;
        if (this.counter > 10) {
            this.counter = 0;
            if (this.los(this.orientation, game) && !this.chase) {
                game.sound.sfx('hey');
                this._setImgRun();
                this.chase = true;
            }
        }

        if (this.stuckcounter > 3 && !this.viewboxstatichit(this.hitbox, game.staticsList)) {
            // Stuck against a wall — freeze until cleared
        } else if (this.chase) {
            if (this.counter % 3 === 0) {
                this._normalupdate(1);
                this.stuckcounter = 0;
            } else {
                this._normalupdate(2);
                this.stuckcounter = 0;
            }
            if (!this.viewboxstatichit(this.hitbox, game.staticsList)) {
                this.questioncounter = 100;
                this._normalupdate(-4);
                this.chase = false;
                this.stuckcounter++;
            }
        } else if (this.questioncounter > 0) {
            // Search all 4 directions for LOS — re-enter chase if found
            for (let i = 0; i < 4; i++) {
                if (this.los(i, game)) {
                    this.orientation = i;
                    this._setImgRun();
                    break;
                }
            }
            // On the last 2 frames of question state, reverse orientation and walk off
            if (this.questioncounter < 2) {
                this._orientationreverse();
                this._setImgRun();
            }
        } else if (!this.viewboxstatichit(this.hitbox, game.staticsList)) {
            // Patrol hit a wall — step back and rotate orientation
            this._normalupdate(-1);
            this._orientationChange();
            this._setImgRun();
            this.stuckcounter++;
        } else {
            // Normal patrol
            if (this._insidepathchangesq(game.objectList)) {
                this._setImgStand();
            } else {
                this._setImgRun();
                this._normalupdate(1);
            }
            this.stuckcounter = 0;
        }

        this._setHitbox();
    }

    // Mirrors Guard.render() — positions sprite, manages emotes, decrements questioncounter.
    render() {
        if (!this.sprite) return;

        this.sprite.setVisible(true);
        this.sprite.setPosition(this.x, this.y);

        // Decide which emote (if any) to show
        const ex = this.x + 5;
        const ey = this.y - 10;

        if (this.stuckcounter > 3) {
            // Help emote (stuck/lost)
            this._showEmote(this.helpSprite, ex, ey);
            this._playAnim(this._walkKeyForOrientation());
        } else if (this.chase) {
            // Notice emote (spotted player)
            this._showEmote(this.noticeSprite, ex, ey);
        } else if (this.questioncounter > 0) {
            // Question emote (searching) + search animation
            this.questioncounter--;
            this._showEmote(this.questionSprite, ex, ey);
            this._playAnim('guard_search');
        } else {
            this._hideAllEmotes();
        }
    }

    // Hide all display objects (called on screen transition).
    hide() {
        if (this.sprite)        this.sprite.setVisible(false);
        if (this.noticeSprite)  this.noticeSprite.setVisible(false);
        if (this.questionSprite) this.questionSprite.setVisible(false);
        if (this.helpSprite)    this.helpSprite.setVisible(false);
    }

    // --- Private helpers ---

    // Mirrors Guard.centerme().
    _centerme(x, y) {
        this.x = x + 5;
        this.y = y;
    }

    // Mirrors Guard.setHitbox(): Rectangle(x+2, y+5, 18-2, 25-8).
    _setHitbox() {
        this.hitbox = { x: this.x + 2, y: this.y + 5, width: 16, height: 17 };
    }

    // Move `dist` pixels in orientation direction.
    _normalupdate(dist) {
        if      (this.orientation === 0) this.y += dist;
        else if (this.orientation === 1) this.x += dist;
        else if (this.orientation === 2) this.x -= dist;
        else if (this.orientation === 3) this.y -= dist;
    }

    // Reverse orientation (opposite direction).
    _orientationreverse() {
        const rev = [3, 2, 1, 0];
        this.orientation = rev[this.orientation];
    }

    // Rotate orientation 90° (used when hitting a wall while patrolling).
    // Mirrors Java: 0→2, 1→0, 2→3, 3→1
    _orientationChange() {
        const next = [2, 0, 3, 1];
        this.orientation = next[this.orientation];
    }

    // Mirrors Guard.insidepathchangesq():
    // Returns true if the guard's hitbox is fully contained within a GuardPath tile.
    // Reads the new orientation from the GuardPath and applies it.
    _insidepathchangesq(objectList) {
        for (const e of objectList) {
            if (e.getType && e.getType() === 99) {
                const gp = e;
                const hb = this.hitbox;
                // Both corners of guard hitbox must lie inside the GuardPath tile
                if (_pointInRect(hb.x,              hb.y,               gp.hitbox) &&
                    _pointInRect(hb.x + hb.width,   hb.y + hb.height,   gp.hitbox)) {
                    this.orientation = gp.getOrientation();
                    this._setImgRun();
                    if (gp.isStop) return true;
                }
            }
        }
        return false;
    }

    _walkKeyForOrientation() {
        return ['guard_walkdown', 'guard_walkright', 'guard_walkleft', 'guard_walkup'][this.orientation];
    }

    _setImgRun() {
        this._playAnim(this._walkKeyForOrientation());
    }

    _setImgStand() {
        const key = ['guard_standdown', 'guard_standright', 'guard_standleft', 'guard_standup'][this.orientation];
        this._playAnim(key);
    }

    _playAnim(key) {
        if (!this.sprite) return;
        if (!this.sprite.anims.currentAnim ||
            this.sprite.anims.currentAnim.key !== key) {
            this.sprite.play(key);
        }
    }

    _showEmote(emoteSprite, x, y) {
        this._hideAllEmotes();
        if (emoteSprite) {
            emoteSprite.setVisible(true);
            emoteSprite.setPosition(x, y);
        }
    }

    _hideAllEmotes() {
        if (this.noticeSprite)   this.noticeSprite.setVisible(false);
        if (this.questionSprite) this.questionSprite.setVisible(false);
        if (this.helpSprite)     this.helpSprite.setVisible(false);
    }
}

// Point-in-rectangle test (inclusive of edges).
function _pointInRect(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.width &&
           py >= rect.y && py <= rect.y + rect.height;
}
