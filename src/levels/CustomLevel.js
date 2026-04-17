// CustomLevel.js — runtime level built from a parsed .stplevel.json object.
// Non-source addition; lives alongside the Java-faithful Level1–6 classes.
// Instantiated by GameScene when scene data contains { customLevel: <parsed obj> }.

import Level           from './Level.js';
import StpLevelFormat  from '../editor/StpLevelFormat.js';

export default class CustomLevel extends Level {

    constructor(scene, levelData) {
        super(scene);
        this._levelData = levelData;
    }

    name() { return this._levelData.name || 'custom'; }

    // Populate storedmap directly from the in-memory level object.
    // No fetch needed — the editor already holds the parsed data.
    async init() {
        this.mapsong   = this._levelData.mapsong || 'main1';
        this.storedmap = StpLevelFormat.toStoredMap(this._levelData);
        const spawn    = this._levelData.spawnScreen || [0, 0];
        this.locationx = spawn[0];
        this.locationy = spawn[1];
    }

    createMasterList() {
        super.createMasterList(this._levelData.screensX, this._levelData.screensY);
    }
}
