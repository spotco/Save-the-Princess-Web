// Level5.js — "are u a wizard"
// Mirrors Level5.java

import Level from './Level.js';

export default class Level5 extends Level {

    name() { return 'are u a wizard'; }

    async init() {
        await this._loadStpLevelInto('data/stplevels/level5.stplevel.json');
        this.locationx = 0;
        this.locationy = 0;
    }

    createMasterList() {
        super.createMasterList(1, 3);
    }
}
