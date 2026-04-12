// GuardPath.js — invisible waypoint tile that tells guards to change direction.
// Mirrors GuardPath.java (Other subclass, type 99).

export default class GuardPath {

    // orientation: 0=down, 1=right, 2=left, 3=up
    // isStop: if true the guard stands still when it reaches this tile
    constructor(orientation, x, y, isStop) {
        this.orientation = orientation;
        this.isStop      = isStop;
        this.hitbox      = { x, y, width: 25, height: 25 };
    }

    getType() { return 99; }

    getOrientation() { return this.orientation; }

    // No visible sprite — GuardPath is an invisible waypoint.
    update(game) {}
    render() {}
    hide()   {}
}
