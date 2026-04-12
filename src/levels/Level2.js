// Level2.js — "buttons and doors"
// Mirrors Level2.java

import Level from './Level.js';

export default class Level2 extends Level {

    name() { return 'buttons and doors'; }

    async init() {
        this.mapsong   = 'main1';
        this.storedmap = [[]];
        await this._parseTMXInto('level2', 0, 0);
        this.locationx = 0;
        this.locationy = 0;
    }

    createMasterList() {
        super.createMasterList(1, 1);
    }
}
