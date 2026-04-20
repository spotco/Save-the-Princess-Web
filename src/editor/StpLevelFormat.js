// StpLevelFormat.js — .stplevel.json serialisation / deserialisation
//
// Pure functions only — no Phaser scene state, no side effects.
// Used by the Level Editor (Phase 3+) and by Level._loadStpLevelInto()
// in the runtime.
//
// .stplevel.json shape:
// {
//   "format":      "stplevel",
//   "version":     1,
//   "name":        "maximum security",
//   "mapsong":     "main1",
//   "screensX":    2,
//   "screensY":    2,
//   "spawnScreen": [0, 0],
//   "screens": [
//     {
//       "sx": 0, "sy": 0,
//       "width": 25, "height": 25,
//       "tilesets": [
//         { "name": "tileset1", "firstgid": 1 }
//       ],
//       "tiles": [ 0, 1, 5, … ]           // flat row-major uint GID array
//     }
//   ]
// }
//
// tilesets is stored per-screen because different screens in the same level
// can reference different tilesets at different firstgid offsets.
//
// tiles is a flat array indexed as tiles[y * width + x], matching the
// indexing used by Level._tileProp().

import TmxParser from './TmxParser.js';

const CANONICAL_TILE_PROPS = {
    tileset1: {
        0:  { wall: 'true' },
        1:  { wall: 'true' },
        2:  { wall: 'true' },
        3:  { dog: 'left' },
        5:  { wall: 'true' },
        6:  { wall: 'true' },
        7:  { dog: 'right' },
        8:  { wall: 'true' },
        9:  { torch: 'true', wall: 'true' },
        10: { dog: 'down' },
        11: { dog: 'up' },
        12: { wall: 'true' },
        13: { wall: 'true' },
        14: { wall: 'true' },
        16: { princess: 'true' },
        17: { wall: 'true' },
        18: { wall: 'true' },
        19: { wall: 'true' },
        20: { player: 'true' },
        21: { wall: 'true' },
        22: { cratespawn: 'true' },
        23: { wall: 'true' },
        24: { wall: 'true' }
    },
    guard1set: {
        0:  { guardspawn: 'right' },
        1:  { guardspawn: 'up' },
        2:  { guardpoint: 'right' },
        3:  { guardpoint: 'left' },
        4:  { door: 'closed' },
        5:  { guardspawn: 'down' },
        6:  { guardspawn: 'left' },
        7:  { guardpoint: 'down' },
        8:  { guardpoint: 'up' },
        9:  { door: 'open' },
        10: { doorbutton: 'true' },
        12: { wall: 'true', window: 'true' },
        13: { direction: 'right', exit: 'true', wall: 'true' },
        14: { direction: 'left', exit: 'true', wall: 'true' },
        15: { guardpoint: 'right', stop: 'true' },
        16: { guardpoint: 'left', stop: 'true' },
        17: { key: 'true', wall: 'true' },
        18: { direction: 'up', exit: 'true', wall: 'true' },
        20: { guardpoint: 'down', stop: 'true' },
        21: { guardpoint: 'up', stop: 'true' },
        22: { keydoor: 'true' },
        23: { direction: 'down', exit: 'true' }
    },
    wizard1set: {
        0:  { wizard: 'up' },
        4:  { knightboss: 'true' },
        5:  { wizard: 'right' },
        10: { wizard: 'down' },
        13: { final: 'true' },
        15: { wizard: 'left' },
        16: { knightbossdelayspawn: 'true' },
        18: { final: 'true' },
        20: { tracker: 'true' },
        21: { bossactivate: 'true' },
        22: { bossactivatespawn: 'true' },
        24: { final: 'true' }
    }
};

export default class StpLevelFormat {

    static canonicalTilePropsForTilesets(tilesets) {
        const tileProps = {};
        for (const tileset of tilesets || []) {
            const tilesetProps = CANONICAL_TILE_PROPS[tileset.name];
            if (!tilesetProps) continue;
            for (const [localId, props] of Object.entries(tilesetProps)) {
                const gid = tileset.firstgid + parseInt(localId, 10);
                tileProps[gid] = { ...props };
            }
        }
        return tileProps;
    }

    static _screenForJson(screen) {
        return {
            sx:       screen.sx,
            sy:       screen.sy,
            width:    screen.width,
            height:   screen.height,
            tilesets: (screen.tilesets || []).map(ts => ({ name: ts.name, firstgid: ts.firstgid })),
            tiles:    Array.from(screen.tiles || [])
        };
    }

    static normalizeLevel(level) {
        if (!level || !Array.isArray(level.screens)) return level;
        for (const screen of level.screens) {
            screen.tileProps = StpLevelFormat.canonicalTilePropsForTilesets(screen.tilesets);
        }
        return level;
    }

    // --- Conversion from runtime map data ---

    // Build a screen entry from a parsed map data object
    // (as returned by TmxParser.parseTMX / Level.storedmap[sx][sy]).
    static _screenFromMapData(sx, sy, mapData) {
        return {
            sx,
            sy,
            width:    mapData.width,
            height:   mapData.height,
            tilesets: mapData.tilesets.map(ts => ({ name: ts.name, firstgid: ts.firstgid })),
            tiles:    Array.from(mapData.tiles)
        };
    }

    // Build a stplevel object from a fully-populated Level.storedmap 2D array.
    static fromStoredMap(name, mapsong, screensX, screensY, storedmap) {
        const screens = [];
        for (let sx = 0; sx < screensX; sx++) {
            for (let sy = 0; sy < screensY; sy++) {
                screens.push(StpLevelFormat._screenFromMapData(sx, sy, storedmap[sx][sy]));
            }
        }
        return {
            format:      'stplevel',
            version:     1,
            name,
            mapsong,
            screensX,
            screensY,
            spawnScreen: [0, 0],
            screens
        };
    }

    // Async: build a stplevel object by parsing TMX files that are already
    // loaded in Phaser's XML cache.
    // cacheKeys[sx][sy] is the Phaser XML cache key string for that screen.
    static async fromTmxCacheKeys(scene, name, mapsong, screensX, screensY, cacheKeys) {
        const storedmap = [];
        for (let sx = 0; sx < screensX; sx++) storedmap[sx] = [];

        const tasks = [];
        for (let sx = 0; sx < screensX; sx++) {
            for (let sy = 0; sy < screensY; sy++) {
                const key = cacheKeys[sx][sy];
                tasks.push(
                    TmxParser.parseTMX(scene, key).then(mapData => {
                        storedmap[sx][sy] = mapData;
                    })
                );
            }
        }
        await Promise.all(tasks);
        return StpLevelFormat.fromStoredMap(name, mapsong, screensX, screensY, storedmap);
    }

    // --- Serialisation ---

    static toJsonString(level) {
        StpLevelFormat.normalizeLevel(level);
        return JSON.stringify({
            format:      level.format,
            version:     level.version,
            name:        level.name,
            mapsong:     level.mapsong,
            screensX:    level.screensX,
            screensY:    level.screensY,
            spawnScreen: level.spawnScreen,
            screens:     level.screens.map(screen => StpLevelFormat._screenForJson(screen))
        }, null, 2);
    }

    static fromJsonString(text) {
        const obj = JSON.parse(text);
        StpLevelFormat.validate(obj);
        return StpLevelFormat.normalizeLevel(obj);
    }

    // Throws a descriptive Error if the object is not a valid stplevel.
    static validate(level) {
        if (!level || typeof level !== 'object')
            throw new Error('stplevel: not an object');
        if (level.format !== 'stplevel')
            throw new Error('stplevel: "format" field must be "stplevel"');
        if (typeof level.version !== 'number')
            throw new Error('stplevel: missing numeric "version"');
        if (typeof level.screensX !== 'number' || typeof level.screensY !== 'number')
            throw new Error('stplevel: missing "screensX" / "screensY"');
        if (!Array.isArray(level.screens))
            throw new Error('stplevel: "screens" must be an array');
        for (const s of level.screens) {
            if (typeof s.sx !== 'number' || typeof s.sy !== 'number')
                throw new Error(`stplevel: screen missing sx/sy`);
            if (!Array.isArray(s.tiles))
                throw new Error(`stplevel: screen (${s.sx},${s.sy}) missing tiles array`);
            if (!Array.isArray(s.tilesets))
                throw new Error(`stplevel: screen (${s.sx},${s.sy}) missing tilesets array`);
        }
    }

    // --- Conversion to runtime map data ---

    // Convert a parsed stplevel object back to a Level.storedmap 2D array.
    // Each cell has { tileProps, tiles, width, height, tilesets } as expected
    // by Level._tileProp() and STPView._loadScreenTilemap().
    static toStoredMap(level) {
        const storedmap = [];
        for (let sx = 0; sx < level.screensX; sx++) storedmap[sx] = [];

        for (const screen of level.screens) {
            const tilesets = screen.tilesets.map(ts => ({
                name:     ts.name,
                imageKey: TmxParser.getTilemapImageKey(ts.name),
                firstgid: ts.firstgid
            }));
            storedmap[screen.sx][screen.sy] = {
                tileProps: StpLevelFormat.canonicalTilePropsForTilesets(screen.tilesets),
                tiles:     screen.tiles,
                width:     screen.width,
                height:    screen.height,
                tilesets
            };
        }
        return storedmap;
    }
}
