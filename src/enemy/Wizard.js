// Wizard.js — Wizard enemy
// Mirrors Wizard.java

import Enemy    from './Enemy.js';
import Fireball from './Fireball.js';

export default class Wizard extends Enemy {

    // Mirrors Wizard(int x, int y, int orientation)
    // orientation: 0=down, 1=right, 2=left, 3=up
    constructor(x, y, orientation, scene) {
        super();
        this.x             = x;
        this.y             = y;
        this.orientation   = orientation;
        this.isfiring      = false;
        this.fireballtimer = 35;   // start near threshold — first shot fires quickly
        this.killerimg     = 'wizardkiller';
        this._scene        = scene;  // kept to spawn Fireball sprites in update()

        this.hitbox = { x: x + 8, y: y + 6, width: 12, height: 15 };

        this.imageinit(scene);
        this.imgupdate();
    }

    getType() { return 5; }

    // Mirrors Wizard.imageinit() — register shared Phaser animations (once), create sprite.
    imageinit(scene) {
        // Shoot animations: 2 frames at 400ms each → 2.5fps (mirrors Java int[] sto = {400,400})
        const shootAnims = [
            { key: 'wizard_shoot_down',  frames: ['wizard_down1',  'wizard_down2'  ] },
            { key: 'wizard_shoot_up',    frames: ['wizard_up1',    'wizard_up2'    ] },
            { key: 'wizard_shoot_left',  frames: ['wizard_left1',  'wizard_left2'  ] },
            { key: 'wizard_shoot_right', frames: ['wizard_right1', 'wizard_right2' ] },
        ];
        shootAnims.forEach(({ key, frames }) => {
            if (!scene.anims.exists(key)) {
                scene.anims.create({
                    key,
                    frames:    frames.map(k => ({ key: k })),
                    frameRate: 2.5,
                    repeat:    -1
                });
            }
        });

        // Stand animations: 1 frame static (mirrors Java int[] ssto = {10000})
        const standAnims = [
            { key: 'wizard_stand_down',  frame: 'wizard_down1'  },
            { key: 'wizard_stand_up',    frame: 'wizard_up1'    },
            { key: 'wizard_stand_left',  frame: 'wizard_left1'  },
            { key: 'wizard_stand_right', frame: 'wizard_right1' },
        ];
        standAnims.forEach(({ key, frame }) => {
            if (!scene.anims.exists(key)) {
                scene.anims.create({
                    key,
                    frames:    [{ key: frame }],
                    frameRate: 1,
                    repeat:    -1
                });
            }
        });

        // Fireball animations: 3 frames at 200ms each → 5fps (mirrors Java int[] fsto = {200,200,200})
        // Registered here so Fireball sprites can use them without re-registering.
        const fbAnims = [
            { key: 'fb_down',  frames: ['fb_d1', 'fb_d2', 'fb_d3'] },
            { key: 'fb_up',    frames: ['fb_u1', 'fb_u2', 'fb_u3'] },
            { key: 'fb_left',  frames: ['fb_l1', 'fb_l2', 'fb_l3'] },
            { key: 'fb_right', frames: ['fb_r1', 'fb_r2', 'fb_r3'] },
        ];
        fbAnims.forEach(({ key, frames }) => {
            if (!scene.anims.exists(key)) {
                scene.anims.create({
                    key,
                    frames:    frames.map(k => ({ key: k })),
                    frameRate: 5,
                    repeat:    -1
                });
            }
        });

        // Sprite — initially hidden; render() makes it visible
        this.sprite = scene.add.sprite(this.x, this.y, 'wizard_down1')
            .setOrigin(0, 0)
            .setDepth(10)
            .setVisible(false);

        // Emote (notice.png) — shown while isfiring
        this.emoteSprite = scene.add.image(this.x + 8, this.y - 10, 'notice')
            .setOrigin(0, 0)
            .setDepth(11)
            .setVisible(false);
        this.emoteSprite.stpThreeDepthAnchor = this.sprite;
    }

    // Mirrors Wizard.update()
    update(game) {
        if (this.los(this.orientation, game)) {
            this.isfiring = true;
            this.fireballtimer++;
            if (this.fireballtimer > 35) {
                game.sound.sfx('fireball');
                game.enemyList.push(
                    new Fireball(this.x + 7, this.y + 7, this.orientation, this._scene)
                );
                this.fireballtimer = 0;
            }
        } else {
            this.isfiring = false;
        }
        this.imgupdate();
    }

    // Mirrors Wizard.render()
    render() {
        if (this.sprite) {
            this.sprite.setVisible(true);
            this.sprite.setPosition(this.x, this.y);
        }
        if (this.emoteSprite) {
            this.emoteSprite.setVisible(this.isfiring);
            if (this.isfiring) {
                this.emoteSprite.setPosition(this.x + 8, this.y - 10);
            }
        }
    }

    // Mirrors Wizard.imgupdate() — switch animation based on isfiring and orientation.
    imgupdate() {
        if (!this.sprite) return;
        const dir    = ['down', 'right', 'left', 'up'][this.orientation];
        const prefix = this.isfiring ? 'wizard_shoot_' : 'wizard_stand_';
        const key    = prefix + dir;
        if (!this.sprite.anims.currentAnim ||
            this.sprite.anims.currentAnim.key !== key) {
            this.sprite.play(key);
        }
    }
}
