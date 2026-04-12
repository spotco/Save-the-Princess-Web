// Level6.js — "1v1 me bicth anytiem"
// Mirrors Level6.java
// Note: mapsong is 'main1' on level load; boss music starts when KnightBoss activates.

import Level from './Level.js';

export default class Level6 extends Level {

    name() { return '1v1 me bicth anytiem'; }

    async init() {
        this.mapsong   = 'main1';
        this.storedmap = [[], []];
        await Promise.all([
            this._parseTMXInto('level6_0_0', 0, 0),
            this._parseTMXInto('level6_1_0', 1, 0),
            this._parseTMXInto('level6_0_1', 0, 1),
            this._parseTMXInto('level6_1_1', 1, 1),
        ]);
        this.locationx = 0;
        this.locationy = 0;
    }

    createMasterList() {
        super.createMasterList(2, 2);
    }
}
