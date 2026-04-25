// SavePoint.js - checkpoint object
// Non-source addition.

export default class SavePoint {

    constructor(x, y, scene) {
        this.x = x;
        this.y = y;
        this.activated = false;
        this.hitbox = { x: x + 3, y: y + 3, width: 19, height: 19 };

        this._glowCounter = 0;
        this._sprite = scene.add.graphics().setDepth(5);
    }

    update(game) {
        if (!this.activated && _rectsIntersect(game.player.hitbox, this.hitbox)) {
            this.activated = true;
            if (game.saveCurrentStateAtSavePoint) {
                game.saveCurrentStateAtSavePoint(this);
            }
        }
    }

    hit(game) {
        this.update(game);
    }

    render() {
        this._glowCounter++;
        this._sprite.clear();

        if (this.activated) {
            this._drawDiamond(0x114477, 0x3377aa, 0.65);
        } else {
            const glow = 0.35 + Math.sin(this._glowCounter / 10) * 0.15;
            this._sprite.fillStyle(0x33ccff, glow);
            this._sprite.fillCircle(this.x + 12, this.y + 12, 12);
            this._drawDiamond(0x00aaff, 0xaaddff, 1);
        }
        this._sprite.setVisible(true);
    }

    hide() {
        this._sprite.setVisible(false);
    }

    _drawDiamond(fillColor, lineColor, alpha) {
        const cx = this.x + 12;
        const cy = this.y + 12;
        this._sprite.fillStyle(fillColor, alpha);
        this._sprite.lineStyle(1, lineColor, alpha);
        this._sprite.beginPath();
        this._sprite.moveTo(cx, this.y + 2);
        this._sprite.lineTo(this.x + 22, cy);
        this._sprite.lineTo(cx, this.y + 22);
        this._sprite.lineTo(this.x + 2, cy);
        this._sprite.closePath();
        this._sprite.fillPath();
        this._sprite.strokePath();
    }
}

function _rectsIntersect(a, b) {
    return a.x            < b.x + b.width  &&
           a.x + a.width  > b.x            &&
           a.y            < b.y + b.height &&
           a.y + a.height > b.y;
}
