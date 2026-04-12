// FinalCutscene.js - trigger for the end-of-game tower ledge animation
// Mirrors FinalCutscene.java

export default class FinalCutscene {

    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.hitbox = { x: x, y: y, width: 25, height: 25 };
    }

    update(game) {
        if (_rectsIntersect(game.player.hitbox, this.hitbox) && game.animationManager) {
            game.animationManager.startAnimation('finalTowerLedge', null);
        }
    }

    render() {}

    hide() {}
}

function _rectsIntersect(a, b) {
    return a.x            < b.x + b.width  &&
           a.x + a.width  > b.x            &&
           a.y            < b.y + b.height &&
           a.y + a.height > b.y;
}
