// Tracker.js — breadcrumb heatmap for KnightBoss pathfinding
// Mirrors Tracker.java

// A single 25×25 grid cell tracking when the player last stood there.
class TrackNode {
    constructor(x, y) {
        this.x         = x;
        this.y         = y;
        this.hitbox    = { x, y, width: 25, height: 25 };
        this.pathbox   = { x, y, width: 25, height: 25 };
        this.activated = false;
        this.steptime  = 0;  // performance.now() timestamp; higher = more recent
    }
}

export default class Tracker {

    constructor() {
        this.hitbox               = { x: 0, y: 0, width: 0, height: 0 };
        this.knightinitialpathset = false;

        // Build 25×25 grid of TrackNodes covering the full 625×625 screen.
        this.nodemap = [];
        for (let i = 0; i < 25; i++) {
            this.nodemap[i] = [];
            for (let j = 0; j < 25; j++) {
                this.nodemap[i][j] = new TrackNode(i * 25, j * 25);
            }
        }
    }

    getType() { return 67; }

    // Called every frame: update steptime for any node the player overlaps.
    // Mirrors Tracker.update().
    update(game) {
        const ph = game.player.hitbox;
        for (let i = 0; i < 25; i++) {
            for (let j = 0; j < 25; j++) {
                if (_rectsIntersect(ph, this.nodemap[i][j].hitbox)) {
                    this.nodemap[i][j].activated = true;
                    this.nodemap[i][j].steptime  = performance.now();
                }
            }
        }
    }

    render() {}  // invisible; no sprite
    hide()  {}

    // Lay an initial breadcrumb trail from the boss's starting grid cell
    // in `direction` ("down" only used in original) so the boss has a
    // path to follow before the player has walked anywhere near it.
    // Mirrors Tracker.initknightpath().
    initKnightPath(boss, direction) {
        let cx   = boss.basicx;
        let cy   = boss.basicy;
        boss.activated = true;
        let cval = 0;
        while (true) {
            if (this.nodemap[cx][cy].activated) break;
            this.nodemap[cx][cy].activated = true;
            this.nodemap[cx][cy].steptime  = cval;
            if (direction === 'down') {
                cy++;
                cval++;
            }
            if (cy > 24) break;
        }
    }
}

// AABB intersection test
function _rectsIntersect(a, b) {
    return a.x            < b.x + b.width  &&
           a.x + a.width  > b.x            &&
           a.y            < b.y + b.height &&
           a.y + a.height > b.y;
}
