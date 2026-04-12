// KnightBoss.js — boss enemy
// Mirrors KnightBoss.java

import Enemy from './Enemy.js';

export default class KnightBoss extends Enemy {

    // x, y: pixel spawn (tile-grid × 25), basicx/y: grid cell index
    // initactivate: whether boss starts active (false = waits for KnightBossInitAnimation)
    constructor(x, y, basicx, basicy, initactivate, scene) {
        super();
        this.basicx      = basicx;
        this.basicy      = basicy;
        this.x           = x - 2;
        this.y           = y - 28;

        this.orientation = -1;   // 0=down 1=right 2=left 3=up  (-1=stand still)
        this.activated   = initactivate;
        this.hastarget   = false;
        this.oldtarget   = -1;
        this.stobx       = basicx;
        this.stoby       = basicy;
        this.emotecounter = 0;

        this.tracker         = null;
        this.hasGetTracker   = false;

        // walkbox is used for both collision and grid-cell lookup
        this.walkbox = { x: this.x + 5, y: this.y + 30, width: 20, height: 21 };
        this._makeHitboxes();

        this.killerimg = 'knightkiller';

        this.imageinit(scene);
    }

    getType() { return 67; }

    // Register animations once; create sprite + emote images.
    // Mirrors KnightBoss.imageinit().
    imageinit(scene) {
        // Walk animations — 4 frames at 200ms = 5fps; down/up use 3 unique frames
        const anims = [
            { key: 'knight_walkdown',
              frames: ['knight_down1', 'knight_down2', 'knight_down1', 'knight_down3'] },
            { key: 'knight_walkup',
              frames: ['knight_up1',   'knight_up2',   'knight_up1',   'knight_up3'  ] },
            { key: 'knight_walkleft',
              frames: ['knight_left1', 'knight_left2'                                ] },
            { key: 'knight_walkright',
              frames: ['knight_right1','knight_right2'                               ] },
        ];
        anims.forEach(({ key, frames }) => {
            if (!scene.anims.exists(key)) {
                scene.anims.create({
                    key,
                    frames:    frames.map(f => ({ key: f })),
                    frameRate: 5,
                    repeat:    -1,
                });
            }
        });

        // Stand animations — single frame
        const stands = [
            { key: 'knight_standdown',  tex: 'knight_down1'  },
            { key: 'knight_standup',    tex: 'knight_up1'    },
            { key: 'knight_standleft',  tex: 'knight_left1'  },
            { key: 'knight_standright', tex: 'knight_right1' },
        ];
        stands.forEach(({ key, tex }) => {
            if (!scene.anims.exists(key)) {
                scene.anims.create({ key, frames: [{ key: tex }], frameRate: 1, repeat: -1 });
            }
        });

        // Sprite starts facing down
        this.sprite = scene.add.sprite(this.x, this.y, 'knight_down1')
            .setOrigin(0, 0).setDepth(5);
        this.sprite.play('knight_standdown');

        // Emote images
        this.emoteSprite  = scene.add.image(this.x - 1, this.y - 18, 'fight')
            .setOrigin(0, 0).setDepth(6).setVisible(false);
        this.emote2Sprite = scene.add.image(this.x - 1, this.y - 18, 'coward')
            .setOrigin(0, 0).setDepth(6).setVisible(false);
    }

    // Mirrors KnightBoss.update().
    update(game) {
        // Lazily get the Tracker from objectList (only available after Level is loaded)
        if (!this.hasGetTracker) {
            this._getTracker(game);
            this.hasGetTracker = true;
        }

        this._getBasicLoc();

        let direction = -1;
        if (!this.hastarget && this.activated) {
            this.hastarget = true;
            this.oldtarget = this._getCurrentTarget();
            this.stobx     = this.basicx;
            this.stoby     = this.basicy;
        }
        if (this.basicx !== this.stobx || this.basicy !== this.stoby) {
            this.hastarget = false;
        }

        direction = this.oldtarget;

        if (direction === 0) {           // down
            this.y++;
            if (!this.viewboxstatichit(this.walkbox, game.staticsList)) this.y--;
        } else if (direction === 1) {    // right
            this.x++;
            if (!this.viewboxstatichit(this.walkbox, game.staticsList)) this.x--;
        } else if (direction === 2) {    // left
            this.x--;
            if (!this.viewboxstatichit(this.walkbox, game.staticsList)) this.x++;
        } else if (direction === 3) {    // up
            this.y--;
            if (!this.viewboxstatichit(this.walkbox, game.staticsList)) this.y++;
        }

        this.orientation = direction;
        this._makeHitboxes();
    }

    // Mirrors KnightBoss.render().
    render() {
        if (!this.sprite) return;

        this.emotecounter++;

        // Emote cycling — mirrors Java render()
        const showFight   = this.emotecounter > 400  && this.emotecounter < 500  && this.orientation !== -1;
        const showCoward  = this.emotecounter > 1000 && this.emotecounter < 1100 && this.orientation !== -1;
        if (this.emotecounter > 1700) this.emotecounter = 0;

        this.emoteSprite.setVisible(showFight);
        this.emote2Sprite.setVisible(showCoward);

        if (showFight) {
            this.emoteSprite.setPosition(this.x - 1, this.y - 18);
        }
        if (showCoward) {
            this.emote2Sprite.setPosition(this.x - 1, this.y - 18);
        }

        // Sprite animation based on orientation
        const animKey = this._animKey();
        if (this.sprite.anims.currentAnim?.key !== animKey) {
            this.sprite.play(animKey);
        }
        this.sprite.setVisible(true);
        this.sprite.setPosition(this.x, this.y);
    }

    hide() {
        if (this.sprite)       this.sprite.setVisible(false);
        if (this.emoteSprite)  this.emoteSprite.setVisible(false);
        if (this.emote2Sprite) this.emote2Sprite.setVisible(false);
    }

    // --- Private helpers ---

    // Keep hitbox and walkbox in sync with x/y position.
    // Mirrors KnightBoss.makehitboxes().
    _makeHitboxes() {
        this.hitbox  = { x: this.x + 5,  y: this.y + 28, width: 20, height: 21 };
        this.walkbox = { x: this.x + 5,  y: this.y + 30, width: 20, height: 21 };
    }

    // Determine which 25×25 grid cell contains the walkbox centre.
    // Mirrors KnightBoss.getbasicloc().
    _getBasicLoc() {
        if (!this.tracker) return;
        for (let y = 0; y < 25; y++) {
            for (let x = 0; x < 25; x++) {
                const pb = this.tracker.nodemap[x][y].pathbox;
                const wx = this.walkbox.x;
                const wy = this.walkbox.y;
                const wr = wx + this.walkbox.width;
                const wb = wy + this.walkbox.height;
                if (wx >= pb.x && wr <= pb.x + pb.width &&
                    wy >= pb.y && wb <= pb.y + pb.height) {
                    this.basicx = x;
                    this.basicy = y;
                }
            }
        }
    }

    // Return the direction (0–3) of the adjacent activated node with the
    // highest (most recent) steptime. Returns -1 if none found.
    // Mirrors KnightBoss.getcurrenttar().
    _getCurrentTarget() {
        if (!this.tracker) return -1;
        const nm  = this.tracker.nodemap;
        let dir   = -1;
        let maxT  = -1;

        // down
        if (this.basicy < 24 && nm[this.basicx][this.basicy + 1].activated &&
                nm[this.basicx][this.basicy + 1].steptime > maxT) {
            dir  = 0;
            maxT = nm[this.basicx][this.basicy + 1].steptime;
        }
        // right
        if (this.basicx < 24 && nm[this.basicx + 1][this.basicy].activated &&
                nm[this.basicx + 1][this.basicy].steptime > maxT) {
            dir  = 1;
            maxT = nm[this.basicx + 1][this.basicy].steptime;
        }
        // left
        if (this.basicx > 0 && nm[this.basicx - 1][this.basicy].activated &&
                nm[this.basicx - 1][this.basicy].steptime > maxT) {
            dir  = 2;
            maxT = nm[this.basicx - 1][this.basicy].steptime;
        }
        // up
        if (this.basicy > 0 && nm[this.basicx][this.basicy - 1].activated &&
                nm[this.basicx][this.basicy - 1].steptime > maxT) {
            dir  = 3;
            maxT = nm[this.basicx][this.basicy - 1].steptime;
        }
        return dir;
    }

    // Find the Tracker object (type 67) in the objectList.
    // Mirrors KnightBoss.getTracker().
    _getTracker(game) {
        for (const o of game.objectList) {
            if (o.getType && o.getType() === 67) {
                this.tracker = o;
                break;
            }
        }
    }

    // Return the correct animation key for the current orientation.
    _animKey() {
        if (this.orientation === 0)  return 'knight_walkdown';
        if (this.orientation === 1)  return 'knight_walkright';
        if (this.orientation === 2)  return 'knight_walkleft';
        if (this.orientation === 3)  return 'knight_walkup';
        return 'knight_standdown';
    }
}
