// Level4.js — "maximum security"
// Mirrors Level4.java

import Level from './Level.js';

export default class Level4 extends Level {

    name() { return 'maximum security'; }

    async init() {
        await this._loadStpLevelInto('data/stplevels/level4.stplevel.json');
        this.locationx = 0;
        this.locationy = 0;
    }

    createMasterList() {
        super.createMasterList(2, 2);
    }
}
