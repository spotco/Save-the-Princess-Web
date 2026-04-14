// Level1.js — "why are there so many dogs"
// Mirrors Level1.java

import Level from './Level.js';

export default class Level1 extends Level {

    name() { return 'why are there so many dogs'; }

    async init() {
        await this._loadStpLevelInto('data/stplevels/level1.stplevel.json');
        this.locationx = 0;
        this.locationy = 0;
    }

    createMasterList() {
        super.createMasterList(1, 1);
    }
}
