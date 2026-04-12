// Torch.js — animated flame decoration
// Mirrors Torch.java

export default class Torch {

    constructor(x, y, scene) {
        this.x      = x;
        this.y      = y;
        this.hitbox = { x: -1, y: -1, width: 0, height: 0 };

        this._animTimer  = 0;
        // 6 frames at 200ms each; at ~60fps ≈ 12 game frames per animation frame
        this._FRAME_DUR  = 12;
        this._NUM_FRAMES = 6;

        this.sprite = scene.add.image(x, y, 'torch1').setOrigin(0, 0).setDepth(5);
    }

    update(game) {
        this._animTimer++;
    }

    render() {
        const frame = Math.floor(this._animTimer / this._FRAME_DUR) % this._NUM_FRAMES;
        this.sprite.setTexture('torch' + (frame + 1));
    }

    hide() {
        this.sprite.setVisible(false);
    }
}
