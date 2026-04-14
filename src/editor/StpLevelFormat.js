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
//       "tiles": [ 0, 1, 5, … ],          // flat row-major uint GID array
//       "tileProps": {                     // gid (string key) → prop map
//         "3": { "dog": "left" },
//         "21": { "wall": "true" }
//       }
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

export default class StpLevelFormat {

    // --- Conversion from runtime map data ---

    // Build a screen entry from a parsed map data object
    // (as returned by TmxParser.parseTMX / Level.storedmap[sx][sy]).
    static _screenFromMapData(sx, sy, mapData) {
        // Strip empty-name properties that Tiled sometimes emits.
        const tileProps = {};
        for (const [gid, props] of Object.entries(mapData.tileProps)) {
            const filtered = {};
            for (const [key, val] of Object.entries(props)) {
                if (key !== '') filtered[key] = val;
            }
            if (Object.keys(filtered).length > 0) tileProps[gid] = filtered;
        }

        return {
            sx,
            sy,
            width:    mapData.width,
            height:   mapData.height,
            tilesets: mapData.tilesets.map(ts => ({ name: ts.name, firstgid: ts.firstgid })),
            tiles:    Array.from(mapData.tiles),
            tileProps
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
        return JSON.stringify(level, null, 2);
    }

    static fromJsonString(text) {
        const obj = JSON.parse(text);
        StpLevelFormat.validate(obj);
        return obj;
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
                tileProps: screen.tileProps,
                tiles:     screen.tiles,
                width:     screen.width,
                height:    screen.height,
                tilesets
            };
        }
        return storedmap;
    }
}
