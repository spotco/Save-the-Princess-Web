// Window.js — animated window decoration
// Mirrors Window.java

export default class Window {

    constructor(x, y, scene) {
        this.x      = x;
        this.y      = y;
        this.hitbox = { x: -1, y: -1, width: 0, height: 0 };

        this._animTimer  = 0;
        // 5 frames at 400ms each; at ~60fps ≈ 24 game frames per animation frame
        this._FRAME_DUR  = 24;
        this._NUM_FRAMES = 5;

        this.sprite = scene.add.image(x, y, 'window1').setOrigin(0, 0).setDepth(5);
    }

    update(game) {
        this._animTimer++;
    }

    render() {
        const frame = Math.floor(this._animTimer / this._FRAME_DUR) % this._NUM_FRAMES;
        this.sprite.setVisible(true);
        this.sprite.setTexture('window' + (frame + 1));
    }

    hide() {
        this.sprite.setVisible(false);
    }
}
