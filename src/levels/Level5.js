// Level5.js — "are u a wizard"
// Mirrors Level5.java

import Level from './Level.js';

export default class Level5 extends Level {

    name() { return 'are u a wizard'; }

    async init() {
        this.mapsong   = 'main1';
        this.storedmap = [[]];
        await Promise.all([
            this._parseTMXInto('level5_0_0', 0, 0),
            this._parseTMXInto('level5_0_1', 0, 1),
            this._parseTMXInto('level5_0_2', 0, 2),
        ]);
        this.locationx = 0;
        this.locationy = 0;
    }

    createMasterList() {
        super.createMasterList(1, 3);
    }
}
