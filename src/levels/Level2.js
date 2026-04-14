// Level2.js — "buttons and doors"
// Mirrors Level2.java

import Level from './Level.js';

export default class Level2 extends Level {

    name() { return 'buttons and doors'; }

    async init() {
        await this._loadStpLevelInto('data/stplevels/level2.stplevel.json');
        this.locationx = 0;
        this.locationy = 0;
    }

    createMasterList() {
        super.createMasterList(1, 1);
    }
}
