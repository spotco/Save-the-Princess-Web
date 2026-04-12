// Level4.js — "maximum security"
// Mirrors Level4.java

import Level from './Level.js';

export default class Level4 extends Level {

    name() { return 'maximum security'; }

    async init() {
        this.mapsong   = 'main1';
        this.storedmap = [[], []];
        await Promise.all([
            this._parseTMXInto('level4_0_0', 0, 0),
            this._parseTMXInto('level4_1_0', 1, 0),
            this._parseTMXInto('level4_0_1', 0, 1),
            this._parseTMXInto('level4_1_1', 1, 1),
        ]);
        this.locationx = 0;
        this.locationy = 0;
    }

    createMasterList() {
        super.createMasterList(2, 2);
    }
}
