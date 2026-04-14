// Level6.js — "1v1 me bicth anytiem"
// Mirrors Level6.java
// Note: mapsong is 'main1' on level load; boss music starts when KnightBoss activates.

import Level from './Level.js';

export default class Level6 extends Level {

    name() { return '1v1 me bicth anytiem'; }

    async init() {
        await this._loadStpLevelInto('data/stplevels/level6.stplevel.json');
        this.locationx = 0;
        this.locationy = 0;
    }

    createMasterList() {
        super.createMasterList(2, 2);
    }
}
