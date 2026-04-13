// Door.js — a door that can be opened/closed by DoorButton
// Mirrors Door.java

export default class Door {

    constructor(isClosed, x, y, scene) {
        this.x        = x;
        this.y        = y;
        this.isClosed = isClosed;
        this.hitbox   = { x: 0, y: 0, width: 0, height: 0 };

        this._hasAddedRect = false;

        this.barsSprite = scene.add.image(x, y, 'bars').setOrigin(0, 0).setDepth(6);
        this.barsSprite.setVisible(isClosed);
    }

    getType() { return 51; }

    update(game) {
        if (!this._hasAddedRect && this.isClosed) {
            game.staticsList.push({ x: this.x, y: this.y, width: 25, height: 25 });
            this._hasAddedRect = true;
        }
    }

    openorclose(game) {
        if (this.isClosed) {
            // Going from closed to open — remove the static rect
            for (let i = 0; i < game.staticsList.length; i++) {
                const r = game.staticsList[i];
                if (r.x === this.x && r.y === this.y) {
                    game.staticsList.splice(i, 1);
                    this._hasAddedRect = false;
                    break;
                }
            }
        }
        this.isClosed = !this.isClosed;
        this.barsSprite.setVisible(this.isClosed);
    }

    render() {
        this.barsSprite.setVisible(this.isClosed);
    }

    hide() {
        this.barsSprite.setVisible(false);
    }
}
