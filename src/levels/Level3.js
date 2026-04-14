// Level3.js — "your friendly introduction to crates"
// Mirrors Level3.java

import Level from './Level.js';

export default class Level3 extends Level {

    name() { return 'your friendly introduction to crates'; }

    async init() {
        await this._loadStpLevelInto('data/stplevels/level3.stplevel.json');
        this.locationx = 0;
        this.locationy = 0;
    }

    createMasterList() {
        super.createMasterList(1, 1);
    }
}
