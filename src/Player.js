// Player.js — player character
// Mirrors Player.java

export default class Player {

    // Hitbox offsets — mirrors Java constants XCOMP=0, YCOMP=10
    static XCOMP = 0;
    static YCOMP = 10;

    // lastdirection values — mirrors Java comments
    static DIR_DOWN  = 1;
    static DIR_RIGHT = 2;
    static DIR_LEFT  = 3;
    static DIR_UP    = 4;

    constructor(spawnX, spawnY) {
        // Mirrors Player(int x, int y): this.x = x+6, this.y = y-2
        this.x = spawnX + 6;
        this.y = spawnY - 2;

        this.lastdirection = Player.DIR_DOWN;
        this.haskey        = false;

        // Hitbox: 15×15, offset (XCOMP, YCOMP) from sprite top-left
        this.hitbox = {
            x:      this.x + Player.XCOMP,
            y:      this.y + Player.YCOMP,
            width:  15,
            height: 15
        };

        // Phaser display objects — set in imageinit()
        this.sprite      = null;
        this.haskeySprite = null;
        this.keys        = null;

        // Current animation key
        this.currentAnim = 'standdown';
    }

    // Create Phaser animations and sprite.  Call once from GameScene.create().
    // Mirrors Player.imageinit().
    imageinit(scene) {
        // Stand animations — single static frame
        const stands = [
            { key: 'standdown',  tex: 'guy_standdown'  },
            { key: 'standup',    tex: 'guy_standup'    },
            { key: 'standleft',  tex: 'guy_standleft'  },
            { key: 'standright', tex: 'guy_standright' },
        ];
        stands.forEach(({ key, tex }) => {
            if (!scene.anims.exists(key)) {
                scene.anims.create({ key, frames: [{ key: tex }], frameRate: 1, repeat: -1 });
            }
        });

        // Walk animations — 4 frames: walk, stand, walk2, stand (250ms each → 4fps)
        // Mirrors Java walk animations built from {walk, stand, walk2, stand} at 250ms each
        const walks = [
            { key: 'walkdown',  frames: ['guy_walkdown',  'guy_standdown',  'guy_walkdown2',  'guy_standdown'  ] },
            { key: 'walkup',    frames: ['guy_walkup',    'guy_standup',    'guy_walkup2',    'guy_standup'    ] },
            { key: 'walkleft',  frames: ['guy_walkleft',  'guy_standleft',  'guy_walkleft2',  'guy_standleft'  ] },
            { key: 'walkright', frames: ['guy_walkright', 'guy_standright', 'guy_walkright2', 'guy_standright' ] },
        ];
        walks.forEach(({ key, frames }) => {
            if (!scene.anims.exists(key)) {
                scene.anims.create({
                    key,
                    frames: frames.map(k => ({ key: k })),
                    frameRate: 4,
                    repeat: -1
                });
            }
        });

        // Player sprite
        this.sprite = scene.add.sprite(this.x, this.y, 'guy_standdown').setOrigin(0, 0).setDepth(10);
        this.sprite.play('standdown');

        // Key indicator (shown above player when holding a key)
        this.haskeySprite = scene.add.image(
            this.x + 2, this.y - 21, 'havekey'
        ).setOrigin(0, 0).setDepth(11).setVisible(false);

        // Input — arrow keys + WASD
        this.keys = scene.input.keyboard.addKeys({
            up:    Phaser.Input.Keyboard.KeyCodes.UP,
            down:  Phaser.Input.Keyboard.KeyCodes.DOWN,
            left:  Phaser.Input.Keyboard.KeyCodes.LEFT,
            right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            w:     Phaser.Input.Keyboard.KeyCodes.W,
            s:     Phaser.Input.Keyboard.KeyCodes.S,
            a:     Phaser.Input.Keyboard.KeyCodes.A,
            d:     Phaser.Input.Keyboard.KeyCodes.D,
        });
    }

    // Mirrors Player.update(): move, collide, animate.
    // game is the STPView/GameScene instance; it exposes game.seeme and game.staticsList.
    update(game) {
        const k = this.keys;

        // If already inside a static (door closed on player) → crushed
        if (this._staticCollision(game.staticsList)) {
            if (game.animationManager) {
                game.animationManager.startAnimation('crushedAnimation', 'gatekiller');
            }
        }

        let iswalk = false;

        if (k.right.isDown || k.d.isDown) {
            this.x++;
            this.hitbox.x = this.x + Player.XCOMP;
            this.currentAnim = 'walkright';
            iswalk = true;
            this.lastdirection = Player.DIR_RIGHT;
            if (this._staticCollision(game.staticsList)) {
                this.x--;
                this.hitbox.x = this.x + Player.XCOMP;
            }
        }
        if (k.left.isDown || k.a.isDown) {
            this.x--;
            this.hitbox.x = this.x + Player.XCOMP;
            this.currentAnim = 'walkleft';
            iswalk = true;
            this.lastdirection = Player.DIR_LEFT;
            if (this._staticCollision(game.staticsList)) {
                this.x++;
                this.hitbox.x = this.x + Player.XCOMP;
            }
        }
        if (k.up.isDown || k.w.isDown) {
            this.y--;
            this.hitbox.y = this.y + Player.YCOMP;
            this.currentAnim = 'walkup';
            iswalk = true;
            this.lastdirection = Player.DIR_UP;
            if (this._staticCollision(game.staticsList)) {
                this.y++;
                this.hitbox.y = this.y + Player.YCOMP;
            }
        }
        if (k.down.isDown || k.s.isDown) {
            this.y++;
            this.hitbox.y = this.y + Player.YCOMP;
            this.currentAnim = 'walkdown';
            iswalk = true;
            this.lastdirection = Player.DIR_DOWN;
            if (this._staticCollision(game.staticsList)) {
                this.y--;
                this.hitbox.y = this.y + Player.YCOMP;
            }
        }

        if (iswalk) {
            game.seeme = false;
        }

        // Standing: revert to directional stand animation
        if (!iswalk) {
            switch (this.lastdirection) {
                case Player.DIR_DOWN:  this.currentAnim = 'standdown';  break;
                case Player.DIR_RIGHT: this.currentAnim = 'standright'; break;
                case Player.DIR_LEFT:  this.currentAnim = 'standleft';  break;
                case Player.DIR_UP:    this.currentAnim = 'standup';    break;
            }
        }

        // Drive the Phaser sprite animation
        if (this.sprite.anims.currentAnim === null ||
            this.sprite.anims.currentAnim.key !== this.currentAnim) {
            this.sprite.play(this.currentAnim);
        }
    }

    // Mirrors Player.render(): position the sprite and key indicator.
    render() {
        this.sprite.setPosition(this.x, this.y);
        this.haskeySprite.setVisible(this.haskey);
        if (this.haskey) {
            this.haskeySprite.setPosition(this.x + 2, this.y - 21);
        }
    }

    // Mirrors Player.staticcollision(): AABB intersection test.
    _staticCollision(staticslist) {
        const hb = this.hitbox;
        for (const rect of staticslist) {
            if (hb.x < rect.x + rect.width  &&
                hb.x + hb.width  > rect.x   &&
                hb.y < rect.y + rect.height  &&
                hb.y + hb.height > rect.y) {
                return true;
            }
        }
        return false;
    }
}
