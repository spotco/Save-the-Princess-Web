// Princess.js — the princess at the end of each level
// Mirrors Princess.java

export default class Princess {

    constructor(x, y, scene) {
        this.x = x + 6;
        this.y = y - 8;

        this._animTimer  = 0;
        // 2 frames at 800ms each; at ~60fps ≈ 48 game frames per animation frame
        this._FRAME_DUR  = 48;
        this._NUM_FRAMES = 2;

        this.sprite = scene.add.image(this.x, this.y, 'princess1').setOrigin(0, 0).setDepth(5);
        this.hitbox = {
            x:      this.x,
            y:      this.y,
            width:  this.sprite.width,
            height: this.sprite.height
        };
    }

    getType() { return 23; }

    update(game) {
        this._animTimer++;
    }

    // Called when player overlaps princess (via STPView object-hit check).
    // Mirrors Princess.hit() — starts win animation.
    hit(game) {
        if (game.animationManager) {
            game.animationManager.startAnimation('winAnimation', null);
        }
    }

    render() {
        const frame = Math.floor(this._animTimer / this._FRAME_DUR) % this._NUM_FRAMES;
        this.sprite.setVisible(true);
        this.sprite.setTexture('princess' + (frame + 1));
    }

    hide() {
        this.sprite.setVisible(false);
    }
}
