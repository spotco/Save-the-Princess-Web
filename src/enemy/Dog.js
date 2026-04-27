// Dog.js — dog enemy
// Mirrors Dog.java

import Enemy from './Enemy.js';

export default class Dog extends Enemy {

    // orientation: 0=down, 1=right, 2=left, 3=up
    constructor(orientation, x, y, scene) {
        super();
        this.orientation   = orientation;
        this.counter       = 0;
        this.notice        = false;
        this.noticereturn  = false;
        this.killerimg     = 'dogkiller';

        this._centerme(x, y);
        this.imageinit(scene);
        this._setImgStanding();
        this._setHitbox();
    }

    getType() { return 1; }

    // Mirrors Dog.imageinit() — register shared Phaser animations (once) and create sprite.
    imageinit(scene) {
        // Stand animations — single static frame, very slow loop (won't visibly cycle)
        const stands = [
            { key: 'dog_standdown',  frames: ['dog_down']  },
            { key: 'dog_standup',    frames: ['dog_up']    },
            { key: 'dog_standleft',  frames: ['dog_left']  },
            { key: 'dog_standright', frames: ['dog_right'] },
        ];
        stands.forEach(({ key, frames }) => {
            if (!scene.anims.exists(key)) {
                scene.anims.create({
                    key,
                    frames:    frames.map(k => ({ key: k })),
                    frameRate: 1,
                    repeat:    -1
                });
            }
        });

        // Walk animations — mirrors Java durations:
        //   walkdown/walkup: 4 frames at ~200ms each → 5fps
        //   walkup: 4 frames at 100ms each → 10fps
        //   walkleft/walkright: 2 frames at 150ms each → ~6.7fps
        const walks = [
            { key: 'dog_walkdown',  fps: 5,    frames: ['dog_down',  'dog_down1',  'dog_down',  'dog_down2'  ] },
            { key: 'dog_walkup',    fps: 10,   frames: ['dog_up',    'dog_up2',    'dog_up',    'dog_up3'    ] },
            { key: 'dog_walkleft',  fps: 6.67, frames: ['dog_left2', 'dog_left3'                              ] },
            { key: 'dog_walkright', fps: 6.67, frames: ['dog_right2','dog_right3'                              ] },
        ];
        walks.forEach(({ key, fps, frames }) => {
            if (!scene.anims.exists(key)) {
                scene.anims.create({
                    key,
                    frames:    frames.map(k => ({ key: k })),
                    frameRate: fps,
                    repeat:    -1
                });
            }
        });

        // Sprite — initially hidden; render() makes it visible
        this.sprite = scene.add.sprite(this.x, this.y, 'dog_down')
            .setOrigin(0, 0)
            .setDepth(10)
            .setVisible(false);

        // Emote (notice.png) — shown while chasing
        this.emoteSprite = scene.add.image(this.x, this.y - 10, 'notice')
            .setOrigin(0, 0)
            .setDepth(11)
            .setVisible(false);
        this.emoteSprite.stpThreeDepthAnchor = this.sprite;
    }

    // Mirrors Dog.update().
    update(game) {
        this.counter++;
        if (this.counter === 5) {
            this.counter = 0;
            if (!this.notice && !this.noticereturn &&
                this.los(this.orientation, game)) {
                game.sound.sfx('dogbark');
                this.notice = true;
                this._setImgRun();
            }
        }

        if (this.notice) {
            this._noticeRun();
        }

        if (this.notice && !this.viewboxstatichit(this.hitbox, game.staticsList)) {
            this.notice        = false;
            this.noticereturn  = true;
            this._noticeReturnRun(); this._noticeReturnRun(); this._noticeReturnRun();
            this._setImgReturnRun();
        }

        if (this.noticereturn) {
            this._noticeReturnRun();
            if (!this.viewboxstatichit(this.hitbox, game.staticsList)) {
                this.noticereturn = false;
                this._noticeRun();
                this._setImgStanding();
            }
        }
    }

    // Mirrors Dog.render().
    render() {
        if (this.sprite) {
            this.sprite.setVisible(true);
            this.sprite.setPosition(this.x, this.y);
        }
        if (this.emoteSprite) {
            this.emoteSprite.setVisible(this.notice);
            if (this.notice) {
                this.emoteSprite.setPosition(this.x, this.y - 10);
            }
        }
    }

    // --- Private helpers ---

    // Mirrors Dog.centerme() — offset sprite within 25×25 tile.
    _centerme(x, y) {
        if (this.orientation === 0 || this.orientation === 3) {
            this.x = x + 8;
            this.y = y + 4;
        } else {
            this.x = x + 5;
            this.y = y + 5;
        }
    }

    // Move 2px forward (toward player) in orientation direction.
    _noticeRun() {
        if      (this.orientation === 0) this.y += 2;
        else if (this.orientation === 1) this.x += 2;
        else if (this.orientation === 2) this.x -= 2;
        else if (this.orientation === 3) this.y -= 2;
        this._setHitbox();
    }

    // Move 1px backward (away from player) in orientation direction.
    _noticeReturnRun() {
        if      (this.orientation === 0) this.y -= 1;
        else if (this.orientation === 1) this.x -= 1;
        else if (this.orientation === 2) this.x += 1;
        else if (this.orientation === 3) this.y += 1;
        this._setHitbox();
    }

    // Update hitbox to match current sprite frame size.
    _setHitbox() {
        const w = this.sprite ? this.sprite.displayWidth  : 17;
        const h = this.sprite ? this.sprite.displayHeight : 17;
        this.hitbox = { x: this.x, y: this.y, width: w, height: h };
    }

    // Switch to walk animation matching orientation.
    _setImgRun() {
        const key = ['dog_walkdown', 'dog_walkright', 'dog_walkleft', 'dog_walkup'][this.orientation];
        this._playAnim(key);
    }

    // Switch to walk animation for the REVERSE of orientation (returning).
    _setImgReturnRun() {
        // reversed: orientation 3→walkdown, 2→walkright, 1→walkleft, 0→walkup
        const key = ['dog_walkup', 'dog_walkleft', 'dog_walkright', 'dog_walkdown'][this.orientation];
        this._playAnim(key);
    }

    // Switch to standing animation for current orientation.
    _setImgStanding() {
        const key = ['dog_standdown', 'dog_standright', 'dog_standleft', 'dog_standup'][this.orientation];
        this._playAnim(key);
    }

    _playAnim(key) {
        if (!this.sprite) return;
        if (!this.sprite.anims.currentAnim ||
            this.sprite.anims.currentAnim.key !== key) {
            this.sprite.play(key);
        }
    }
}
